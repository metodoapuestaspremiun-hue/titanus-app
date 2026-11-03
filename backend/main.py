import os
import sys
import threading
import time
from flask import Flask, jsonify

app = Flask(__name__)

def bot_loop():
    print("[BOT WORKER] Iniciando bucle en segundo plano de Titanus Bot...")
    bot_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bot', 'birthday_bot.py')
    while True:
        try:
            # Ejecuta el procesador de cola
            os.system(f"python \"{bot_path}\" worker")
        except Exception as e:
            print(f"[BOT ERROR]: {e}")
        time.sleep(60)

# Iniciar el bot en un hilo demonio paralelo
threading.Thread(target=bot_loop, daemon=True).start()

@app.route('/')
def home():
    return jsonify({
        "status": "online",
        "service": "Titanus Bot Worker Service",
        "timestamp": time.time()
    })

@app.route('/healthz')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
