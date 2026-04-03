import requests
import os
import sys
import json
import time
import logging
import traceback
from datetime import datetime, timedelta
import pytz
import threading
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

BATCH_SIZE = 10
DELAY_BETWEEN_MESSAGES = 3

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

def log_system(level, message):
    logging.info(f"[{level.upper()}] {message}")
    try:
        mysql_query(
            "INSERT INTO cola_mensajes (nombre, telefono, tipo, mensaje, estado) VALUES (%s, %s, %s, %s, %s)",
            ("System Bot", "0000000000", "log", message, "info"),
            commit=True
        )
    except: pass

def get_config_map():
    rows = mysql_query("SELECT clave, valor FROM configuracion") or []
    return {row['clave']: row['valor'] for row in rows}

def update_heartbeat():
    mysql_query(
        "INSERT INTO configuracion (clave, valor) VALUES (%s, NOW()) ON DUPLICATE KEY UPDATE valor = NOW()",
        ("bot_heartbeat",), commit=True
    )

# --- AI HELPERS ---
def call_openai_ai(prompt_sistema, client_name, api_key, model="gpt-3.5-turbo"):
    if not api_key or not prompt_sistema: return None
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": f"ERES UN COACH TITANUS. REGLA CRÍTICA: NO uses nombres propios reales. Usa SIEMPRE el placeholder {{{{Nombre}}}}. Prompt: {prompt_sistema}"},
            {"role": "user", "content": f"Genera un mensaje de cumpleaños para {client_name}."}
        ]
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=20)
        return r.json()['choices'][0]['message']['content'].strip()
    except: return None

def call_groq_ai(prompt_sistema, client_name, api_key):
    if not api_key or not prompt_sistema: return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": f"ERES UN COACH TITANUS. REGLA CRÍTICA: NO uses nombres propios reales. Usa SIEMPRE el placeholder {{{{Nombre}}}}. Prompt: {prompt_sistema}"},
            {"role": "user", "content": f"Genera un mensaje de cumpleaños para {client_name}."}
        ]
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=20)
        return r.json()['choices'][0]['message']['content'].strip()
    except: return None

def call_gemini_ai(prompt_sistema, client_name, api_key):
    if not api_key or not prompt_sistema: return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    prompt_usuario = f"Genera un mensaje de cumpleaños personalizado para {client_name}. Mantén el tono de Coach Titanus."
    system_rule = "REGLA CRÍTICA: NO uses nombres propios reales. Usa SIEMPRE el placeholder {{Nombre}} para referirte al cliente."
    payload = {
        "contents": [{"parts": [{"text": f"SYSTEM RULE: {system_rule}\n\nSystem Prompt: {prompt_sistema}\n\nUser Request: {prompt_usuario}"}]}],
        "generationConfig": {"maxOutputTokens": 800, "temperature": 0.7}
    }
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=20)
        return r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
    except: return None

# --- BOT LOGIC ---
def generate_message_content(cl, conf, custom_msg=None):
    tipo = cl['tipo']
    key_base = "prompt_cumpleanios" if tipo == 'cumpleaños' else f"prompt_{tipo}"
    key_static = f"{key_base}_static"
    prompt_ia = conf.get(key_base, "")
    mensaje_fijo = custom_msg if custom_msg else conf.get(key_static, f"¡Hola {{{{Nombre}}}}!")
    
    modo_ia = conf.get("prompt_cumpleanios_mode", "Fijo") == "ai" if tipo == 'cumpleaños' else False
    mensaje_crudo = ""
    
    if modo_ia:
        provider = conf.get("ai_provider", "gemini")
        ai_msg = None
        if provider == 'openai':
            ai_msg = call_openai_ai(prompt_ia, cl['nombre'], conf.get("openai_api_key"), conf.get("openai_model", "gpt-3.5-turbo"))
        elif provider == 'gemini':
            ai_msg = call_gemini_ai(prompt_ia, cl['nombre'], conf.get("gemini_api_key"))
        elif provider == 'groq':
            ai_msg = call_groq_ai(prompt_ia, cl['nombre'], conf.get("groq_api_key") or os.getenv("GROQ_API_KEY"))

        mensaje_crudo = ai_msg if ai_msg else mensaje_fijo
    else:
        mensaje_crudo = mensaje_fijo
    
    mensaje = mensaje_crudo.replace("{{Nombre}}", cl['nombre']).replace("{{nombre}}", cl['nombre']).replace("{{Name}}", cl['nombre']) 
    if 'extra' in cl: 
        mensaje = mensaje.replace("{{FechaVencimiento}}", cl['extra']).replace("{{fecha}}", cl['extra'])
    return mensaje

