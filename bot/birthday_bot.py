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
            cursor.execute(query, params or ())
            
            if commit:
                conn.commit()
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
    """Procesa las difusiones programadas del dashboard.
    
    LÓGICA CLAVE: Solo procesa una campaña si la hora actual de Ecuador
    coincide con la hora programada de esa campaña (ventana de ejecución).
    Las campañas en estado 'pendiente' solo se activan cuando llega su hora.
    """
    conf = get_config_map()
    json_str = conf.get('difusiones_programadas_json', '[]')
    try:
        scheduled = json.loads(json_str)
    except: scheduled = []

    # ZONA HORARIA ECUADOR
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_date = now.strftime("%Y-%m-%d")
    now_h = now.hour
    now_m = now.minute
    now_total = now_h * 60 + now_m
    
    print(f"DEBUG BROADCAST: Hora Ecuador={now.strftime('%H:%M:%S')}, Fecha={today_date}, Campañas={len(scheduled)}")
    
    changes = False
    
    for idx, item in enumerate(scheduled):
        item_fecha = item.get('fecha', '')
        item_estado = item.get('estado', '')
        item_hora = item.get('hora', '??:??')
        target_data = item.get('target', {})
        target_type = target_data.get('tipo', 'clientes') if target_data else 'clientes'
        
        print(f"DEBUG BROADCAST [{idx}]: fecha={item_fecha}, hora={item_hora}, estado={item_estado}, target={target_type}")
        
        # Ignorar campañas futuras (fecha posterior a hoy)
        if item_fecha > today_date:
            print(f"DEBUG BROADCAST [{idx}]: Campaña es para el futuro, saltando.")
            continue
        
        # Ignorar campañas ya completadas o expiradas
        if item_estado.startswith('completado') or item_estado.startswith('expirado'):
            continue
            
        # *** VERIFICAR QUE ES LA HORA CORRECTA DE ESTA CAMPAÑA ***
        try:
            item_h, item_m = map(int, item_hora.split(':'))
            item_total = item_h * 60 + item_m
            diff = now_total - item_total
        except Exception as e:
            print(f"ERROR parseando hora de campaña [{idx}]: {e}")
            continue
        
        # Activar campaña pendiente SOLO cuando llega su hora
        if item_estado == 'pendiente':
            if item_fecha == today_date and diff >= 0 and diff < 10:
                # ¡Es la hora! Activar
                print(f"DEBUG BROADCAST [{idx}]: ✅ ACTIVANDO campaña pendiente (diff={diff} min)")
                item['estado'] = 'en_progreso'
                item['offset'] = 0
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
            elif item_fecha < today_date:
                # Campaña de día anterior nunca se envió
                print(f"DEBUG BROADCAST [{idx}]: Campaña de fecha pasada ({item_fecha}). Marcando expirada.")
                item['estado'] = 'expirado (fecha pasada)'
                changes = True
                continue
            elif diff >= 10:
                # Ya pasó la ventana de activación
                print(f"DEBUG BROADCAST [{idx}]: Hora pasada (diff={diff} min). Expirando.")
                item['estado'] = 'expirado (hora pasada)'
                changes = True
                continue
            else:
                # Aún no es la hora
                print(f"DEBUG BROADCAST [{idx}]: Esperando hora (faltan {-diff} min)")
                continue
        
        # Solo procesar si está 'en_progreso'
        if item.get('estado') != 'en_progreso':
            continue
        
        # Ventana de ejecución: hasta 10 min después de la hora programada
        if diff < 0 or diff >= 10:
            if diff >= 10 and item.get('offset', 0) == 0:
                print(f"DEBUG BROADCAST [{idx}]: Campaña en_progreso pero sin envíos y fuera de ventana. Expirando.")
                item['estado'] = 'expirado (hora pasada)'
                changes = True
            continue
            
        # *** VERIFICAR QUE NO SE EJECUTÓ YA EN ESTE MINUTO ***
        current_minute_key = now.strftime("%Y-%m-%d %H:%M")
        if item.get('last_run_minute') == current_minute_key:
            print(f"DEBUG BROADCAST [{idx}]: Ya procesada este minuto ({current_minute_key}). Esperando.")
            continue
            
        # Reset Diario Local para el item
        if item.get('day_tracking') != today_date:
            item['enviados_hoy'] = 0
            item['day_tracking'] = today_date
            changes = True
        
        try:
            # Extraer snapshot de mensaje e imagen personalizados
            custom_msg = item.get('mensaje')
            custom_img = item.get('imagen')
            offset = item.get('offset', 0)
            batch_size = 20  # Máximo por ejecución
            
            print(f"DEBUG BROADCAST [{idx}]: Ejecutando generate_queue target={target_type}, offset={offset}, batch={batch_size}")
            if target_type == 'grupos':
                grupos_ids = target_data.get('grupos_ids', [])
                print(f"DEBUG BROADCAST [{idx}]: Grupos seleccionados ({len(grupos_ids)}): {grupos_ids}")
            
            # Ejecutar lote paginado
            count = generate_queue(
                tipo_filtro='publicidad', 
                allow_duplicates=True,
                custom_msg=custom_msg,
                custom_img=custom_img,
                limit=batch_size,
                offset=offset,
                target_data=target_data
            )
            
            print(f"DEBUG BROADCAST [{idx}]: generate_queue retornó {count}")
            
            if count > 0:
                item['offset'] = offset + count
                item['enviados_hoy'] = item.get('enviados_hoy', 0) + count
                item['last_run_minute'] = current_minute_key
                log_system("success", f"Difusión {item_hora}: Lote enviado ({count} msgs, target={target_type}). Offset: {item['offset']}.")
                changes = True
            else:
                # Si devuelve 0, se acabaron los destinatarios
                item['estado'] = f"completado ({item['offset']} total)"
                log_system("success", f"Difusión {item_hora} FINALIZADA (target={target_type}). Total: {item['offset']}")
                changes = True
                    
        except Exception as e:
            log_system("error", f"Error en batch difusión {item_hora}: {e}")
            import traceback
            traceback.print_exc()
    
    if changes:
        mysql_query(
            "INSERT INTO configuracion (clave, valor) VALUES (%s, %s) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            ("difusiones_programadas_json", json.dumps(scheduled)),
            commit=True
        )
        print(f"DEBUG BROADCAST: JSON actualizado en DB.")

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
    except Exception as e:
        print(f"DEBUG: OpenAI API Err: {e}")
        return None

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
    except Exception as e:
        print(f"DEBUG: Groq API Err: {e}")
        return None

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

