import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Configurar parser global para tipo DECIMAL/NUMERIC de PostgreSQL (OID 1700) como número flotante de JS
pkg.types.setTypeParser(1700, (val) => val === null ? null : parseFloat(val));

dotenv.config();

const { Pool, Client } = pkg;

// Configuración de conexión básica (sin especificar base de datos al inicio)
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};

const DB_NAME = process.env.DB_DATABASE || 'game_zone';

export let pool = null;

// Función para inicializar la conexión y las tablas
export async function initDatabase() {
  console.log('Verificando base de datos PostgreSQL...');
  
  if (process.env.DATABASE_URL) {
    console.log('Detectado DATABASE_URL en variables de entorno. Conectando directamente...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } else {
    // 1. Conectar a PostgreSQL para verificar/crear la BD en local
    const systemClient = new Client({
      ...dbConfig,
      database: 'postgres', // Nos conectamos a la BD del sistema por defecto
    });

    try {
      await systemClient.connect();
      const res = await systemClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
      
      if (res.rowCount === 0) {
        console.log(`Base de datos '${DB_NAME}' no existe. Creándola...`);
        // CREATE DATABASE no permite parámetros de consulta ($1), concatenamos de forma segura ya que viene del env local
        await systemClient.query(`CREATE DATABASE "${DB_NAME}"`);
        console.log(`Base de datos '${DB_NAME}' creada con éxito.`);
      } else {
        console.log(`Base de datos '${DB_NAME}' ya existe.`);
      }
    } catch (error) {
      console.error('Error al verificar o crear la base de datos principal en PostgreSQL:', error.message);
      console.error('Por favor, asegúrate de que PostgreSQL esté corriendo y que la contraseña en tu archivo .env sea correcta.');
      throw error;
    } finally {
      await systemClient.end();
    }

    // 2. Establecer el Pool de conexiones a la base de datos local
    pool = new Pool({
      ...dbConfig,
      database: DB_NAME,
    });
  }

  // Probar la conexión
  try {
    await pool.query('SELECT NOW()');
    console.log(`Conectado al pool de PostgreSQL en la base de datos: '${DB_NAME}'`);
  } catch (error) {
    console.error('Error al conectarse a la base de datos:', error.message);
    throw error;
  }

  // 3. Crear las tablas si no existen
  try {
    // Comprobamos si la tabla 'users' existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tablesExist = tableCheck.rows[0].exists;
    
    if (!tablesExist) {
      console.log('Tablas no encontradas. Ejecutando schema.sql para inicializar...');
      const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Ejecutar todo el SQL de una vez
      await pool.query(schemaSql);
      console.log('Tablas creadas y políticas RLS configuradas correctamente.');
      
      // Sembrar datos iniciales
      await seedInitialData();
    } else {
      console.log('Las tablas de la base de datos ya existen. Saltando inicialización del esquema.');
    }
  } catch (error) {
    console.error('Error al inicializar el esquema de base de datos:', error.message);
    throw error;
  }
}

// Función para sembrar datos iniciales (Default Seeders)
async function seedInitialData() {
  console.log('Sembrando datos iniciales en la base de datos...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Usuarios por defecto (con contraseñas encriptadas)
    const adminPassHash = bcrypt.hashSync('admin', 10);
    const supervisorPassHash = bcrypt.hashSync('supervisor', 10);
    const operatorPassHash = bcrypt.hashSync('operador1', 10);

    const userRes = await client.query(`
      INSERT INTO users (username, password_hash, full_name, role, status) VALUES
      ('admin', $1, 'Carlos Mendoza', 'Admin', 'Activo'),
      ('supervisor', $2, 'Elena Rivas', 'Encargado', 'Activo'),
      ('operador1', $3, 'Juan Torres', 'Operador', 'Activo')
      RETURNING id, username;
    `, [adminPassHash, supervisorPassHash, operatorPassHash]);
    
    const usersMap = {};
    userRes.rows.forEach(row => {
      usersMap[row.username] = row.id;
    });
    console.log('Usuarios iniciales sembrados.');

    // 2. Tipos de Consola por defecto
    const consoleRes = await client.query(`
      INSERT INTO console_types (name, emoji, hourly_rate, is_active) VALUES
      ('PC Gaming', '🖥️', 2.00, true),
      ('PlayStation 5', '🎮', 3.00, true),
      ('Simulador', '🏎️', 5.00, true),
      ('Nintendo Switch', '🕹️', 2.50, true)
      RETURNING id, name;
    `);

    const consoleTypesMap = {};
    consoleRes.rows.forEach(row => {
      consoleTypesMap[row.name] = row.id;
    });
    console.log('Tipos de consolas sembrados.');

    // 3. Equipos PCs iniciales asociados a 'PC Gaming'
    const pcGamingId = consoleTypesMap['PC Gaming'];
    for (let i = 1; i <= 10; i++) {
      const pcId = `PC-${String(i).padStart(2, '0')}`;
      const pcName = `Gaming Zone ${pcId}`;
      const ipAddress = `192.168.1.${100 + i}`;
      const details = 'Core i7-12700K, RTX 3070, 32GB RAM, Pantalla 144Hz';
      
      await client.query(`
        INSERT INTO pcs (id, pc_name, ip_address, status, hourly_rate, details, console_type_id)
        VALUES ($1, $2, $3, 'Disponible', 2.00, $4, $5);
      `, [pcId, pcName, ipAddress, details, pcGamingId]);
    }
    console.log('Equipos (PCs) iniciales sembrados.');

    // 4. Planes de tiempo
    await client.query(`
      INSERT INTO plans (name, description, duration_minutes, price_usd, is_active) VALUES
      ('Plan 1 Hora', 'Acceso estándar a PC por 1 hora', 60, 2.00, true),
      ('Plan 3 Horas', 'Acceso con descuento por 3 horas', 180, 5.00, true),
      ('Plan Nocturno (Night Shift)', 'Juega toda la noche desde las 10 PM a 6 AM', 480, 10.00, true);
    `);
    console.log('Planes de juego sembrados.');

    // 5. Ofertas
    await client.query(`
      INSERT INTO offers (name, description, discount_percentage, day_of_week, is_active) VALUES
      ('Lunes de Locura 50%', '50% de descuento en tarifas por hora los lunes', 50.00, 1, true),
      ('Combo Miércoles Gamer', '30% de descuento en la tarifa', 30.00, 3, true);
    `);
    console.log('Ofertas sembradas.');

    // 6. Inventario inicial
    await client.query(`
      INSERT INTO inventory (name, description, purchase_price, price_usd, stock, min_stock, category) VALUES
      ('Coca-Cola 355ml', 'Lata fría', 0.80, 1.50, 24, 5, 'Bebidas'),
      ('Pepsi 355ml', 'Lata fría', 0.65, 1.25, 15, 5, 'Bebidas'),
      ('Doritos Mega', 'Bolsa grande sabor queso', 1.20, 2.00, 10, 3, 'Snacks'),
      ('Papas Lays', 'Sabor natural bolsa mediana', 1.00, 1.75, 4, 5, 'Snacks');
    `);
    console.log('Inventario inicial sembrado.');

    // 7. Credenciales por defecto
    await client.query(`
      INSERT INTO credentials (entity_name, login_username, login_password, category, notes) VALUES
      ('PC-01 Windows Access', 'AdminGZ01', 'GZPassWord_01', 'PC Login', 'Acceso de red local'),
      ('Steam Acc 01 (CS2 / Dota2)', 'gz_valvesteam1', 'SteamSecureKey2026', 'Steam', 'Cuenta pública con skins'),
      ('Riot Games Acc (Valorant)', 'gamezone_riot_02', 'RiotAccountZone26', 'Riot Games', 'Rango Platino 2');
    `);
    console.log('Credenciales sembradas.');

    // 8. Bitácora de Auditoría Inicial
    const systemUserId = usersMap['admin'] || null;
    await client.query(`
      INSERT INTO audit_logs (user_id, username, role, action, details, status)
      VALUES ($1, 'System', 'Admin', 'STARTUP', 'Inicialización de la base de datos PostgreSQL de Game Zone', 'Éxito');
    `, [systemUserId]);
    console.log('Bitácora inicial de seguridad sembrada.');

    await client.query('COMMIT');
    console.log('Sembrado completado con éxito.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante el sembrado de base de datos:', error.message);
    throw error;
  } finally {
    client.release();
  }
}