def generate_queue(tipo_filtro=None, allow_duplicates=False, custom_msg=None, custom_img=None, limit=None, offset=None, target_data=None):
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_md = now.strftime("-%m-%d")
    
    conf = get_config_map()
    clients_to_notify = []

    if tipo_filtro == 'publicidad':
        target_type = target_data.get('tipo', 'clientes') if target_data else 'clientes'
        if target_type == 'grupos':
            grupos_ids = target_data.get('grupos_ids', [])
            start = offset if offset else 0
            end = start + (limit if limit else len(grupos_ids))
            batch_grupos = grupos_ids[start:end]
            for g_id in batch_grupos:
                clients_to_notify.append({'nombre': 'Grupo', 'telefono': g_id, 'tipo': 'publicidad'})
        else:
            res = mysql_query(
                "SELECT nombre, telefono FROM clientes WHERE estado = 'activo' OR estado IS NULL OR estado = 'vencido' LIMIT %s OFFSET %s",
                (limit if limit else 1000, offset if offset else 0)
            ) or []
            for c in res: clients_to_notify.append({**c, 'tipo': 'publicidad'})
    else:
        res = mysql_query("SELECT nombre, telefono, fecha_nacimiento FROM clientes WHERE estado = 'activo' OR estado IS NULL OR estado = 'vencido'") or []
        for c in res:
            if c.get('fecha_nacimiento') and today_md in str(c.get('fecha_nacimiento')):
                clients_to_notify.append({**c, 'tipo': 'cumpleaños'})
        
        tom = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        v_res = mysql_query("SELECT nombre, telefono, fecha_vencimiento FROM clientes WHERE estado = 'activo' AND fecha_vencimiento = %s", (tom,)) or []
        for c in v_res: clients_to_notify.append({**c, 'tipo': 'vencimiento', 'extra': str(c.get('fecha_vencimiento'))})

    enqueued = 0
    img_publicidad = custom_img if custom_img else (conf.get("publicidad_imagen") if tipo_filtro == 'publicidad' else None)
    img_cumple = conf.get("imagen_cumple") or conf.get("cumple_imagen") or conf.get("birthday_image")

    for cl in clients_to_notify:
        msg = generate_message_content(cl, conf, custom_msg)
        if cl['tipo'] == 'publicidad' and img_publicidad and len(str(img_publicidad)) > 5:
            msg = f"[MEDIA:{img_publicidad}] {msg}"
        elif cl['tipo'] == 'cumpleaños' and img_cumple and len(str(img_cumple)) > 5:
            msg = f"[MEDIA:{img_cumple}] {msg}"
            
        insert_res = mysql_query(
            "INSERT INTO cola_mensajes (nombre, telefono, tipo, mensaje, estado) VALUES (%s, %s, %s, %s, %s)",
            (cl['nombre'], cl['telefono'], cl['tipo'], msg, "pendiente"), commit=True
        )
        if insert_res: enqueued += 1

    return enqueued

def check_scheduled_broadcasts():
    conf = get_config_map()
    json_str = conf.get('difusiones_programadas_json', '[]')
    try: scheduled = json.loads(json_str)
    except: scheduled = []

    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_date = now.strftime("%Y-%m-%d")
    now_total = now.hour * 60 + now.minute
    
    changes = False
    
    for idx, item in enumerate(scheduled):
        item_fecha = item.get('fecha', '')
        item_estado = item.get('estado', '')
        item_hora = item.get('hora', '??:??')
        target_data = item.get('target', {})
        target_type = target_data.get('tipo', 'clientes') if target_data else 'clientes'
        
        if item_fecha > today_date: continue
        if item_estado.startswith('completado') or item_estado.startswith('expirado'): continue
            
        try:
            item_h, item_m = map(int, item_hora.split(':'))
            item_total = item_h * 60 + item_m
            diff = now_total - item_total
        except: continue
        
        if item_estado == 'pendiente':
            if item_fecha == today_date and diff >= 0 and diff < 10:
                item['estado'] = 'en_progreso'
                item['offset'] = 0
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
            elif item_fecha < today_date:
                item['estado'] = 'expirado (fecha pasada)'
                changes = True
                continue
            elif diff >= 10:
                item['estado'] = 'expirado (hora pasada)'
                changes = True
                continue
            else:
                continue
        
        if item.get('estado') != 'en_progreso': continue
        
        if diff < 0 or diff >= 10:
            if diff >= 10 and item.get('offset', 0) == 0:
                item['estado'] = 'expirado (hora pasada)'
                changes = True
            continue
            
        current_minute_key = now.strftime("%Y-%m-%d %H:%M")
        if item.get('last_run_minute') == current_minute_key: continue
            
        if item.get('day_tracking') != today_date:
            item['enviados_hoy'] = 0
            item['day_tracking'] = today_date
            changes = True
        
        try:
            custom_msg = item.get('mensaje')
            custom_img = item.get('imagen')
            offset = item.get('offset', 0)
            batch_size = 20
            
            count = generate_queue(
                tipo_filtro='publicidad', 
                allow_duplicates=True,
                custom_msg=custom_msg,
                custom_img=custom_img,
                limit=batch_size,
                offset=offset,
                target_data=target_data
            )
            
            if count > 0:
                item['offset'] = offset + count
                item['enviados_hoy'] = item.get('enviados_hoy', 0) + count
                item['last_run_minute'] = current_minute_key
                log_system("success", f"Difusión {item_hora}: Lote enviado ({count} msgs).")
                changes = True
            else:
                item['estado'] = f"completado ({item['offset']} total)"
                log_system("success", f"Difusión {item_hora} FINALIZADA. Total: {item['offset']}")
                changes = True
        except Exception as e:
            logging.error(f"Error en batch difusión: {e}")
    
    if changes:
        mysql_query(
            "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            ("difusiones_programadas_json", json.dumps(scheduled)), commit=True
        )

