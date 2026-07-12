import { pool, initDatabase } from './db.js';

async function migrate() {
  await initDatabase();
  try {
    await pool.query('ALTER TABLE pcs ADD COLUMN tuya_device_id VARCHAR(100);');
    console.log('Migración completada con éxito.');
  } catch (error) {
    if (error.code === '42701') {
      console.log('La columna ya existe. Omitiendo.');
    } else {
      console.error('Error en la migración:', error);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
