# Game Zone — Sistema de Gestión y Control Completo 

Este documento detalla exhaustivamente las funcionalidades, arquitectura, tecnología y flujos de trabajo del ecosistema **Game Zone**, un sistema integrado de administración para salas de videojuegos Modernos. El sistema permite el control contable, venta de inventario, registro de auditoría, gestión de turnos de operadores y bloqueo físico y lógico de equipos en tiempo real.

---

## 1. Arquitectura del Sistema

El ecosistema de Game Zone se divide en tres componentes principales:

```mermaid
graph TD
    A[Panel Web React - Frontend] <-->|API REST / JSON| B[Servidor API Node.js / Express]
    B <-->|PostgreSQL Pool| C[(Base de Datos - Supabase / Local)]
    D[Locker Cliente Python] <-->|Sincronización Local HTTP| E[Servidor Puente Local Python - server.py]
    A <-->|Control Remoto de Equipos| E
```

1. **Panel de Control Web (Frontend):** Desarrollado en **React, TypeScript y Vite**. Ofrece una interfaz premium con diseño ciberpunk de vidrio esmerilado (*glassmorphism*), animaciones fluidas y soporte responsivo para móviles.
2. **Servidor API Central (Backend):** Desarrollado en **Node.js y Express**. Administra la base de datos centralizada (PostgreSQL), la lógica de autenticación de usuarios, auditoría, facturación y la actualización automática en segundo plano del tiempo restante de los clientes.
3. **Control y Bloqueo Físico (Locker local en Python):**
   - **`server.py`:** Un servidor local ligero que actúa como puente local entre el panel web de administración y las computadoras de juego.
   - **`client.py`:** Un cliente de escritorio instalado en cada equipo del cliente. Bloquea el teclado, mouse y pantalla de Windows nativamente hasta que se le asigne tiempo desde el panel web de administración.

---

## 2. Tecnologías y Librerías Utilizadas

### Frontend
- **React 19 & TypeScript:** Estructuración robusta y tipado estricto.
- **Vite:** Herramienta de compilación ultrarrápida.
- **Recharts:** Renderizado interactivo de gráficos financieros (Líneas, Barras y Pastel).
- **Lucide React:** Iconografía moderna y consistente.
- **Vanilla CSS (Variables y Media Queries):** Sistema de diseño premium adaptativo a resoluciones móviles y de escritorio.

### Backend
- **Express (Node.js):** Creación de endpoints de API REST.
- **PostgreSQL (`pg` pool):** Almacenamiento persistente y relacional.
- **BcryptJS:** Encriptación segura de contraseñas de personal.
- **CORS & Dotenv:** Configuración de seguridad y variables de entorno.

### Lockers Locales (Python)
- **Tkinter:** Renderizado de la pantalla completa de bloqueo y widgets flotantes.
- **Ctypes / Win32 API:** Acceso de bajo nivel al sistema operativo Windows para capturar pulsaciones de teclas críticas.
- **Socket / HTTP Server (librerías nativas):** Mecanismo de control y comunicación entre terminales sin dependencias pesadas.

---

## 3. Módulos y Funcionalidades del Sistema Web

El panel de administración web se organiza en módulos especializados:

### A. Dashboard Financiero (Reportes y Consolidados)
Módulo exclusivo para administradores y encargados que ofrece una perspectiva contable detallada en tiempo real:
- **Tarjetas de Métricas:**
  - **Ingresos USD:** Muestra la suma total de cobros validados en dólares y su equivalente en Bolívares (VES) basado en la tasa del Banco Central de Venezuela (BCV).
  - **Ingresos VES:** Suma total cobrada en Bolívares y su equivalencia en dólares.
  - **Equipos Activos:** Cantidad de computadoras "En Uso" versus el total de equipos en tiempo real.
  - **Pagos por Validar:** Contador de notificaciones pendientes que requieren aprobación del administrador.
  - **Alertas de Inventario Bajo:** Indicador visual si existen productos próximos a agotarse.
- **Gráficos Estadísticos:**
  - *Historial de Ingresos de la Semana:* Gráfico de áreas comparativo de ingresos diarios (USD vs VES).
  - *Métodos de Pago:* Distribución porcentual en un gráfico circular de los métodos más utilizados (Efectivo $, Pago Móvil, Punto de Venta, etc.).
  - *Rendimiento Financiero por Equipo:* Gráfico de barras indicando qué computadoras o consolas han generado mayores ingresos en el período seleccionado.
- **Historial de Cierre de Cajas:** Tabla que consolida los reportes de turnos finalizados por los operadores, con opción de imprimir reportes directos en PDF.

