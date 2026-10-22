import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import crypto from 'crypto';
import { initDatabase, pool } from './db.js';
import { setTuyaDeviceState } from './tuya.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://gamezonev3.netlify.app',
  'https://gamezoneg.netlify.app',
  'https://gzgaming-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://2.24.68.214',
  'https://gamezoneoficial.com',
  'https://www.gamezoneoficial.com',
  'http://gamezoneoficial.com',
  'http://www.gamezoneoficial.com'
];
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (ej. Postman, curl, mismo servidor)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para el origen: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Interceptor para imprimir errores >= 400 en la consola del servidor
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  const originalStatus = res.status;
  res.status = function (code) {
    if (code >= 400) {
      console.error(`[Server HTTP Error] ${req.method} ${req.originalUrl || req.url} - Status Code: ${code}`);
    }
    return originalStatus.apply(this, arguments);
  };

  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400 && body && body.error) {
      console.error(`[Server HTTP Error Details]:`, body.error);
    }
    return originalJson.apply(this, arguments);
  };

  next();
});

// ============================================================================
// BACKGROUND TICKER: DECREMENTAR TIEMPO DE JUEGO CADA SEGUNDO
// ============================================================================
function startGameTimer() {
  setInterval(async () => {
    if (!pool) return;

    try {
      // 1. Buscar todas las PCs en uso con tiempo restante > 0
      const activePcs = await pool.query(
        `SELECT id, remaining_time, tuya_device_id FROM pcs WHERE status = 'En Uso' AND remaining_time > 0`
      );

      for (const pc of activePcs.rows) {
        const newTime = pc.remaining_time - 1;

        if (newTime === 0) {
          // Bloquear PC
          await pool.query(
            `UPDATE pcs SET status = 'Bloqueada', remaining_time = 0 WHERE id = $1`,
            [pc.id]
          );

          if (pc.tuya_device_id) {
            setTuyaDeviceState(pc.tuya_device_id, false);
          }

          // Registrar en auditoría
          await pool.query(
            `INSERT INTO audit_logs (username, role, action, details, status)
             VALUES ('System', 'System', 'PC_LOCK', $1, 'Advertencia')`,
            [`El tiempo de juego en ${pc.id} llegó a 0. Pantalla bloqueada automáticamente.`]
          );

          console.log(`[Timer] PC ${pc.id} bloqueada por expiración de tiempo.`);
        } else {
          // Decrementar
          await pool.query(
            `UPDATE pcs SET remaining_time = $1 WHERE id = $2`,
            [newTime, pc.id]
          );
        }
      }
    } catch (err) {
      console.error('[Timer Error] Error en el ciclo del temporizador de juego:', err.message);
    }
  }, 1000);
}

// ============================================================================
// AUTENTICACIÓN (token firmado con HMAC-SHA256, sin dependencias externas)
// ============================================================================
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.AUTH_SECRET) {
  console.warn('[Auth] AUTH_SECRET no definido en .env. Se generó uno temporal: las sesiones se cerrarán al reiniciar el servidor.');
}
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Rutas públicas: login y consulta de estado de una PC (usada por el cliente de escritorio GameZoneClient)
function isPublicRoute(req) {
  const p = req.path;
  if (req.method === 'POST' && (p === '/auth/login' || p === '/api/auth/login')) return true;
  if (req.method === 'GET' && (/^\/pcs\/[^/]+$/.test(p) || /^\/api\/pcs\/[^/]+$/.test(p))) return true;
  return false;
}

app.use('/api', async (req, res, next) => {
  if (isPublicRoute(req)) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'No autenticado o sesión expirada' });
  }
  try {
    // Se consulta el usuario en cada petición para aplicar al instante cambios de rol o desactivaciones
    const r = await pool.query('SELECT id, username, full_name, role, status FROM users WHERE id = $1', [payload.id]);
    const u = r.rows[0];
    if (!u || u.status !== 'Activo') {
      return res.status(401).json({ error: 'Usuario inactivo o inexistente' });
    }
    req.user = { id: u.id, username: u.username, fullName: u.full_name, role: u.role };
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  }
  next();
};
const adminOnly = requireRole('Admin');
const managers = requireRole('Admin', 'Encargado');

