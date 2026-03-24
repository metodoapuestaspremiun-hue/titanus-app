import requests
import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
import pytz  # Asegurar tener pytz instalado en VPS
from dotenv import load_dotenv

# Rutas para el entorno
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')

if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
    print(f"DEBUG: Cargado entorno desde {env_path}")
else:
    # Si no existe .env, probar .env.local
    env_local = os.path.join(script_dir, '.env.local')
    if os.path.exists(env_local):
        load_dotenv(env_local, override=True)
        print(f"DEBUG: Cargado entorno desde {env_local}")
    else:
        print("DEBUG: ⚠️ No se encontró archivo .env")

# Re-verificar variables críticas cargadas
if not os.getenv("DB_HOST"):
    print(f"DEBUG: Error cargando variables. Busqué en: {env_path}")

# Configuración de Logging
script_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(script_dir, "birthday_bot.log")
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)]
)

import pymysql
import pymysql.cursors

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "mysql.us.stackcp.com"),
    "port": int(os.getenv("DB_PORT", 43421)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "connect_timeout": 10
}

print(f"DEBUG: Intentando conectar a {DB_CONFIG['host']} as {DB_CONFIG['user']} DB: {DB_CONFIG['database']}")

# Configuración Evolution API
EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL")
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY")
EVOLUTION_INSTANCE_NAME = os.getenv("EVOLUTION_INSTANCE_NAME")

# Configuración Global
BATCH_SIZE = 10
DELAY_BETWEEN_MESSAGES = 3

# Verify credentials
if not DB_CONFIG['user'] or not DB_CONFIG['password'] or not EVOLUTION_API_URL:
    logging.error("CRITICAL: Credenciales de DB o Evolution API faltantes en el entorno")
    sys.exit(1)

print("DEBUG: Conexión MySQL configurada con PyMySQL")

def mysql_query(query, params=None, commit=False):
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            # print(f"DEBUG: Executing query: {query[:50]}... Params: {params}")
            cursor.execute(query, params or ())
            
            if commit:
                conn.commit()
                # print(f"DEBUG: Committed. LastRowID: {cursor.lastrowid} RowCount: {cursor.rowcount}")
                return cursor.lastrowid if cursor.lastrowid > 0 else cursor.rowcount
            else:
                return cursor.fetchall()
    except Exception as e:
        print(f"DEBUG: MySQL Err: {e}")
        return None
    finally:
        if conn:
            conn.close()

def log_system(level, message):
    print(f"[{level.upper()}] {message}")
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
        ("bot_heartbeat",),
        commit=True
    )
    print("DEBUG: Heartbeat actualizado con NOW() del servidor DB")