def send_wa(num, text):
    if "@" in num: clean = num
    else: clean = "".join(filter(str.isdigit, num))
    
    # Manejo exclusivo para Medios (Fotos/Videos)
    if "[MEDIA:" in text:
        try:
            parts = text.split("]", 1)
            media_url = parts[0].replace("[MEDIA:", "").strip()
            caption_part = parts[1].strip() if len(parts) > 1 else ""
            
            if media_url.startswith("/"): media_url = f"https://titanus-app.vercel.app{media_url}"
            
            if media_url.startswith("http"):
                url = f"{EVOLUTION_API_URL}/message/sendMedia/{EVOLUTION_INSTANCE_NAME}"
                headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
                payload = {
                    "number": clean, 
                    "media": media_url, 
                    "mediatype": "image", 
                    "caption": caption_part, 
                    "delay": 1200
                }
                # Damos mas tiempo de espera (60s) para que la API descargue la imagen.
                r = requests.post(url, json=payload, headers=headers, timeout=60)
                if r.status_code in [200, 201]: 
                    return True, r.text
                else: 
                    return False, f"Media API Error: {r.text}"
        except Exception as e:
            # Si ocurre timeout o error de socket, NO ENVIAR EL MENSAJE COMO TEXTO para evitar el bug '[MEDIA:...'
            logging.error(f"Media timeout/error: {e}")
            return False, f"Media Exception: {e}"

    # Envio de Texto simple
    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE_NAME}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    payload = {"number": clean, "text": text, "delay": 1200}
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        return r.status_code in [200, 201], r.text
    except Exception as e: 
        return False, f"Text Exception: {e}"

def process_batch(tipo=None):
    tipo_clause = "AND tipo = %s" if tipo else "AND tipo != 'log'"
    query = f"SELECT * FROM cola_mensajes WHERE estado = 'pendiente' {tipo_clause} ORDER BY id ASC LIMIT {BATCH_SIZE}"
    pend = mysql_query(query, (tipo,) if tipo else ()) or []
    count = 0
    for m in pend:
        # Prevenir procesamiento concurrente de esta misma fila (Bloqueo)
        mysql_query("UPDATE cola_mensajes SET estado = 'en_proceso' WHERE id = %s", (m['id'],), commit=True)
        ok, res = send_wa(m['telefono'], m['mensaje'])
        mysql_query("UPDATE cola_mensajes SET estado = %s WHERE id = %s", ("enviado" if ok else "error", m['id']), commit=True)
        count += 1
    return count

# --- FLASK ROUTES ---
@app.route('/heartbeat', methods=['GET'])
def heartbeat():
    logging.info("Heartbeat received.")
    update_heartbeat()
    
    def background_tasks():
        try:
            ec_tz = pytz.timezone('America/Guayaquil')
            now_ec = datetime.now(ec_tz)
            now_str = now_ec.strftime("%H:%M")
            
            conf = get_config_map()
            target = conf.get("envio_hora", "08:00").strip()
            
            # 1. Process Campaigns
            check_scheduled_broadcasts()
            
            # 2. Process Birthdays
            try:
                target_h, target_m = map(int, target.split(':'))
                target_total = target_h * 60 + target_m
                now_total = now_ec.hour * 60 + now_ec.minute
                diff = now_total - target_total
                is_target_time = 0 <= diff < 1
            except: is_target_time = now_str == target
            
            current_minute_key = now_ec.strftime("%Y-%m-%d %H:%M")
            already_run = mysql_query(
                "SELECT COUNT(*) as c FROM cola_mensajes WHERE tipo = 'cumpleaños' AND DATE_FORMAT(CONVERT_TZ(fecha_creacion, '+00:00', '-05:00'), '%%Y-%%m-%%d %%H:%%i') = %s",
                (current_minute_key,)
            )
            already_count = already_run[0]['c'] if already_run else 0
            
            if is_target_time and already_count == 0:
                generate_queue('cumpleaños')
            
            # 3. Process Batch
            for t in ["cumpleaños", "vencimiento", "seguimiento", "publicidad"]: 
                process_batch(tipo=t)
                
            logging.info("Background tasks completed successfully.")
        except Exception as e:
            logging.error(f"Error en hilo en segundo plano: {e}")

    # Start thread immediately so Response is returned under 100ms
    threading.Thread(target=background_tasks).start()
    
    return jsonify({"status": "processing_in_background"}), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    logging.info(f"Webhook received: {json.dumps(data, indent=2)}")
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