async function auditLog(user, action, details, status = 'Éxito') {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, role, action, details, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [user?.id || null, user?.fullName || 'System', user?.role || 'System', action, details, status]
    );
  } catch (e) {
    console.error('[Audit] No se pudo registrar el evento:', e.message);
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. AUTH
app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) AND LOWER(status) = \'activo\'',
      [username]
    );
    if (result.rowCount === 0) {
      await auditLog(null, 'LOGIN_FAIL', `Intento de acceso fallido para el usuario: ${username}`, 'Fallo');
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const user = result.rows[0];
    let passwordMatch = false;
    try {
      passwordMatch = bcrypt.compareSync(password, user.password_hash);
    } catch {
      passwordMatch = false;
    }

    // Compatibilidad retroactiva: si la contraseña en base de datos era texto plano
    // se permite el acceso y se actualiza inmediatamente al hash seguro de bcrypt
    if (!passwordMatch && (password === user.password_hash || password.trim() === String(user.password_hash).trim())) {
      passwordMatch = true;
      try {
        const upgradeHash = bcrypt.hashSync(password, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgradeHash, user.id]);
        console.log(`[Auth] Contraseña en texto plano para '${user.username}' actualizada automáticamente a hash bcrypt.`);
      } catch (err) {
        console.error('[Auth] Error al actualizar hash de contraseña:', err.message);
      }
    }

    if (!passwordMatch) {
      await auditLog(null, 'LOGIN_FAIL', `Contraseña incorrecta para el usuario: ${username}`, 'Fallo');
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      token: signToken({ id: user.id })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. USERS (STAFF)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, full_name as "fullName", role, status, created_at as "createdAt"
      FROM users ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', adminOnly, async (req, res) => {
  const { fullName, role, password } = req.body;
  const username = String(req.body.username || '').trim();
  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'La contraseña es obligatoria (mínimo 4 caracteres)' });
  }
  try {
    const dup = await pool.query('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (dup.rowCount > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
    }
    const passHash = bcrypt.hashSync(String(password), 10);
    const result = await pool.query(`
      INSERT INTO users (username, password_hash, full_name, role, status)
      VALUES ($1, $2, $3, $4, 'Activo')
      RETURNING id, username, full_name as "fullName", role, status, created_at as "createdAt"
    `, [username, passHash, fullName, role]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  const { fullName, role, status, password } = req.body;
  if (id === req.user.id && (role !== 'Admin' || status !== 'Activo')) {
    return res.status(400).json({ error: 'No puedes quitarte el rol de Administrador ni desactivar tu propia cuenta' });
  }
  try {
    if (password) {
      const passHash = bcrypt.hashSync(password, 10);
      await pool.query(`
        UPDATE users SET full_name = $1, role = $2, status = $3, password_hash = $4
        WHERE id = $5
      `, [fullName, role, status, passHash, id]);
    } else {
      await pool.query(`
        UPDATE users SET full_name = $1, role = $2, status = $3
        WHERE id = $4
      `, [fullName, role, status, id]);
    }

    const result = await pool.query(`
      SELECT id, username, full_name as "fullName", role, status, created_at as "createdAt"
      FROM users WHERE id = $1
    `, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', adminOnly, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true, deleted: true });
  } catch (error) {
    // 23503: foreign_key_violation
    if (error.code === '23503') {
      await pool.query(`UPDATE users SET status = 'Inactivo' WHERE id = $1`, [id]);
      res.json({ success: true, deleted: false, message: 'El usuario tiene historial financiero y no puede ser eliminado por auditoría. Ha sido marcado como Inactivo.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 3. CONSOLE TYPES
app.get('/api/console-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, emoji, hourly_rate as "hourlyRate", is_active as "isActive"
      FROM console_types ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/console-types', managers, async (req, res) => {
  const { name, emoji, hourlyRate } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO console_types (name, emoji, hourly_rate, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, name, emoji, hourly_rate as "hourlyRate", is_active as "isActive"
    `, [name, emoji, hourlyRate]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/console-types/:id', managers, async (req, res) => {
  const { id } = req.params;
  const { name, emoji, hourlyRate, isActive } = req.body;
  try {
    const result = await pool.query(`
      UPDATE console_types 
      SET name = COALESCE($1, name), 
          emoji = COALESCE($2, emoji), 
          hourly_rate = COALESCE($3, hourly_rate), 
          is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING id, name, emoji, hourly_rate as "hourlyRate", is_active as "isActive"
    `, [name, emoji, hourlyRate, isActive, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/console-types/:id', managers, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM console_types WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. PCS
app.get('/api/pcs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, pc_name as "pcName", ip_address as "ipAddress", status, hourly_rate as "hourlyRate", 
             details, remaining_time as "remainingTime", total_assigned_time as "totalAssignedTime", 
             client_name as "clientName", current_session_id as "currentSessionId", console_type_id as "consoleTypeId", tuya_device_id as "tuyaDeviceId"
      FROM pcs ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pcs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT id, pc_name as "pcName", ip_address as "ipAddress", status, hourly_rate as "hourlyRate", 
             details, remaining_time as "remainingTime", total_assigned_time as "totalAssignedTime", 
             client_name as "clientName", current_session_id as "currentSessionId", console_type_id as "consoleTypeId", tuya_device_id as "tuyaDeviceId"
      FROM pcs WHERE UPPER(id) = UPPER($1)
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'PC no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sincronización Bulk (para el flujo actual del frontend en React)
app.post('/api/pcs', adminOnly, async (req, res) => {
  const pcsList = req.body;
  if (!Array.isArray(pcsList)) {
    return res.status(400).json({ error: 'El cuerpo debe ser un array de PCs' });
  }

  try {
    for (const pc of pcsList) {
      await pool.query(`
        UPDATE pcs 
        SET status = $1, 
            remaining_time = $2, 
            total_assigned_time = $3, 
            client_name = $4, 
            current_session_id = $5,
            hourly_rate = COALESCE($6, hourly_rate)
        WHERE id = $7
      `, [
        pc.status,
        pc.remainingTime || 0,
        pc.totalAssignedTime || 0,
        pc.clientName || null,
        pc.currentSessionId || null,
        pc.hourlyRate,
        pc.id
      ]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear, actualizar e individualmente borrar PCs
app.post('/api/pcs/create', managers, async (req, res) => {
  const { id, pcName, ipAddress, hourlyRate, details, consoleTypeId, tuyaDeviceId } = req.body;
  if (!id || !String(id).trim()) {
    return res.status(400).json({ error: 'El identificador del equipo es obligatorio' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO pcs (id, pc_name, ip_address, status, hourly_rate, details, console_type_id, remaining_time, total_assigned_time, tuya_device_id)
      VALUES ($1, $2, $3, 'Disponible', $4, $5, $6, 0, 0, $7)
      RETURNING id, pc_name as "pcName", ip_address as "ipAddress", status, hourly_rate as "hourlyRate", 
                details, remaining_time as "remainingTime", total_assigned_time as "totalAssignedTime", console_type_id as "consoleTypeId", tuya_device_id as "tuyaDeviceId"
    `, [String(id).trim().toUpperCase(), pcName, ipAddress, hourlyRate, details, consoleTypeId, tuyaDeviceId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un equipo con ese identificador' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pcs/:id', async (req, res) => {
  const { id } = req.params;
  const { pcName, ipAddress, hourlyRate, details, consoleTypeId, status, remainingTime, totalAssignedTime, clientName, currentSessionId, tuyaDeviceId } = req.body;
  // Los operadores solo pueden operar sesiones (estado/tiempo/cliente), no editar la configuración del equipo
  if (req.user.role === 'Operador' &&
      [pcName, ipAddress, hourlyRate, details, consoleTypeId, tuyaDeviceId].some(v => v !== undefined)) {
    return res.status(403).json({ error: 'No tienes permisos para modificar la configuración del equipo' });
  }
  try {
    const currentResult = await pool.query('SELECT status, tuya_device_id FROM pcs WHERE id = $1', [id]);
    const currentPc = currentResult.rows[0];
    if (!currentPc) {
      return res.status(404).json({ error: 'PC no encontrada' });
    }

    // Mantenemos tuyaDeviceId si se envía uno nuevo, o dejamos el existente si se envía null explícitamente y queremos borrar, pero lo usual es actualizarlo.
    // Usaremos tuyaDeviceId undefined para ignorar la actualización.
    
    // clientName / currentSessionId: si vienen explícitamente como null, se limpian (liberar PC);
    // si no vienen en el body (undefined), se conservan.
    const clearClient = clientName === null;
    const clearSession = currentSessionId === null;

    let queryArgs = [pcName, ipAddress, hourlyRate, details, consoleTypeId, status, remainingTime, totalAssignedTime, clientName, currentSessionId, clearClient, clearSession, id];
    let query = `
      UPDATE pcs 
      SET pc_name = COALESCE($1, pc_name),
          ip_address = COALESCE($2, ip_address),
          hourly_rate = COALESCE($3, hourly_rate),
          details = COALESCE($4, details),
          console_type_id = COALESCE($5, console_type_id),
          status = COALESCE($6, status),
          remaining_time = COALESCE($7, remaining_time),
          total_assigned_time = COALESCE($8, total_assigned_time),
          client_name = CASE WHEN $11::boolean THEN NULL ELSE COALESCE($9, client_name) END,
          current_session_id = CASE WHEN $12::boolean THEN NULL ELSE COALESCE($10, current_session_id) END
    `;

    if (tuyaDeviceId !== undefined) {
      queryArgs = [pcName, ipAddress, hourlyRate, details, consoleTypeId, status, remainingTime, totalAssignedTime, clientName, currentSessionId, clearClient, clearSession, tuyaDeviceId, id];
      query += `, tuya_device_id = $13 WHERE id = $14`;
    } else {
      query += ` WHERE id = $13`;
    }

    query += `
      RETURNING id, pc_name as "pcName", ip_address as "ipAddress", status, hourly_rate as "hourlyRate", 
                details, remaining_time as "remainingTime", total_assigned_time as "totalAssignedTime", 
                client_name as "clientName", current_session_id as "currentSessionId", console_type_id as "consoleTypeId", tuya_device_id as "tuyaDeviceId"
    `;

    const result = await pool.query(query, queryArgs);
    const updatedPc = result.rows[0];
    if (!updatedPc) {
      return res.status(404).json({ error: 'PC no encontrada' });
    }

    // Logica de TUYA
    if (currentPc) {
      const oldStatus = currentPc.status;
      const newStatus = updatedPc.status;
      const deviceId = updatedPc.tuyaDeviceId;

      if (deviceId) {
        if (newStatus === 'En Uso' && oldStatus !== 'En Uso') {
          setTuyaDeviceState(deviceId, true);
        } else if ((newStatus === 'Suspendida' || newStatus === 'Disponible' || newStatus === 'Bloqueada') && oldStatus === 'En Uso') {
          setTuyaDeviceState(deviceId, false);
        }
      }
    }

    res.json(updatedPc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pcs/:id', managers, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM pcs WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. PLANS
app.get('/api/plans', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, duration_minutes as "durationMinutes", price_usd as "priceUsd", is_active as "isActive"
      FROM plans ORDER BY duration_minutes ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plans', managers, async (req, res) => {
  const { name, description, durationMinutes, priceUsd } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO plans (name, description, duration_minutes, price_usd, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, name, description, duration_minutes as "durationMinutes", price_usd as "priceUsd", is_active as "isActive"
    `, [name, description, durationMinutes, priceUsd]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/plans/:id', managers, async (req, res) => {
  const { id } = req.params;
  const { name, description, durationMinutes, priceUsd, isActive } = req.body;
  try {
    const result = await pool.query(`
      UPDATE plans 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          duration_minutes = COALESCE($3, duration_minutes),
          price_usd = COALESCE($4, price_usd),
          is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING id, name, description, duration_minutes as "durationMinutes", price_usd as "priceUsd", is_active as "isActive"
    `, [name, description, durationMinutes, priceUsd, isActive, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. OFFERS
app.get('/api/offers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, discount_percentage as "discountPercentage", day_of_week as "dayOfWeek", is_active as "isActive"
      FROM offers ORDER BY day_of_week ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/offers', managers, async (req, res) => {
  const { name, description, discountPercentage, dayOfWeek } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO offers (name, description, discount_percentage, day_of_week, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, name, description, discount_percentage as "discountPercentage", day_of_week as "dayOfWeek", is_active as "isActive"
    `, [name, description, discountPercentage, dayOfWeek]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/offers/:id', managers, async (req, res) => {
  const { id } = req.params;
  const { name, description, discountPercentage, dayOfWeek, isActive } = req.body;
  try {
    const result = await pool.query(`
      UPDATE offers 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          discount_percentage = COALESCE($3, discount_percentage),
          day_of_week = COALESCE($4, day_of_week),
          is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING id, name, description, discount_percentage as "discountPercentage", day_of_week as "dayOfWeek", is_active as "isActive"
    `, [name, description, discountPercentage, dayOfWeek, isActive, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. PAYMENTS
app.get('/api/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.session_id as "sessionId", p.operator_id as "operatorId", u1.full_name as "operatorName", 
             p.validator_id as "validatorId", u2.full_name as "validatorName", p.amount_usd as "amountUsd", 
             p.amount_ves as "amountVes", p.bcv_rate as "bcvRate", p.payment_method as "paymentMethod", 
             (p.receipt_image_url IS NOT NULL) as "hasReceipt", p.reference, p.status, p.offer_applied as "offerApplied", 
             p.created_at as "createdAt", p.validated_at as "validatedAt"
      FROM payments p
      LEFT JOIN users u1 ON p.operator_id = u1.id
      LEFT JOIN users u2 ON p.validator_id = u2.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payments/:id/receipt', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT receipt_image_url as "receiptImageUrl"
      FROM payments WHERE id = $1
    `, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const { sessionId, amountUsd, amountVes, bcvRate, paymentMethod, reference, receiptImageUrl, offerApplied } = req.body;
  try {
    // El operador es siempre el usuario autenticado (no se confía en el cuerpo de la petición)
    const opId = req.user.id;

    // El trigger en schema.sql requiere status = 'Pendiente' por defecto al insertar
    const result = await pool.query(`
      INSERT INTO payments (session_id, operator_id, amount_usd, amount_ves, bcv_rate, payment_method, receipt_image_url, reference, status, offer_applied)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente', $9)
      RETURNING id, session_id as "sessionId", operator_id as "operatorId", amount_usd as "amountUsd", 
                amount_ves as "amountVes", bcv_rate as "bcvRate", payment_method as "paymentMethod", 
                receipt_image_url as "receiptImageUrl", reference, status, offer_applied as "offerApplied", created_at as "createdAt"
    `, [sessionId || null, opId, amountUsd, amountVes, bcvRate, paymentMethod, receiptImageUrl || null, reference || null, offerApplied || null]);

    // Obtener el nombre del operador para responder al frontend
    const details = await pool.query(`
      SELECT p.*, u.full_name as "operatorName" 
      FROM payments p 
      LEFT JOIN users u ON p.operator_id = u.id 
      WHERE p.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      ...result.rows[0],
      operatorName: details.rows[0].operatorName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/payments/:id/validate', adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const valId = req.user.id;

    const upd = await pool.query(`
      UPDATE payments 
      SET status = 'Validado', validator_id = $1, validated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [valId, id]);
    if (upd.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const result = await pool.query(`
      SELECT p.id, p.status, p.validated_at as "validatedAt", u.full_name as "validatorName", p.validator_id as "validatorId"
      FROM payments p
      LEFT JOIN users u ON p.validator_id = u.id
      WHERE p.id = $1
    `, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/payments/:id/reject', adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const valId = req.user.id;

    const upd = await pool.query(`
      UPDATE payments 
      SET status = 'Rechazado', validator_id = $1, validated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [valId, id]);
    if (upd.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const result = await pool.query(`
      SELECT p.id, p.status, p.validated_at as "validatedAt", u.full_name as "validatorName", p.validator_id as "validatorId"
      FROM payments p
      LEFT JOIN users u ON p.validator_id = u.id
      WHERE p.id = $1
    `, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. INVENTORY
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, purchase_price as "purchasePrice", price_usd as "priceUsd", stock, min_stock as "minStock", category
      FROM inventory ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', managers, async (req, res) => {
  const { name, description, purchasePrice, priceUsd, stock, minStock, category } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO inventory (name, description, purchase_price, price_usd, stock, min_stock, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, description, purchase_price as "purchasePrice", price_usd as "priceUsd", stock, min_stock as "minStock", category
    `, [name, description, purchasePrice || 0, priceUsd, stock || 0, minStock || 5, category]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', managers, async (req, res) => {
  const { id } = req.params;
  const { name, description, purchasePrice, priceUsd, stock, minStock, category } = req.body;
  try {
    const result = await pool.query(`
      UPDATE inventory 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          purchase_price = COALESCE($3, purchase_price),
          price_usd = COALESCE($4, price_usd),
          stock = COALESCE($5, stock),
          min_stock = COALESCE($6, min_stock),
          category = COALESCE($7, category)
      WHERE id = $8
      RETURNING id, name, description, purchase_price as "purchasePrice", price_usd as "priceUsd", stock, min_stock as "minStock", category
    `, [name, description, purchasePrice, priceUsd, stock, minStock, category, id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', managers, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory-logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT il.id, il.product_id as "productId", i.name as "productName", 
             u.full_name as "userName", il.change_amount as "changeAmount", 
             il.reason, il.created_at as "createdAt"
      FROM inventory_logs il
      LEFT JOIN inventory i ON il.product_id = i.id
      LEFT JOIN users u ON il.user_id = u.id
      ORDER BY il.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory-logs', async (req, res) => {
  const { productId, changeAmount, reason } = req.body;
  const delta = Number(changeAmount);
  if (!productId || !Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'Producto y cantidad válidos son obligatorios' });
  }
  const client = await pool.connect();
  try {
    const userId = req.user.id;

    await client.query('BEGIN');
    // Ajuste atómico del stock (evita condiciones de carrera entre ventas simultáneas)
    const stockRes = await client.query(
      `UPDATE inventory SET stock = stock + $1 WHERE id = $2 AND stock + $1 >= 0 RETURNING stock`,
      [delta, productId]
    );
    if (stockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Stock insuficiente o producto inexistente' });
    }

    const result = await client.query(`
      INSERT INTO inventory_logs (product_id, user_id, change_amount, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING id, product_id as "productId", change_amount as "changeAmount", reason, created_at as "createdAt"
    `, [productId, userId, delta, reason]);
    await client.query('COMMIT');

    // Obtener nombres para retornar al frontend
    const details = await pool.query(`
      SELECT il.*, i.name as "productName", u.full_name as "userName"
      FROM inventory_logs il
      LEFT JOIN inventory i ON il.product_id = i.id
      LEFT JOIN users u ON il.user_id = u.id
      WHERE il.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      ...result.rows[0],
      productName: details.rows[0].productName,
      userName: details.rows[0].userName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. SHIFT CLOSINGS
app.get('/api/shift-closings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sc.id, sc.operator_id as "operatorId", u.full_name as "operatorName",
             sc.start_time as "startTime", sc.end_time as "endTime",
             sc.total_usd_generated as "totalUsdGenerated", sc.total_ves_generated as "totalVesGenerated",
             sc.total_time_minutes as "totalTimeMinutes", sc.details, sc.created_at as "createdAt"
      FROM shift_closings sc
      LEFT JOIN users u ON sc.operator_id = u.id
      ORDER BY sc.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// 9. SHIFT CLOSINGS
app.post('/api/shift-closings', async (req, res) => {
  const { startTime, endTime, totalUsdGenerated, totalVesGenerated, totalTimeMinutes, details } = req.body;
  try {
    const opId = req.user.id;

    const result = await pool.query(`
      INSERT INTO shift_closings (operator_id, start_time, end_time, total_usd_generated, total_ves_generated, total_time_minutes, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, operator_id as "operatorId", start_time as "startTime", end_time as "endTime", 
                total_usd_generated as "totalUsdGenerated", total_ves_generated as "totalVesGenerated", 
                total_time_minutes as "totalTimeMinutes", details, created_at as "createdAt"
    `, [opId, startTime || new Date(), endTime || new Date(), totalUsdGenerated || 0, totalVesGenerated || 0, totalTimeMinutes || 0, JSON.stringify(details || {})]);

    const detailsWithNames = await pool.query(`
      SELECT sc.*, u.full_name as "operatorName"
      FROM shift_closings sc
      LEFT JOIN users u ON sc.operator_id = u.id
      WHERE sc.id = $1
    `, [result.rows[0].id]);

    // Update all Pendiente payments for this operator to Revision
    await pool.query(`
      UPDATE payments
      SET status = 'Revision'
      WHERE operator_id = $1 AND status = 'Pendiente'
    `, [opId]);

    res.status(201).json({
      ...result.rows[0],
      operatorName: detailsWithNames.rows[0].operatorName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. CREDENTIALS
app.get('/api/credentials', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, entity_name as "entityName", login_username as "loginUsername", login_password as "loginPassword", category, notes
      FROM credentials ORDER BY entity_name ASC
    `);
    // Enmascarar credenciales si el rol es Operador para evitar fuga de contraseñas por red
    const isOperator = req.user && req.user.role === 'Operador';
    const rows = result.rows.map(r => ({
      ...r,
      loginUsername: isOperator ? '••••••••' : r.loginUsername,
      loginPassword: isOperator ? '••••••••' : r.loginPassword,
    }));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/credentials', managers, async (req, res) => {
  const { entityName, loginUsername, loginPassword, category, notes } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO credentials (entity_name, login_username, login_password, category, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, entity_name as "entityName", login_username as "loginUsername", login_password as "loginPassword", category, notes
    `, [entityName, loginUsername, loginPassword, category, notes]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/credentials/:id', managers, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM credentials WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. AUDIT LOGS
app.get('/api/audit-logs', adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, user_id as "userId", username, role, action, details, status, created_at as "createdAt"
      FROM audit_logs ORDER BY created_at DESC LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit-logs', async (req, res) => {
  const { action, details, status } = req.body;
  try {
    const userId = req.user?.id || null;
    const username = req.user?.fullName || req.body.username || 'System';
    const role = req.user?.role || req.body.role || 'System';

    const result = await pool.query(`
      INSERT INTO audit_logs (user_id, username, role, action, details, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id as "userId", username, role, action, details, status, created_at as "createdAt"
    `, [userId, username, role, action, details, status || 'Éxito']);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React static files in production
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router (Single Page Application routing)
app.get(/.*/, (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
async function startServer() {
  try {
    // Inicializar conexión y tablas
    await initDatabase();

    // Iniciar temporizador
    startGameTimer();

    // Levantar puerto
    app.listen(PORT, () => {
      console.log(`========================================================`);
      console.log(`Servidor principal de Game Zone corriendo en http://localhost:${PORT}`);
      console.log(`========================================================`);
    });
  } catch (error) {
    console.error('Error crítico al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
