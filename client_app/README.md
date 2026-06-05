# Game Zone — Sistema de Control y Bloqueo Client/Server

Este directorio contiene las herramientas en Python para desplegar el bloqueo físico de pantallas y la sincronización en tiempo real en tu local de videojuegos (LAN center / Cybercafé).

## Estructura de Archivos

1. **`server.py` (PC Administrador):** Servidor HTTP centralizado y ligero (sin dependencias). Administra el estado de todos los equipos y actúa como puente de sincronización con el panel web de React.
2. **`client.py` (PC de Juego / Clientes):** Aplicación de escritorio desarrollada en Python (`tkinter` + `ctypes`) que se instala en las PCs que se rentan. Bloquea el teclado y la pantalla completa hasta que se asigne tiempo de juego.
3. **`config.json` (PC de Juego / Clientes):** Archivo de configuración local que indica la IP del servidor administrador y el identificador de la PC cliente.

---

## Instrucciones de Instalación y Despliegue

### Paso 1: Configurar el Servidor en la PC Administrador

1. Copia el archivo `server.py` a la PC que utilizará el cajero/operador para controlar el local.
2. Inicia el servidor ejecutando en tu terminal/consola:
   ```bash
   python server.py
   ```
   *El servidor se iniciará en el puerto `5000` (http://localhost:5000).*

### Paso 2: Integrar el Panel Web con el Servidor

Al levantar la aplicación web de administración (React), esta se conectará automáticamente al servidor local (`http://localhost:5000`).
* Si el servidor está activo, los estados de las PCs se sincronizarán en tiempo real.
* Si el servidor está apagado, la aplicación web funcionará en modo offline con `localStorage` (sin alertar a los clientes).

### Paso 3: Configurar los Clientes en las PCs de Juego

Para cada computadora de juego del local:

1. Instala Python (versión 3.8 o superior) descargándolo de [python.org](https://www.python.org/downloads/).
   * **IMPORTANTE:** Durante la instalación de Python, asegúrate de marcar la casilla **"Add python.exe to PATH"**.
2. Copia los archivos `client.py` y `config.json` a un directorio en la PC del cliente (ej. `C:\GameZone\`).
3. Modifica el archivo `config.json` con los datos correspondientes:
   * **`server_ip`**: La dirección IP local de la PC del Administrador (ej. `192.168.1.100`).
   * **`pc_id`**: El identificador exacto de este equipo que fue registrado en la consola (ej. `PC-01`, `PC-02`).
4. Ejecuta el cliente de bloqueo:
   ```bash
   python client.py
   ```

---

## Características de Seguridad del Cliente

* **Hook de Teclado de Bajo Nivel:** Bloquea de forma nativa en Windows combinaciones que evaden sistemas de bloqueo estándar, como `Alt+Tab`, la `Tecla Windows`, `Alt+Esc`, `Ctrl+Esc`, y `Alt+F4`.
* **Supervisión de Foco:** Si el usuario presiona `Ctrl+Alt+Del` y abre el administrador de tareas u otra ventana del sistema, el Locker recuperará el foco del mouse y el teclado y volverá al frente en menos de 500ms.
* **Bloqueo Inteligente por Desconexión:** Si se interrumpe la conexión de red local con el servidor de administración, el cliente se bloqueará de forma inmediata bajo el mensaje "SIN CONEXIÓN" para evitar que se juegue desconectando el cable de red.
* **Cronómetro Flotante:** Cuando la PC está "En Uso", el locker se oculta y despliega un widget flotante semi-transparente en la esquina superior derecha que le indica al jugador de forma elegante su tiempo disponible restante.
