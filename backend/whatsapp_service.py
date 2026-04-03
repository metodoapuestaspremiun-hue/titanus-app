import requests
import time
from config import Config

class WhatsAppService:
    def __init__(self):
        # Enforce IPv4 (127.0.0.1) instead of 'localhost' to avoid IPv6 resolution hangs
        url = Config.EVOLUTION_API_URL or "http://127.0.0.1:8080"
        self.url = url.replace("localhost", "127.0.0.1")
        self.token = Config.EVOLUTION_API_TOKEN
        self.instance = Config.EVOLUTION_INSTANCE_NAME

    def get_status(self):
        """Checks if the instance is connected to WhatsApp."""
        if not all([self.url, self.token, self.instance]):
            return "DISCONNECTED (No Config)"
        
        endpoint = f"{self.url.rstrip('/')}/instance/connectionState/{self.instance}"
        headers = {"apikey": self.token}
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get("instance", {}).get("state", "UNKNOWN")
            return "DISCONNECTED"
        except Exception:
            return "ERROR"

    def create_instance(self):
        """Creates the instance in Evolution API if it doesn't exist."""
        endpoint = f"{self.url.rstrip('/')}/instance/create"
        headers = {
            "apikey": self.token,
            "Content-Type": "application/json"
        }
        payload = {
            "instanceName": self.instance,
            "token": self.token,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS"
        }
        
        print(f"DEBUG: Intentando crear instancia '{self.instance}'...")
        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=15)
            print(f"DEBUG: Respuesta create_instance: {response.status_code} - {response.text}")
            return response.status_code in [200, 201]
        except Exception as e:
            print(f"DEBUG: Error en create_instance: {e}")
            return False


    def get_qr(self):
        """Fetches the QR code (base64) from Evolution API."""
        endpoint = f"{self.url.rstrip('/')}/instance/connect/{self.instance}"
        headers = {"apikey": self.token}
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            
            # If instance not found (404), try to create it
            if response.status_code == 404:
                if self.create_instance():
                    time.sleep(2) # Wait for initialization
                    response = requests.get(endpoint, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("base64")
            return None
        except Exception:
            return None

    def send_message(self, number, text):
        """
        Sends a text message via Evolution API with improved handling and logging.
        """
        if not all([self.url, self.token, self.instance]):
            return False

        number = number.replace("+", "").strip()
        
        endpoint = f"{self.url.rstrip('/')}/message/sendText/{self.instance}"
        headers = {
            "apikey": self.token,
            "Content-Type": "application/json"
        }
        payload = {
            "number": number,
            "text": text
        }

        try:
            # Increase timeout and handle the response body
            response = requests.post(endpoint, json=payload, headers=headers, timeout=20)
            if response.status_code in [200, 201]:
                return True
            else:
                print(f"DEBUG: Error enviando a {number}: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.Timeout:
            print(f"DEBUG: Timeout enviando mensaje a {number}")
            return False
        except Exception as e:
            print(f"DEBUG: Error cr├¡tico enviando mensaje a {number}: {e}")
            return False


    def wait(self):
        """Wait between messages with a small randomized buffer."""
        import random
        base_delay = Config.DELAY
        total_delay = base_delay + random.randint(5, 15)
        print(f"Delay inteligente: {total_delay} segundos...")
        time.sleep(total_delay)

if __name__ == "__main__":
    # Test (requires .env)
    ws = WhatsAppService()
    # ws.send_message("593900000000", "Prueba de Gimnasio-Core")
