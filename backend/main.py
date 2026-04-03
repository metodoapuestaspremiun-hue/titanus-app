import requests
import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
import pytz
from dotenv import load_dotenv
import pymysql
import pymysql.cursors
from flask import Flask, request, jsonify

# --- CONFIGURATION & ENV ---
load_dotenv(".env", override=True)
load_dotenv(".env.local", override=True)

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')

DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST") or os.getenv("DB_HOST", "mysql.us.stackcp.com"),
    "port": int(os.getenv("MYSQL_PORT") or os.getenv("DB_PORT", 43421)),
    "user": os.getenv("MYSQL_USER") or os.getenv("DB_USER"),
    "password": os.getenv("MYSQL_PASSWORD") or os.getenv("DB_PASSWORD"),
    "database": os.getenv("MYSQL_DATABASE") or os.getenv("DB_NAME"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "connect_timeout": 10
}

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY")
EVOLUTION_INSTANCE_NAME = os.getenv("EVOLUTION_INSTANCE_NAME") or os.getenv("NEXT_PUBLIC_EVOLUTION_INSTANCE", "gym_bot")

# --- DATABASE HELPERS ---
def mysql_query(query, params=None, commit=False):
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            cursor.execute(query, params or ())
            if commit:
                conn.commit()
                return cursor.lastrowid if cursor.lastrowid > 0 else cursor.rowcount
            else:
                return cursor.fetchall()
    except Exception as e:
        logging.error(f"MySQL Error: {e}")
        return None
    finally:
        if conn: conn.close()

def get_config_map():
    rows = mysql_query("SELECT clave, valor FROM configuracion") or []
    return {row['clave']: row['valor'] for row in rows}

def update_heartbeat():
    mysql_query(
        "INSERT INTO configuracion (clave, valor) VALUES (%s, NOW()) ON DUPLICATE KEY UPDATE valor = NOW()",
        ("bot_heartbeat",), commit=True
    )

# --- BOT LOGIC (From birthday_bot.py) ---
def check_scheduled_broadcasts():
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_date = now.strftime("%Y-%m-%d")
    now_total = now.hour * 60 + now.minute
    
    conf = get_config_map()
    json_str = conf.get('difusiones_programadas_json', '[]')
    try: scheduled = json.loads(json_str)
    except: scheduled = []
    
    changes = False
    for item in scheduled:
        if item.get('estado') != 'pendiente' and item.get('estado') != 'en_progreso': continue
        if item.get('fecha', '') > today_date: continue
        
        try:
            h, m = map(int, item.get('hora', '00:00').split(':'))
            item_total = h * 60 + m
            if now_total >= item_total and (now_total - item_total) < 10:
                if item.get('estado') == 'pendiente':
                    item['estado'] = 'en_progreso'
                    item['offset'] = 0
                    changes = True
                
                # Logic to trigger generate_queue for publicidad
                # (Simplified for main.py integration)
                generate_queue('publicidad', target_data=item.get('target', {}))
                item['estado'] = 'completado'
                changes = True
        except: continue
        
    if changes:
        mysql_query("INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
                   ("difusiones_programadas_json", json.dumps(scheduled)), commit=True)

def generate_message_content(cl, conf, custom_msg=None):
    tipo = cl['tipo']
    key_base = "prompt_cumpleanios" if tipo == 'cumpleaños' else f"prompt_{tipo}"
    key_static = f"{key_base}_static"
    mensaje_fijo = custom_msg if custom_msg else conf.get(key_static, f"¡Hola {{{{Nombre}}}}!")
    
    # Default to static for now as AI requires API keys
    mensaje = mensaje_fijo.replace("{{Nombre}}", cl['nombre']).replace("{{nombre}}", cl['nombre'])
    if 'extra' in cl:
        mensaje = mensaje.replace("{{FechaVencimiento}}", cl['extra']).replace("{{fecha}}", cl['extra'])
    return mensaje