def check_scheduled_broadcasts():
    conf = get_config_map()
    json_str = conf.get('difusiones_programadas_json', '[]')
    try:
        scheduled = json.loads(json_str)
    except: scheduled = []

    # ZONA HORARIA ECUADOR
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_date = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    current_hour_key = now.strftime("%Y-%m-%d %H") # Para evitar ejecuciones múltiples en la misma hora
    
    changes = False
    
    # --- CÁLCULO DE LÍMITES GLOBALES ---
    global_today_count = 0
    any_item_run_this_hour = False
    
    for item in scheduled:
        if item.get('day_tracking') == today_date:
            global_today_count += item.get('enviados_hoy', 0)
        if item.get('last_run_hour') == current_hour_key:
            any_item_run_this_hour = True

    DAILY_LIMIT_GLOBAL = 80
    HOURLY_LIMIT_GLOBAL = 20
    
    # Si ya se corrió algo en esta hora, saltamos el chequeo general (respetando 20/hora total)
    # Nota: Esto asume que cada ejecución procesa un lote completo o agota la cuota horaria.
    if any_item_run_this_hour:
        print(f"DEBUG: Ya se envió un lote de publicidad en la hora {current_hour_key}. Esperando próxima hora.")
        # No retornamos aún, procesamos inicializaciones de 'pendiente'
    
    for item in scheduled:
        # Inicializar estado si es 'pendiente'
        if item.get('estado') == 'pendiente':
            if item['fecha'] < today_date or (item['fecha'] == today_date and item['hora'] <= current_time):
                item['estado'] = 'en_progreso'
                item['offset'] = 0
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
        
        # Procesar si está 'en_progreso' y NO hemos excedido límites globales esta hora
        if item.get('estado') == 'en_progreso' and not any_item_run_this_hour:
            # Reset Diario Local para el item
            if item.get('day_tracking') != today_date:
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
            
            # Verificar Límite Diario GLOBAL
            if global_today_count >= DAILY_LIMIT_GLOBAL:
                print(f"DEBUG: Límite GLOBAL diario alcanzado ({global_today_count}/{DAILY_LIMIT_GLOBAL}).")
                break # Salimos del loop de procesamiento

            # Calcular tamaño del lote restante GLOBAL
            remaining_today_global = DAILY_LIMIT_GLOBAL - global_today_count
            batch_size = min(HOURLY_LIMIT_GLOBAL, remaining_today_global)
            
            try:
                # Extraer snapshot de mensaje e imagen personalizados
                custom_msg = item.get('mensaje')
                custom_img = item.get('imagen')
                offset = item.get('offset', 0)
                
                # Ejecutar lote paginado
                count = generate_queue(
                    tipo_filtro='publicidad', 
                    allow_duplicates=True,
                    custom_msg=custom_msg,
                    custom_img=custom_img,
                    limit=batch_size,
                    offset=offset
                )
                
                if count > 0:
                    item['offset'] = offset + count
                    item['enviados_hoy'] = item.get('enviados_hoy', 0) + count
                    item['last_run_hour'] = current_hour_key
                    global_today_count += count
                    any_item_run_this_hour = True # Bloqueamos otros items en esta misma hora
                    log_system("success", f"Difusión {item['hora']}: Lote enviado ({count} msgs). Offset: {item['offset']}. Total Hoy Global: {global_today_count}")
                    changes = True
                else:
                    # Si devuelve 0, asumimos que se acabaron los clientes
                    item['estado'] = f"completado ({item['offset']} total)"
                    log_system("success", f"Difusión {item['hora']} FINALIZADA. Total: {item['offset']}")
                    changes = True
                    
            except Exception as e:
                log_system("error", f"Error en batch difusión {item['hora']}: {e}")
    
    if changes:
        mysql_query(
            "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            ("difusiones_programadas_json", json.dumps(scheduled)),
            commit=True
        )

def call_gemini_ai(prompt_sistema, client_name, api_key):
    if not api_key or not prompt_sistema:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt_usuario = f"Genera un mensaje de cumpleaños personalizado para {client_name}. Mantén el tono de Coach Titanus."
    
    system_rule = "REGLA CRÍTICA: NO uses nombres propios reales. Usa SIEMPRE el placeholder {{Nombre}} para referirte al cliente. Ejemplo: '¡Hola {{Nombre}}!'."
    
    payload = {
        "contents": [{
            "parts": [{
                "text": f"SYSTEM RULE: {system_rule}\n\nSystem Prompt: {prompt_sistema}\n\nUser Request: {prompt_usuario}"
            }]
        }],
        "generationConfig": {
            "maxOutputTokens": 800,
            "temperature": 0.7
        }
    }
    
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=20)
        data = r.json()
        return data['candidates'][0]['content']['parts'][0]['text'].strip()
    except Exception as e:
        print(f"DEBUG: Gemini API Err: {e}")
        return None

