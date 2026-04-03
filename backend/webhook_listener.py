from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        print("\n\n--- WEBHOOK RECEIVED ---")
        try:
            data = json.loads(post_data.decode('utf-8'))
            print(json.dumps(data, indent=2))
            
            if 'qrcode' in data:
                print("\n!!! QR CODE FOUND (qrcode field) !!!")
                print(data['qrcode'].get('base64', 'No base64 found'))
            elif 'base64' in data:
                 print("\n!!! QR CODE FOUND (base64 field) !!!")
                 print(data['base64'])
            elif 'data' in data and 'qrcode' in data['data']:
                 print("\n!!! QR CODE FOUND (data.qrcode field) !!!")
                 print(data['data']['qrcode'].get('base64', 'No base64 found'))
                 
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print("Raw Data:", post_data.decode('utf-8'))
            
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    server_address = ('', 9000)
    print("Starting webhook listener on port 9000...")
    httpd = HTTPServer(server_address, WebhookHandler)
    httpd.serve_forever()