def generate_queue(tipo_filtro=None, target_data=None):
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_md = now.strftime("-%m-%d")
    tom = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    
    conf = get_config_map()
    clients_to_notify = []

    if tipo_filtro == 'cumpleaños':
        res = mysql_query("SELECT nombre, telefono, fecha_nacimiento FROM clientes WHERE estado != 'inactivo'") or []
        for c in res:
            if c.get('fecha_nacimiento') and today_md in str(c['fecha_nacimiento']):
                clients_to_notify.append({**c, 'tipo': 'cumpleaños'})
        
        v_res = mysql_query("SELECT nombre, telefono, fecha_vencimiento FROM clientes WHERE estado = 'activo' AND fecha_vencimiento = %s", (tom,)) or []
        for c in v_res:
            clients_to_notify.append({**c, 'tipo': 'vencimiento', 'extra': str(c['fecha_vencimiento'])})

    enqueued = 0
    img_cumple = conf.get("imagen_cumple") or conf.get("birthday_image")

    for cl in clients_to_notify:
        msg = generate_message_content(cl, conf)
        if cl['tipo'] == 'cumpleaños' and img_cumple and len(img_cumple) > 5:
            msg = f"[MEDIA:{img_cumple}] {msg}"
            
        mysql_query(
            "INSERT INTO cola_mensajes (nombre, telefono, tipo, mensaje, estado) VALUES (%s, %s, %s, %s, %s)",
            (cl['nombre'], cl['telefono'], cl['tipo'], msg, "pendiente"), commit=True
        )
        enqueued += 1
    return enqueued

def process_batch():
    batch_size = 10
    pend = mysql_query(f"SELECT * FROM cola_mensajes WHERE estado = 'pendiente' AND tipo != 'log' ORDER BY id ASC LIMIT {batch_size}") or []
    count = 0
    for m in pend:
        ok, _ = send_wa(m['telefono'], m['mensaje'])
        mysql_query("UPDATE cola_mensajes SET estado = %s WHERE id = %s", ("enviado" if ok else "error", m['id']), commit=True)
        count += 1
        if count < len(pend): time.sleep(3)
    return count

def send_wa(num, text):
    clean = "".join(filter(str.isdigit, num)) if "@" not in num else num
    url_type = "sendMedia" if "[MEDIA:" in text else "sendText"
    url = f"{EVOLUTION_API_URL}/message/{url_type}/{EVOLUTION_INSTANCE_NAME}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    
    payload = {"number": clean, "delay": 1200}
    if url_type == "sendMedia":
        parts = text.split("]", 1)
        payload["media"] = parts[0].replace("[MEDIA:", "").strip()
        payload["caption"] = parts[1].strip() if len(parts) > 1 else ""
        payload["mediatype"] = "image"
    else:
        payload["text"] = text

    try:
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        return r.status_code in [200, 201], r.text
    except Exception as e:
        logging.error(f"Evolution API Error: {e}")
        return False, str(e)

# --- FLASK ROUTES ---
@app.route('/heartbeat', methods=['GET'])
def heartbeat():
    logging.info("Heartbeat received. Processing queue...")
    update_heartbeat()
    
    ec_tz = pytz.timezone('America/Guayaquil')
    now_ec = datetime.now(ec_tz)
    now_str = now_ec.strftime("%H:%M")
    
    conf = get_config_map()
    target_time = conf.get("envio_hora", "08:00").strip()
    
    report = {"time": now_str, "actions": []}
    
    # 1. Check Scheduled Broadcasts
    logging.info("Checking scheduled broadcasts...")
    check_scheduled_broadcasts()
    
    # 2. Check Birthdays at target time
    if now_str == target_time:
        count = generate_queue('cumpleaños')
        report["actions"].append(f"Generated {count} birthday/vencimiento messages")
    
    # 2. Process Batch
    sent = process_batch()
    report["actions"].append(f"Processed {sent} messages from queue")
    
    return jsonify(report), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    logging.info(f"Webhook received: {json.dumps(data, indent=2)}")
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