def generate_queue(tipo_filtro=None, allow_duplicates=False, custom_msg=None, custom_img=None, limit=None, offset=None):
    # FIX: Usar pytz para la fecha en generate_queue (igual que en check_and_send)
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_str = now.strftime("%Y-%m-%d")
    today_md = now.strftime("-%m-%d")
    print(f"DEBUG: Checking for birthdays with suffix '{today_md}'")
    
    conf = get_config_map()
    clients_to_notify = []

    if tipo_filtro == 'publicidad':
        res = mysql_query(
            "SELECT nombre, telefono FROM clientes WHERE estado = 'activo' OR estado IS NULL OR estado = 'vencido' LIMIT %s OFFSET %s",
            (limit if limit else 1000, offset if offset else 0)
        ) or []
        for c in res: clients_to_notify.append({**c, 'tipo': 'publicidad'})
    else:
        # Bdays y Vencimientos
        res = mysql_query(
            "SELECT nombre, telefono, fecha_nacimiento FROM clientes WHERE estado = 'activo' OR estado IS NULL OR estado = 'vencido'"
        ) or []
        print(f"DEBUG: Found {len(res)} clients to check.")
        for c in res:
            dob_str = str(c.get('fecha_nacimiento'))
            match = today_md in dob_str
            # print(f"DEBUG: Checking {c['nombre']} DOB: {dob_str} Match: {match}")
            if c.get('fecha_nacimiento') and match:
                print(f"DEBUG: HIT! Adding {c['nombre']} to queue")
                clients_to_notify.append({**c, 'tipo': 'cumpleaños'})
        
        # Vencimientos (Mañana)
        tom = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        v_res = mysql_query(
            "SELECT nombre, telefono, fecha_vencimiento FROM clientes WHERE estado = 'activo' AND fecha_vencimiento = %s",
            (tom,)
        ) or []
        for c in v_res: clients_to_notify.append({**c, 'tipo': 'vencimiento', 'extra': str(c.get('fecha_vencimiento'))})

    enqueued = 0
    # Prioridad: custom_img > config global
    img_publicidad = custom_img if custom_img else (conf.get("publicidad_imagen") if tipo_filtro == 'publicidad' else None)

    for cl in clients_to_notify:
        # Pasamos custom_msg a generate_message_content
        msg = generate_message_content(cl, conf, custom_msg)
        
        # Anteponer [MEDIA:url] si es publicidad
        if cl['tipo'] == 'publicidad' and img_publicidad and len(img_publicidad) > 5:
            msg = f"[MEDIA:{img_publicidad}] {msg}"
            
        payload = {
            "nombre": cl['nombre'], 
            "telefono": cl['telefono'], 
            "tipo": cl['tipo'], 
            "mensaje": msg, 
            "estado": "pendiente"
        }
            
        insert_res = mysql_query(
            "INSERT INTO cola_mensajes (nombre, telefono, tipo, mensaje, estado) VALUES (%s, %s, %s, %s, %s)",
            (cl['nombre'], cl['telefono'], cl['tipo'], msg, "pendiente"),
            commit=True
        )

        if insert_res:
            log_system("info", f"➕ Encolado: {cl['nombre']} ({cl['tipo']})")
            enqueued += 1

    return enqueued

def generate_message_content(cl, conf, custom_msg=None):
    tipo = cl['tipo']
    
    # 1. Definir claves según el Dashboard
    # 'prompt_tipo' -> Instrucciones para IA
    # 'prompt_tipo_static' -> Mensaje Fijo
    key_base = "prompt_cumpleanios" if tipo == 'cumpleaños' else f"prompt_{tipo}"
    key_static = f"{key_base}_static"
    
    prompt_ia = conf.get(key_base, "")
    # Si viene un mensaje personalizado (desde programación), usarlo. Si no, usar el del config.
    mensaje_fijo = custom_msg if custom_msg else conf.get(key_static, f"¡Hola {{{{Nombre}}}}!")
    
    # 2. Verificar Modo
    # Para cumpleaños, leemos 'modo_mensaje_cumple'. Para otros, asumimos 'Fijo' o lo que diga el config si existiera.
    modo_ia = False
    if tipo == 'cumpleaños':
        modo_ia = conf.get("modo_mensaje_cumple", "Fijo") == "IA"
    
    # 3. MODO IA: Usar prompt_ia como instrucciones para Gemini
    mensaje_crudo = ""
    if modo_ia:
        print(f"DEBUG: Modo IA activado para {cl['nombre']}")
        gemini_key = conf.get("gemini_api_key")
        
        if gemini_key and prompt_ia:
            ai_msg = call_gemini_ai(prompt_ia, cl['nombre'], gemini_key)
            if ai_msg:
                print(f"DEBUG: ✅ Mensaje IA generado")
                mensaje_crudo = ai_msg
            else:
                print(f"DEBUG: ⚠️ IA falló, usando mensaje fijo")
                mensaje_crudo = mensaje_fijo
        else:
            print(f"DEBUG: ⚠️ Sin API key o Prompt vacio, usando mensaje fijo")
            mensaje_crudo = mensaje_fijo
    else:
        # MODO FIJO
        mensaje_crudo = mensaje_fijo
    
    # 4. PROCESAMIENTO FINAL: Reemplazo de variables (Aplica para ambos modos)
    mensaje = mensaje_crudo.replace("{{Nombre}}", cl['nombre'])
    mensaje = mensaje.replace("{{nombre}}", cl['nombre'])
    mensaje = mensaje.replace("{{Name}}", cl['nombre']) 
    
    if 'extra' in cl: 
        mensaje = mensaje.replace("{{FechaVencimiento}}", cl['extra'])
        mensaje = mensaje.replace("{{fecha}}", cl['extra'])
        
    return mensaje

