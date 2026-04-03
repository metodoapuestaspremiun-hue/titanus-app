import requests
import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path, override=True)

# Configuraci├│n de Logging
script_dir = os.path.dirname(os.path.abspath(__file__))
log_file = os.path.join(script_dir, "birthday_bot.log")
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)]
)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

EVOLUTION_API_URL = os.getenv('EVOLUTION_API_URL')
EVOLUTION_API_KEY = os.getenv('EVOLUTION_API_KEY')
EVOLUTION_INSTANCE_NAME = os.getenv('EVOLUTION_INSTANCE_NAME') or 'gym_bot'

BATCH_SIZE = 25
# Intervalo de 45 segundos entre cada mensaje enviado
DELAY_BETWEEN_MESSAGES = 45 

def supabase_request(method, table, params=None, data=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    try:
        r = requests.request(method, url, headers=HEADERS, params=params, json=data, timeout=20)
        return r.json() if r.content else None
    except Exception as e:
        print(f"DEBUG: Supabase Err: {e}")
        return None

def log_system(level, message):
    print(f"[{level.upper()}] {message}")
    try:
        entry = {"nombre": "System Bot", "telefono": "0000000000", "tipo": "log", "mensaje": message, "estado": "info"}
        supabase_request("POST", "cola_mensajes", data=entry)
    except: pass

def get_config_map():
    rows = supabase_request("GET", "configuracion") or []
    return {row['clave']: row['valor'] for row in rows}

def update_heartbeat():
    now_iso = (datetime.utcnow() - timedelta(hours=5)).isoformat()
    supabase_request("PATCH", "configuracion", params={"clave": "eq.bot_heartbeat"}, data={"valor": now_iso})

def check_scheduled_broadcasts():
    conf = get_config_map()
    json_str = conf.get('difusiones_programadas_json', '[]')
    try:
        scheduled = json.loads(json_str)
    except: scheduled = []

    now = datetime.utcnow() - timedelta(hours=5)
    today_date = now.strftime("%Y-%m-%d")
    current_time = now.strftime("%H:%M")
    current_hour_key = now.strftime("%Y-%m-%d %H") # Para evitar ejecuciones m├║ltiples en la misma hora
    
    changes = False
    
    # --- C├üLCULO DE L├ìMITES GLOBALES ---
    global_today_count = 0
    any_item_run_this_hour = False
    
    for item in scheduled:
        if item.get('day_tracking') == today_date:
            global_today_count += item.get('enviados_hoy', 0)
        if item.get('last_run_hour') == current_hour_key:
            any_item_run_this_hour = True

    DAILY_LIMIT_GLOBAL = 80
    HOURLY_LIMIT_GLOBAL = 20
    
    # Si ya se corri├│ algo en esta hora, saltamos el chequeo general (respetando 20/hora total)
    # Nota: Esto asume que cada ejecuci├│n procesa un lote completo o agota la cuota horaria.
    if any_item_run_this_hour:
        print(f"DEBUG: Ya se envi├│ un lote de publicidad en la hora {current_hour_key}. Esperando pr├│xima hora.")
        # No retornamos a├║n, procesamos inicializaciones de 'pendiente'
    
    for item in scheduled:
        # Inicializar estado si es 'pendiente'
        if item.get('estado') == 'pendiente':
            if item['fecha'] < today_date or (item['fecha'] == today_date and item['hora'] <= current_time):
                item['estado'] = 'en_progreso'
                item['offset'] = 0
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
        
        # Procesar si est├í 'en_progreso' y NO hemos excedido l├¡mites globales esta hora
        if item.get('estado') == 'en_progreso' and not any_item_run_this_hour:
            # Reset Diario Local para el item
            if item.get('day_tracking') != today_date:
                item['enviados_hoy'] = 0
                item['day_tracking'] = today_date
                changes = True
            
            # Verificar L├¡mite Diario GLOBAL
            if global_today_count >= DAILY_LIMIT_GLOBAL:
                print(f"DEBUG: L├¡mite GLOBAL diario alcanzado ({global_today_count}/{DAILY_LIMIT_GLOBAL}).")
                break # Salimos del loop de procesamiento

            # Calcular tama├▒o del lote restante GLOBAL
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
                    log_system("success", f"Difusi├│n {item['hora']}: Lote enviado ({count} msgs). Offset: {item['offset']}. Total Hoy Global: {global_today_count}")
                    changes = True
                else:
                    # Si devuelve 0, asumimos que se acabaron los clientes
                    item['estado'] = f"completado ({item['offset']} total)"
                    log_system("success", f"Difusi├│n {item['hora']} FINALIZADA. Total: {item['offset']}")
                    changes = True
                    
            except Exception as e:
                log_system("error", f"Error en batch difusi├│n {item['hora']}: {e}")
    
    if changes:
        supabase_request("PATCH", "configuracion", params={"clave": "eq.difusiones_programadas_json"}, data={"valor": json.dumps(scheduled)})

def call_gemini_ai(prompt_sistema, client_name, api_key):
    if not api_key or not prompt_sistema:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt_usuario = f"Genera un mensaje de cumplea├▒os personalizado para {client_name}. Mant├®n el tono de Coach Titanus."
    
    system_rule = "REGLA CR├ìTICA: NO uses nombres propios reales. Usa SIEMPRE el placeholder {{Nombre}} para referirte al cliente. Ejemplo: '┬íHola {{Nombre}}!'."
    
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
    now = datetime.utcnow() - timedelta(hours=5)
    today_str = now.strftime("%Y-%m-%d")
    today_md = now.strftime("-%m-%d")
    
    conf = get_config_map()
    clients_to_notify = []

    if tipo_filtro == 'publicidad':
        params = {"or": "(estado.eq.activo,estado.is.null,estado.eq.vencido)", "select": "nombre,telefono"}
        if limit: params['limit'] = limit
        if offset: params['offset'] = offset
        res = supabase_request("GET", "clientes", params=params) or []
        for c in res: clients_to_notify.append({**c, 'tipo': 'publicidad'})
    else:
        # Bdays y Vencimientos
        params = {"or": "(estado.eq.activo,estado.is.null,estado.eq.vencido)", "select": "nombre,telefono,fecha_nacimiento"}
        res = supabase_request("GET", "clientes", params=params) or []
        for c in res:
            if c.get('fecha_nacimiento') and today_md in c['fecha_nacimiento']:
                clients_to_notify.append({**c, 'tipo': 'cumplea├▒os'})
        
        # Vencimientos (Ma├▒ana)
        tom = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        v_res = supabase_request("GET", "clientes", params={"estado": "eq.activo", "fecha_vencimiento": f"eq.{tom}", "select": "nombre,telefono,fecha_vencimiento"}) or []
        for c in v_res: clients_to_notify.append({**c, 'tipo': 'vencimiento', 'extra': c.get('fecha_vencimiento')})

    enqueued = 0
    # Prioridad: custom_img > config global
    img_publicidad = custom_img if custom_img else (conf.get("publicidad_imagen") if tipo_filtro == 'publicidad' else None)

    for cl in clients_to_notify:
        # BLOQUEO DIARIO ELIMINADO PARA PRUEBAS - Siempre encola
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
            
        if supabase_request("POST", "cola_mensajes", data=payload):
            log_system("info", f"Ô×ò Encolado: {cl['nombre']} ({cl['tipo']})")
            enqueued += 1

    return enqueued

def generate_message_content(cl, conf, custom_msg=None):
    tipo = cl['tipo']
    
    # 1. Definir claves seg├║n el Dashboard
    # 'prompt_tipo' -> Instrucciones para IA
    # 'prompt_tipo_static' -> Mensaje Fijo
    key_base = "prompt_cumpleanios" if tipo == 'cumplea├▒os' else f"prompt_{tipo}"
    key_static = f"{key_base}_static"
    
    prompt_ia = conf.get(key_base, "")
    # Si viene un mensaje personalizado (desde programaci├│n), usarlo. Si no, usar el del config.
    mensaje_fijo = custom_msg if custom_msg else conf.get(key_static, f"┬íHola {{{{Nombre}}}}!")
    
    # 2. Verificar Modo
    # Para cumplea├▒os, leemos 'modo_mensaje_cumple'. Para otros, asumimos 'Fijo' o lo que diga el config si existiera.
    modo_ia = False
    if tipo == 'cumplea├▒os':
        modo_ia = conf.get("modo_mensaje_cumple", "Fijo") == "IA"
    
    # 3. MODO IA: Usar prompt_ia como instrucciones para Gemini
    mensaje_crudo = ""
    if modo_ia:
        print(f"DEBUG: Modo IA activado para {cl['nombre']}")
        gemini_key = conf.get("gemini_api_key")
        
        if gemini_key and prompt_ia:
            ai_msg = call_gemini_ai(prompt_ia, cl['nombre'], gemini_key)
            if ai_msg:
                print(f"DEBUG: Ô£à Mensaje IA generado")
                mensaje_crudo = ai_msg
            else:
                print(f"DEBUG: ÔÜá´©Å IA fall├│, usando mensaje fijo")
                mensaje_crudo = mensaje_fijo
        else:
            print(f"DEBUG: ÔÜá´©Å Sin API key o Prompt vacio, usando mensaje fijo")
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
    p = {"estado": "eq.pendiente", "select": "*", "order": "id.asc", "limit": str(BATCH_SIZE)}
    if tipo: p["tipo"] = f"eq.{tipo}"
    else: p["tipo"] = "neq.log"
    
    pend = supabase_request("GET", "cola_mensajes", params=p) or []
    if not pend: return 0
    
    count = 0
    for m in pend:
        # LOG de inicio de env├¡o
        url_heartbeat = f"{SUPABASE_URL}/rest/v1/configuracion"
        print(f"DEBUG: Enviando a {m['nombre']} ({m['telefono']})...")
        
        ok, res = send_wa(m['telefono'], m['mensaje'])
        supabase_request("PATCH", "cola_mensajes", params={"id": f"eq.{m['id']}"}, data={"estado": "enviado" if ok else "error"})
        count += 1
        
        if count < len(pend):
            print(f"ÔÅ│ Esperando {DELAY_BETWEEN_MESSAGES}s para el pr├│ximo env├¡o...")
            time.sleep(DELAY_BETWEEN_MESSAGES)
    return count

def send_wa(num, text):
    clean = "".join(filter(str.isdigit, num))
    
    # L├│gica de env├¡o de medios optimizada
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
        print(f"DEBUG: Configuraci├│n cargada, llaves: {list(conf.keys())}")
    except Exception as e:
        print(f"ERROR: Fallo al cargar configuraci├│n: {e}")
        conf = {}

    target = conf.get("envio_hora", "08:00").strip()
    now_ec = datetime.utcnow() - timedelta(hours=5)
    now_str = now_ec.strftime("%H:%M")
    
    update_heartbeat()
    print(f"[{now_str}] ­ƒñû BOT ACTIVO | MODO: {mode} | TARGET: {target}")

    if mode in ["generator", "cron"]:
        print("DEBUG: Entrando a check_scheduled_broadcasts...")
        try:
            check_scheduled_broadcasts()
            print("DEBUG: Finaliz├│ check_scheduled_broadcasts")
        except Exception as e:
            print(f"ERROR en check_scheduled_broadcasts: {e}")

        print(f"DEBUG: Comparando {now_str} == {target}")
        
        # FIX: Validaci├│n estricta de hora para evitar repeticiones cada 5 minutos
        # Solo ejecuta si es el minuto exacto O si se fuerza manualmente
        if now_str == target or mode == "force":
            print(f"DEBUG: Ô£à ES LA HORA ({now_str}). Ejecutando generaci├│n...")
            try:
                generate_queue()
                print("DEBUG: Finaliz├│ generate_queue")
            except Exception as e:
                print(f"ERROR en generate_queue: {e}")
        else:
            print(f"DEBUG: ÔÅ│ No es la hora de env├¡o ({now_str} != {target}).")

    if mode in ["worker", "cron"]:
        print("DEBUG: Entrando a fase worker...")
        t_filtro = sys.argv[sys.argv.index("--type") + 1] if "--type" in sys.argv else None
        if mode == "cron" and not t_filtro:
            # FIX: Agregado 'publicidad' para que se env├¡en las difusiones programadas
            for t in ["cumplea├▒os", "vencimiento", "seguimiento", "publicidad"]: 
                print(f"DEBUG: Procesando lote para tipo: {t}")
                process_batch(tipo=t)
        else: 
            print(f"DEBUG: Procesando lote para tipo: {t_filtro}")
            process_batch(tipo=t_filtro)
    
    print("DEBUG: Ejecuci├│n completada.")