def generate_queue(tipo_filtro=None, allow_duplicates=False, custom_msg=None, custom_img=None, limit=None, offset=None, target_data=None):
    # FIX: Usar pytz para la fecha en generate_queue (igual que en check_and_send)
    ec_tz = pytz.timezone('America/Guayaquil')
    now = datetime.now(ec_tz)
    today_str = now.strftime("%Y-%m-%d")
    today_md = now.strftime("-%m-%d")
    print(f"DEBUG: Checking for birthdays with suffix '{today_md}'")
    
    conf = get_config_map()
    clients_to_notify = []

    if tipo_filtro == 'publicidad':
        # FIX: Respetar target_data para enviar solo a grupos o solo a clientes
        target_type = target_data.get('tipo', 'clientes') if target_data else 'clientes'
        print(f"DEBUG: Publicidad target_type = {target_type}")
        
        if target_type == 'grupos':
            # Solo enviar a los grupos seleccionados
            grupos_ids = target_data.get('grupos_ids', [])
            start = offset if offset else 0
            end = start + (limit if limit else len(grupos_ids))
            batch_grupos = grupos_ids[start:end]
            print(f"DEBUG QUEUE: Grupos total={len(grupos_ids)}, batch={len(batch_grupos)} (offset {start} -> {end})")
            
            for g_id in batch_grupos:
                print(f"DEBUG QUEUE: Encolando grupo ID: '{g_id}'")
                clients_to_notify.append({'nombre': 'Grupo', 'telefono': g_id, 'tipo': 'publicidad'})
        else:
            # Solo enviar a clientes individuales
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
    # Imagen para cumpleaños (configurada en el dashboard)
    img_cumple = conf.get("imagen_cumple") or conf.get("cumple_imagen") or conf.get("birthday_image")

    for cl in clients_to_notify:
        # Pasamos custom_msg a generate_message_content
        msg = generate_message_content(cl, conf, custom_msg)
        
        # Anteponer [MEDIA:url] si hay imagen configurada
        if cl['tipo'] == 'publicidad' and img_publicidad and len(str(img_publicidad)) > 5:
            msg = f"[MEDIA:{img_publicidad}] {msg}"
        elif cl['tipo'] == 'cumpleaños' and img_cumple and len(str(img_cumple)) > 5:
            msg = f"[MEDIA:{img_cumple}] {msg}"
            
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
    
    key_base = "prompt_cumpleanios" if tipo == 'cumpleaños' else f"prompt_{tipo}"
    key_static = f"{key_base}_static"
    
    prompt_ia = conf.get(key_base, "")
    mensaje_fijo = custom_msg if custom_msg else conf.get(key_static, f"¡Hola {{{{Nombre}}}}!")
    
    modo_ia = False
    if tipo == 'cumpleaños':
        modo_ia = conf.get("prompt_cumpleanios_mode", "Fijo") == "ai"
    
    mensaje_crudo = ""
    if modo_ia:
        print(f"DEBUG: Modo IA activado para {cl['nombre']}")
        provider = conf.get("ai_provider", "gemini")
        
        ai_msg = None
        if provider == 'openai':
            api_key = conf.get("openai_api_key")
            model = conf.get("openai_model", "gpt-3.5-turbo")
            ai_msg = call_openai_ai(prompt_ia, cl['nombre'], api_key, model)
        elif provider == 'gemini':
            api_key = conf.get("gemini_api_key")
            ai_msg = call_gemini_ai(prompt_ia, cl['nombre'], api_key)
        elif provider == 'groq':
            api_key = conf.get("groq_api_key") or os.getenv("GROQ_API_KEY")
            ai_msg = call_groq_ai(prompt_ia, cl['nombre'], api_key)

        if ai_msg:
            print(f"DEBUG: ✅ Mensaje IA generado via {provider}")
            mensaje_crudo = ai_msg
        else:
            print(f"DEBUG: ⚠️ IA falló ({provider}), usando mensaje fijo")
            mensaje_crudo = mensaje_fijo
    else:
        mensaje_crudo = mensaje_fijo
    
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
    # FIX: Preservar JIDs de grupo (contienen @g.us) sin limpiar
    if "@" in num:
        clean = num
    else:
        clean = "".join(filter(str.isdigit, num))
    
    # Lógica de envío de medios optimizada
    if "[MEDIA:" in text:
        try:
            parts = text.split("]", 1)
            media_part = parts[0] 
            caption_part = parts[1].strip() if len(parts) > 1 else ""
            
            media_url = media_part.replace("[MEDIA:", "").strip()
            
            # Si es relativa, convertir a absoluta (Vercel Prod)
            if media_url.startswith("/"):
                media_url = f"https://titanus-app.vercel.app{media_url}"
            
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
                
                print(f"DEBUG: Enviando MEDIA a {clean} | URL: {media_url[:40]}...")
                r = requests.post(url, json=payload, headers=headers, timeout=30)
                if r.status_code in [200, 201]:
                    return True, r.text
                else:
                    print(f"DEBUG: Evolution API Error: {r.text}")
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
    now_h = now_ec.hour
    now_m = now_ec.minute
    
    update_heartbeat()
    print(f"[{now_str}] 🤖 BOT ACTIVO | MODO: {mode} | TARGET CUMPLEAÑOS: {target}")

    if mode in ["generator", "cron", "force"]:
        # === PASO 1: Procesar CAMPAÑAS programadas ===
        print("DEBUG: Entrando a check_scheduled_broadcasts...")
        try:
            check_scheduled_broadcasts()
            print("DEBUG: Finalizó check_scheduled_broadcasts")
        except Exception as e:
            print(f"ERROR en check_scheduled_broadcasts: {e}")

        # === PASO 2: Generar CUMPLEAÑOS si es la hora correcta ===
        try:
            target_h, target_m = map(int, target.split(':'))
            target_total = target_h * 60 + target_m
            now_total = now_h * 60 + now_m
            diff = now_total - target_total
            # El bot corre cada 1 min.
            # 0 <= diff < 1 garantiza que solo se dispare en el MINUTO EXACTO programado.
            is_target_time = 0 <= diff < 1
        except Exception as e:
            print(f"ERROR calculando diff de tiempo: {e}")
            is_target_time = now_str == target
        
        # Control anti-duplicados: Verificar si ya se generaron CUMPLEAÑOS en este minuto exacto
        current_minute_key = now_ec.strftime("%Y-%m-%d %H:%M")
        already_run_this_minute = mysql_query(
            "SELECT COUNT(*) as c FROM cola_mensajes WHERE tipo = 'cumpleaños' AND DATE_FORMAT(CONVERT_TZ(fecha_creacion, '+00:00', '-05:00'), '%%Y-%%m-%%d %%H:%%i') = %s",
            (current_minute_key,)
        )
        already_count_min = already_run_this_minute[0]['c'] if already_run_this_minute else 0
        
        print(f"DEBUG: CUMPLEAÑOS — Hora actual: {now_ec.strftime('%H:%M:%S')}, Target: {target}, Es hora: {is_target_time}, Ya procesado este minuto: {already_count_min}")
        
        if (is_target_time and already_count_min == 0) or mode == "force":
            print(f"DEBUG: ✅ EJECUTANDO GENERACIÓN DE CUMPLEAÑOS...")
            try:
                generate_queue('cumpleaños')
                print("DEBUG: Finalizó generate_queue (cumpleaños)")
            except Exception as e:
                print(f"ERROR en generate_queue: {e}")
        else:
            if is_target_time:
                print(f"DEBUG: ⏳ Ya se procesaron los cumpleaños en este minuto ({current_minute_key}).")
            else:
                print(f"DEBUG: ⏳ Esperando hora de cumpleaños ({now_str} != {target}).")

    # === PASO 3: Enviar todos los mensajes PENDIENTES ===
    if mode in ["worker", "cron"]:
        print("DEBUG: Entrando a fase worker...")
        t_filtro = sys.argv[sys.argv.index("--type") + 1] if "--type" in sys.argv else None
        if mode == "cron" and not t_filtro:
            for t in ["cumpleaños", "vencimiento", "seguimiento", "publicidad"]: 
                print(f"DEBUG: Procesando lote para tipo: {t}")
                process_batch(tipo=t)
        else: 
            print(f"DEBUG: Procesando lote para tipo: {t_filtro}")
            process_batch(tipo=t_filtro)
    
    print("DEBUG: Ejecución completada.")
