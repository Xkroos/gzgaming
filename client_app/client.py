import tkinter as tk
import json
import os
import time
import urllib.request
import urllib.error
import threading
import ctypes
from ctypes import wintypes

CONFIG_FILE = "config.json"
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# Keyboard Hook Constants & Globals
WH_KEYBOARD_LL = 13
keyboard_hook = None
hook_thread = None
hook_active = False

class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_ulonglong)
    ]

# Callback to intercept system hotkeys (Alt+Tab, WinKey, Alt+F4, Ctrl+Esc, etc.)
def keyboard_hook_proc(nCode, wParam, lParam):
    if nCode == 0:  # HC_ACTION = 0
        kbd = KBDLLHOOKSTRUCT.from_address(lParam)
        vk = kbd.vkCode
        alt_pressed = (kbd.flags & 0x20) != 0
        
        # Block Alt + Tab
        if vk == 9 and alt_pressed:
            return 1
        # Block Alt + Esc
        if vk == 27 and alt_pressed:
            return 1
        # Block Windows Keys (Left Win: 91, Right Win: 92)
        if vk in [91, 92]:
            return 1
        # Block Ctrl + Esc
        ctrl_pressed = (user32.GetKeyState(162) & 0x8000) or (user32.GetKeyState(163) & 0x8000)
        if vk == 27 and ctrl_pressed:
            return 1
        # Block Alt + F4
        if vk == 115 and alt_pressed:
            return 1
            
    return user32.CallNextHookEx(keyboard_hook, nCode, wParam, lParam)

HOOKPROC = ctypes.WINFUNCTYPE(ctypes.c_longlong, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)
hook_callback = HOOKPROC(keyboard_hook_proc)

def hook_loop():
    global keyboard_hook, hook_active
    keyboard_hook = user32.SetWindowsHookExW(WH_KEYBOARD_LL, hook_callback, kernel32.GetModuleHandleW(None), 0)
    if not keyboard_hook:
        print("Error: Could not install keyboard hook.")
        hook_active = False
        return
        
    hook_active = True
    msg = wintypes.MSG()
    while hook_active and user32.GetMessageW(ctypes.byref(msg), 0, 0, 0) != 0:
        user32.TranslateMessage(ctypes.byref(msg))
        user32.DispatchMessageW(ctypes.byref(msg))
        
    if keyboard_hook:
        user32.UnhookWindowsHookEx(keyboard_hook)
        keyboard_hook = None

def start_system_lock():
    global hook_thread, hook_active
    if hook_active:
        return
    hook_thread = threading.Thread(target=hook_loop, daemon=True)
    hook_thread.start()

def stop_system_lock():
    global hook_active, hook_thread
    if not hook_active:
        return
    hook_active = False
    if hook_thread:
        user32.PostThreadMessageW(hook_thread.ident, 0, 0, 0)