### B. Consola de Control de PCs (PCConsole)
El centro de mando interactivo en tiempo real para el control de los equipos rentados:
- **Estados de los Equipos:**
  - **Disponible:** Equipo libre para ser asignado. Barra lateral verde.
  - **En Uso:** Equipo con tiempo activo. Muestra un temporizador regresivo de alta precisión, nombre del cliente y barra lateral cian.
  - **Bloqueada:** El tiempo ha expirado. El equipo se bloquea de inmediato de forma remota. Barra lateral roja con animación de alerta.
  - **Suspendida:** Equipo temporalmente fuera de servicio. Barra lateral amarilla.
- **Acciones y Controles:**
  - **Asignar Tiempo:** Permite asignar minutos libres, planes preconfigurados (ej. 1 hora, 2 horas) o tiempo libre (post-pago).
  - **Pausar / Reanudar:** Detiene temporalmente el temporizador de una PC y bloquea su pantalla sin perder los minutos acumulados.
  - **Trasladar PC:** Permite transferir la sesión activa y el tiempo restante de un jugador a otro equipo de forma instantánea.
  - **Agregar Tiempo:** Sumar minutos adicionales a una sesión que ya se encuentra en uso.
  - **Apagado / Reinicio Remoto:** Envía comandos directos al locker del cliente para apagar o reiniciar el sistema operativo.
  - **Finalizar Sesión (Cobro):** Calcula automáticamente el saldo a pagar en base al tiempo consumido y permite facturar el consumo del juego junto a ventas del inventario.

### C. Caja y Pagos (Payments)
Módulo centralizado para el manejo del flujo de caja diario:
- **Flujo de Validación de Pagos:**
  - Cuando un operador registra un pago (manual o por cobro de juego), queda en estado **Pendiente**.
  - Si el pago tiene un capture de pantalla (Base64 almacenado), los administradores pueden visualizar la imagen de la transferencia usando el visor integrado (*Receipt Visor*).
  - El administrador puede **Validar** o **Rechazar** la transacción.
- **Pestañas de Trabajo:**
  - *Caja Activa:* Muestra los pagos pendientes del turno actual que esperan validación.
  - *En Revisión:* Pagos de turnos que ya fueron cerrados por operadores y que están pendientes de auditoría del administrador.
  - *Historial:* Registro completo de transacciones validadas, rechazadas e históricas.
  - *Cierres de Caja:* Archivo de cierres de caja consolidados.
- **Buscador y Filtros Avanzados:** Permite filtrar transacciones por operador, método de pago, rango de fecha y búsqueda de texto (referencia o ID).
- **Exportaciones y Reportes:**
  - Exportación de listados filtrados a formato **CSV** compatible con Excel.
  - Generación de reportes limpios listos para imprimir en **PDF**.
  - Emisión de **tickets de impresión térmica (80mm)** para cierres de caja detallando el desglose exacto de efectivo $, efectivo Bs., pago móvil, punto de venta y transferencias.
- **Responsive Toggle (Vista Móvil):** La sección de consolidados por consola se contrae automáticamente en pantallas móviles, ofreciendo una flecha de despliegue para optimizar el espacio visual.

### D. Inventario y Ventas (Inventory)
Control de productos complementarios (snacks, bebidas, accesorios):
- **Catálogo de Productos:** Registro de nombre, categoría, precio de compra, precio de venta (USD/VES) y cantidades.
- **Control de Stock Mínimo:** Alertas automáticas cuando un artículo está por debajo del stock mínimo de seguridad.
- **Historial de Movimientos (Logs):** Registro detallado de entradas y salidas de inventario. Cada vez que se añade mercancía o se realiza una venta, se registra la cantidad, fecha, motivo de modificación y el nombre del operador responsable.

### E. Tipos de Consola (Console Types)
Administración de las categorías de los equipos del local:
- Permite categorizar entre PCs Gamer, PS5, Xbox Series X, Simuladores de Manejo, Nintendo Switch, etc.
- Permite definir tarifas de cobro por hora diferenciadas por categoría y emojis personalizados para su representación visual.

### F. Planes de Tiempo (Plans)
Definición de las ofertas comerciales para los clientes:
- Configuración de planes por tiempo fijo (ej. 30 minutos, 1 hora, 3 horas, combos especiales).
- Definición de tarifas fijas promocionales por plan para automatizar la asignación rápida en la consola de control.

### G. Credenciales (Credentials)
Un baúl digital seguro dentro del sistema para que el personal autorizado pueda consultar de forma ágil datos de acceso locales (ej. cuentas de juegos como Steam, Epic Games, claves de router, consolas o cuentas administrativas).

