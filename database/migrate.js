import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'game_zone'
});

async function runMigration() {
  console.log("Iniciando migración de la base de datos...");
  try {
    await client.connect();
    console.log("Conectado a PostgreSQL con éxito.");

    // 1. Eliminar la restricción de clave foránea en payments.session_id si existe
    console.log("Eliminando clave foránea en payments.session_id...");
    await client.query(`
      ALTER TABLE payments 
      DROP CONSTRAINT IF EXISTS payments_session_id_fkey
    `);

    // 2. Modificar el tipo de columna session_id en payments a VARCHAR(50)
    console.log("Modificando columna session_id en payments a VARCHAR(50)...");
    await client.query(`
      ALTER TABLE payments 
      ALTER COLUMN session_id TYPE VARCHAR(50)
    `);

    // 3. Modificar el tipo de columna current_session_id en pcs a VARCHAR(50)
    console.log("Modificando columna current_session_id en pcs a VARCHAR(50)...");
    await client.query(`
      ALTER TABLE pcs 
      ALTER COLUMN current_session_id TYPE VARCHAR(50)
    `);

    // 4. Deshabilitar RLS en las tablas críticas
    console.log("Deshabilitando RLS en tablas críticas...");
    await client.query("ALTER TABLE payments DISABLE ROW LEVEL SECURITY");
    await client.query("ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY");
    await client.query("ALTER TABLE inventory DISABLE ROW LEVEL SECURITY");
    await client.query("ALTER TABLE shift_closings DISABLE ROW LEVEL SECURITY");

    console.log("¡Migración completada con éxito!");
  } catch (error) {
    console.error("Error crítico durante la migración:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