class GameZoneClientApp:
    def __init__(self):
        self.load_config()
        self.pc_status = "offline"
        self.remaining_time = 0
        self.client_name = ""
        self.hourly_rate = 2.00
        
        # Setup GUI Window (Main Lock Screen)
        self.root = tk.Tk()
        self.root.title("Game Zone Client Locker")
        self.root.configure(bg="#07090e")
        self.root.overrideredirect(True) # Remove title bar
        self.root.attributes("-topmost", True) # Keep on top
        
        # Prevent default exit shortcuts inside Tkinter
        self.root.protocol("WM_DELETE_WINDOW", lambda: None)
        self.root.bind("<Alt-Key-F4>", lambda e: "break")
        
        # Center coordinates
        self.screen_w = self.root.winfo_screenwidth()
        self.screen_h = self.root.winfo_screenheight()
        self.root.geometry(f"{self.screen_w}x{self.screen_h}+0+0")
        
        # Canvas for premium background glow
        self.canvas = tk.Canvas(self.root, width=self.screen_w, height=self.screen_h, bg="#07090e", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        
        # Create UI Elements on Canvas
        self.draw_lock_screen_design()
        
        # Floating window for Active Session Timer
        self.timer_window = tk.Toplevel(self.root)
        self.timer_window.overrideredirect(True)
        self.timer_window.attributes("-topmost", True)
        self.timer_window.attributes("-alpha", 0.85) # Glassmorphism effect
        self.timer_window.configure(bg="#0d0f1a")
        
        # Geometry for top-right corner floating overlay
        self.timer_window.geometry(f"200x50+{self.screen_w - 220}+20")
        self.timer_lbl = tk.Label(
            self.timer_window, 
            text="00:00:00", 
            font=("Consolas", 16, "bold"), 
            bg="#0d0f1a", 
            fg="#00f0ff"
        )
        self.timer_lbl.pack(expand=True, fill="both", padx=10, pady=5)
        self.timer_window.withdraw() # Hide by default
        
        # Bind events
        self.root.bind("<FocusOut>", self.on_focus_loss)
        
        # Start background polling and focus loop
        self.is_running = True
        self.poll_server()
        self.keep_topmost_loop()
        
    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    cfg = json.load(f)
                    self.server_ip = cfg.get("server_ip", "localhost")
                    self.pc_id = cfg.get("pc_id", "PC-01")
                    return
            except Exception as e:
                print(f"Error reading config: {e}")
        self.server_ip = "localhost"
        self.pc_id = "PC-01"
        # Write default if not found
        with open(CONFIG_FILE, "w") as f:
            json.dump({"server_ip": "localhost", "pc_id": "PC-01"}, f, indent=2)

    def draw_lock_screen_design(self):
        # Radial lines/mesh to look premium
        cx, cy = self.screen_w // 2, self.screen_h // 2
        
        # Decorative neon orbs
        self.canvas.create_oval(cx - 300, cy - 300, cx + 300, cy + 300, outline="#1b0e2b", width=2)
        self.canvas.create_oval(cx - 200, cy - 200, cx + 200, cy + 200, outline="#082330", width=1)
        
        # Game Zone Title
        self.title_text = self.canvas.create_text(
            cx, cy - 140, 
            text="GAME ZONE", 
            font=("Segoe UI", 48, "bold"), 
            fill="#00f0ff"
        )
        
        # Status Label
        self.status_text = self.canvas.create_text(
            cx, cy - 60, 
            text="CARGANDO ESTADO...", 
            font=("Segoe UI", 24, "bold"), 
            fill="#ffffff"
        )
        
        # Subtitle / Instructions Box
        self.msg_text = self.canvas.create_text(
            cx, cy + 10, 
            text="Estableciendo conexión con el servidor administrativo.", 
            font=("Segoe UI", 13), 
            fill="#a0a5c0",
            width=600,
            justify="center"
        )
        
        # Terminal metadata footer
        self.info_text = self.canvas.create_text(
            cx, self.screen_h - 60, 
            text=f"TERMINAL: {self.pc_id} | Servidor: {self.server_ip} | Game Zone OS Client v1.0", 
            font=("Consolas", 10), 
            fill="#404560"
        )

    def update_ui(self):
        cx = self.screen_w // 2
        
        # Update UI based on states
        if self.pc_status == "offline":
            self.canvas.itemconfig(self.status_text, text="⚠️ SIN CONEXIÓN", fill="#ff3366")
            self.canvas.itemconfig(self.msg_text, text="No se pudo contactar al servidor de la taquilla. Por favor notifica al operador de inmediato.", fill="#a0a5c0")
            self.show_locker()
            start_system_lock()
            
        elif self.pc_status == "Disponible":
            self.canvas.itemconfig(self.status_text, text="🎮 DISPONIBLE", fill="#39ff14")
            self.canvas.itemconfig(self.msg_text, text="Terminal libre. Solicita tu ticket de tiempo de juego en la taquilla central de Game Zone indicando este número de equipo.", fill="#a0a5c0")
            self.show_locker()
            start_system_lock()
            
        elif self.pc_status == "Bloqueada":
            self.canvas.itemconfig(self.status_text, text="⏰ TIEMPO EXPIRADO", fill="#ff3366")
            self.canvas.itemconfig(self.msg_text, text="Tu tiempo de juego ha terminado. Favor dirigirte a la taquilla para recargar saldo a tu cuenta.", fill="#ffb0c0")
            self.show_locker()
            start_system_lock()
            
        elif self.pc_status == "Suspendida":
            self.canvas.itemconfig(self.status_text, text="⏸️ SESIÓN EN PAUSA", fill="#ffcc00")
            self.canvas.itemconfig(self.msg_text, text="El operador de caja ha suspendido tu sesión temporalmente. Espera indicaciones o consulta en taquilla.", fill="#a0a5c0")
            self.show_locker()
            start_system_lock()
            
        elif self.pc_status == "En Uso":
            self.hide_locker()
            stop_system_lock()
            formatted_time = self.format_time(self.remaining_time)
            self.timer_lbl.configure(text=f"⏱️ {formatted_time}")
            
    def show_locker(self):
        # Un-minimize and maximize main window
        self.root.deiconify()
        self.root.attributes("-topmost", True)
        self.timer_window.withdraw()
        
    def hide_locker(self):
        # Minimize/hide lock screen, and show small floating overlay
        self.root.withdraw()
        self.timer_window.deiconify()
        self.timer_window.attributes("-topmost", True)

    def format_time(self, total_seconds):
        if total_seconds <= 0:
            return "00:00:00"
        hrs = total_seconds // 3600
        mins = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"

    def on_focus_loss(self, event=None):
        # Reinforce always on top and focus if screen is locked
        if self.pc_status != "En Uso" and self.pc_status != "unlocked":
            self.root.after(10, self.grab_focus)
            
    def grab_focus(self):
        self.root.focus_force()
        self.root.attributes("-topmost", True)

    def keep_topmost_loop(self):
        # Loop every 500ms to enforce focus and always-on-top attributes
        if self.is_running:
            if self.pc_status != "En Uso":
                self.grab_focus()
            else:
                self.timer_window.attributes("-topmost", True)
            self.root.after(500, self.keep_topmost_loop)

    def poll_server(self):
        if not self.is_running:
            return
            
        def do_request():
            url = f"http://{self.server_ip}:5000/api/pcs/{self.pc_id}"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "GameZone-Client"})
                with urllib.request.urlopen(req, timeout=1.5) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode("utf-8"))
                        self.pc_status = data.get("status", "Disponible")
                        self.remaining_time = data.get("remainingTime", 0)
                        self.client_name = data.get("clientName", "")
                        self.hourly_rate = data.get("hourlyRate", 2.00)
            except Exception as e:
                # Connection dropped
                self.pc_status = "offline"
                self.remaining_time = 0
            
            # Dispatch update in main thread
            self.root.after(0, self.update_ui)
            
        # Spawn request in thread to avoid GUI lag
        threading.Thread(target=do_request, daemon=True).start()
        # Repeat every 2 seconds
        self.root.after(2000, self.poll_server)

    def clean_exit(self):
        self.is_running = False
        stop_system_lock()
        self.root.destroy()

if __name__ == "__main__":
    print(f"Starting Game Zone OS Client Locker...")
    app = GameZoneClientApp()
    try:
        app.root.mainloop()
    except KeyboardInterrupt:
        app.clean_exit()