### H. Personal (Staff)
Gestión del equipo de trabajo y seguridad:
- Registro de usuarios con asignación de roles y estados (Activo / Inactivo).
- **Roles y Permisos:**
  - **Administrador (Admin):** Acceso total a finanzas, gráficos, validación de pagos, edición de inventario, edición de personal y configuraciones globales.
  - **Encargado:** Visualización de logs, exportaciones de PDFs y administración operativa de PCs e inventarios. No puede borrar registros críticos.
  - **Operador:** Limitado exclusivamente al panel de control de PCs, cobros manuales y cierre de caja de su propio turno. No tiene acceso a los reportes financieros del Dashboard ni a las auditorías globales del personal.

### I. Historial de Auditoría (Audit Logs)
Bitácora de seguridad que registra cada acción realizada en el sistema. Registra el usuario ejecutor, su rol, la acción (ej. inicio de sesión, asignación de tiempo, venta de inventario, validación de pago), detalles de la acción y el nivel de prioridad (Éxito, Advertencia o Error).

---

## 4. Control de Bloqueo Local (Scripting Python)

Para aplicar el bloqueo físico de las computadoras que se alquilan a los clientes, se utiliza la suite en Python de bajo nivel que interactúa de la siguiente forma:

### El Cliente de Bloqueo (`client.py`)
- **Bloqueo del Teclado (Hooks de Windows):** Utiliza funciones de la API nativa de Windows (`ctypes`) para inyectar un hook de teclado a nivel de kernel. Esto intercepta y anula combinaciones de teclas que permitirían saltarse el bloqueo (como `Alt+Tab`, la `Tecla Windows`, `Alt+Esc`, `Alt+F4`, `Ctrl+Esc`).
- **Supervisión Continua de Foco:** Si un usuario intenta usar combinaciones protegidas por el hardware (como `Ctrl+Alt+Supr`) para abrir el Administrador de Tareas, el programa detecta en menos de 500 milisegundos que el software de bloqueo perdió el foco y lo restablece inmediatamente al frente, bloqueando nuevamente la pantalla.
- **Detección de Desconexión de Red:** El cliente realiza peticiones periódicas (*ping*) al servidor del administrador local. Si el cable de red es desconectado o se pierde la comunicación, el cliente bloquea la pantalla automáticamente bajo el estado "SIN CONEXIÓN" para evitar jugadas gratis desconectando el cable de red.
- **Cronómetro Flotante:** Una vez que la PC es desbloqueada desde el administrador, el programa oculta la pantalla de bloqueo y genera un widget flotante, semitransparente e interactivo en la esquina superior derecha, que le indica al usuario en tiempo real el tiempo restante de su sesión.

### Servidor Local (`server.py`)
- Actúa como el puente local (HTTP API en puerto `5000`) en la PC de administración.
- Recibe peticiones del panel web de React y envía las órdenes de bloqueo/desbloqueo a las direcciones IP locales de los clientes correspondientes.

---

## 5. Instrucciones de Despliegue y Ejecución

### Requisitos Previos
- **Node.js** v18 o superior instalado.
- **PostgreSQL** (base de datos relacional corriendo localmente o en un servicio cloud como Supabase).
- **Python** 3.8 o superior (con privilegios de Administrador en las PCs clientes de Windows).

### Configuración del Backend e Inicialización de la base de datos
1. Configura el archivo `.env` en la raíz del proyecto con tus credenciales de PostgreSQL:
   ```env
   DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_db
   PORT=5000
   ```
2. Ejecuta el servidor Node en modo de desarrollo o producción:
   ```bash
   npm install
   npm run start
   ```
   *El servidor inicializará automáticamente el esquema de base de datos (`initDatabase`) e iniciará el ciclo temporizador que descuenta los segundos en segundo plano.*

### Configuración del Frontend
1. Instala las dependencias del frontend:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
3. Construye el bundle optimizado para producción:
   ```bash
   npm run build
   ```

### Despliegue en las PCs de Clientes (Locker)
1. Instala Python en la PC cliente asegurándote de activar la opción **"Add python.exe to PATH"**.
2. Copia la carpeta `client_app` en la PC (ej: `C:\GameZone\`).
3. Modifica el archivo `config.json` especificando la dirección IP local de la computadora del Administrador:
   ```json
   {
     "server_ip": "192.168.1.100",
     "pc_id": "PC-01"
   }
   ```
4. Ejecuta el script `client.py` con permisos de administrador en Windows.
5. *(Opcional)* Puedes configurar el script de inicio `IniciarCliente.vbs` dentro de la carpeta de inicio de Windows para que el locker se levante automáticamente al encender el computador.