def process_batch(tipo=None):
    tipo_clause = "AND tipo = %s" if tipo else "AND tipo != 'log'"
    limit_clause = f"LIMIT {BATCH_SIZE}"
    
    query = f"SELECT * FROM cola_mensajes WHERE estado = 'pendiente' {tipo_clause} ORDER BY id ASC {limit_clause}"
    pend = mysql_query(query, (tipo,) if tipo else ()) or []
    if not pend: return 0
    
    count = 0
    for m in pend:
        print(f"DEBUG: Enviando a {m['nombre']} ({m['telefono']})...")
        
        ok, res = send_wa(m['telefono'], m['mensaje'])
        mysql_query(
            "UPDATE cola_mensajes SET estado = %s WHERE id = %s",
            ("enviado" if ok else "error", m['id']),
            commit=True
        )
        count += 1
        
        if count < len(pend):
            print(f"⏳ Esperando {DELAY_BETWEEN_MESSAGES}s para el próximo envío...")
            time.sleep(DELAY_BETWEEN_MESSAGES)
    return count

def send_wa(num, text):
    clean = "".join(filter(str.isdigit, num))
    
    # Lógica de envío de medios optimizada
    if "[MEDIA:" in text:
        try:
            # Formato esperado: "[MEDIA:https://url.com/img.jpg] Caption opcional"
            # Usamos split con maxsplit=1 para separar solo la primera ocurrencia
            parts = text.split("]", 1)
            media_part = parts[0] # "[MEDIA:https://url.com/img.jpg"
            caption_part = parts[1].strip() if len(parts) > 1 else ""
            
            # Extraer URL (quitamos "[MEDIA:")
            media_url = media_part.replace("[MEDIA:", "").strip()
            
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
                
                print(f"DEBUG: Enviando MEDIA a {clean} | URL: {media_url[:30]}...")
                r = requests.post(url, json=payload, headers=headers, timeout=30)
                return r.status_code in [200, 201], r.text
        except Exception as e:
            print(f"ERROR parseando media: {e}")
            pass # Fallback a texto

    url = f"{EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE_NAME}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    payload = {"number": clean, "text": text, "delay": 1200}
    
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        return r.status_code in [200, 201], r.text
    except: return False, "Err"

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "cron"
    print(f"DEBUG: Iniciando bot en modo '{mode}'")
    
    try:
        conf = get_config_map()
        print(f"DEBUG: Configuración cargada, llaves: {list(conf.keys())}")
    except Exception as e:
        print(f"ERROR: Fallo al cargar configuración: {e}")
        conf = {}

    target = conf.get("envio_hora", "08:00").strip()
    
    # FIX: Usar pytz para obtener la hora exacta de Ecuador
    ec_tz = pytz.timezone('America/Guayaquil')
    now_ec = datetime.now(ec_tz)
    now_str = now_ec.strftime("%H:%M")
    
    update_heartbeat()
    print(f"[{now_str}] 🤖 BOT ACTIVO | MODO: {mode} | TARGET: {target}")

    if mode in ["generator", "cron", "force"]:
        print("DEBUG: Entrando a check_scheduled_broadcasts...")
        try:
            check_scheduled_broadcasts()
            print("DEBUG: Finalizó check_scheduled_broadcasts")
        except Exception as e:
            print(f"ERROR en check_scheduled_broadcasts: {e}")

        print(f"DEBUG: Comparando {now_str} == {target}")
        
        # FIX: Validación estricta de hora para evitar repeticiones cada 5 minutos
        # Solo ejecuta si es el minuto exacto O si se fuerza manualmente
        if now_str == target or mode == "force":
            print(f"DEBUG: ✅ ES LA HORA ({now_str}). Ejecutando generación...")
            try:
                # Generar CUMPLEAÑOS
                generate_queue('cumpleaños')
                # Generar PUBLICIDAD (Broadcasts)
                generate_queue('publicidad')
                print("DEBUG: Finalizó generate_queue (cumpleaños y publicidad)")
            except Exception as e:
                print(f"ERROR en generate_queue: {e}")
        else:
            print(f"DEBUG: ⏳ No es la hora de envío ({now_str} != {target}).")

    if mode in ["worker", "cron"]:
        print("DEBUG: Entrando a fase worker...")
        t_filtro = sys.argv[sys.argv.index("--type") + 1] if "--type" in sys.argv else None
        if mode == "cron" and not t_filtro:
            # FIX: Agregado 'publicidad' para que se envíen las difusiones programadas
            for t in ["cumpleaños", "vencimiento", "seguimiento", "publicidad"]: 
                print(f"DEBUG: Procesando lote para tipo: {t}")
                process_batch(tipo=t)
        else: 
            print(f"DEBUG: Procesando lote para tipo: {t_filtro}")
            process_batch(tipo=t_filtro)
    
    print("DEBUG: Ejecución completada.")
