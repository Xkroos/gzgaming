import http.server
import socketserver
import json
import os

PORT = 5000
DATA_FILE = "pcs.json"

def read_pcs():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {DATA_FILE}: {e}")
        return []

def write_pcs(pcs):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(pcs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error writing to {DATA_FILE}: {e}")

class PCRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to all responses
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        # Handshake for CORS preflight request
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # 1. API: Get all PCs
        if self.path == "/api/pcs":
            pcs = read_pcs()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(pcs, ensure_ascii=False).encode("utf-8"))
            return

        # 2. API: Get status of a single PC (e.g., /api/pcs/PC-01)
        if self.path.startswith("/api/pcs/"):
            pc_id = self.path[len("/api/pcs/"):]
            pcs = read_pcs()
            pc = next((p for p in pcs if p["id"].upper() == pc_id.upper()), None)
            
            if pc:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps(pc, ensure_ascii=False).encode("utf-8"))
            else:
                self.send_response(404)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "PC not found"}, ensure_ascii=False).encode("utf-8"))
            return

        # Fallback 404
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        # 1. API: Synchronize all PCs state
        if self.path == "/api/pcs":
            content_length = int(self.headers["Content-Length"])
            body = self.rfile.read(content_length)
            
            try:
                pcs = json.loads(body.decode("utf-8"))
                write_pcs(pcs)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode("utf-8"))
                print(f"Synced {len(pcs)} PCs successfully.")
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode("utf-8"))
            return

        # Fallback 404
        self.send_response(404)
        self.end_headers()

    # Disable default request log prints to console for cleaner stdout
    def log_message(self, format, *args):
        # print(format % args)
        pass

if __name__ == "__main__":
    print(f"Starting Game Zone sync server on http://localhost:{PORT}...")
    server = socketserver.TCPServer(("", PORT), PCRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("Server stopped.")
