import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;
let clientConfig = {};

if (connectionString) {
  clientConfig = {
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  clientConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_DATABASE || 'game_zone'
  };
}

const client = new Client(clientConfig);

const rlsSql = `
-- 1. Habilitar seguridad RLS en todas las tablas
ALTER TABLE console_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE console_types
DROP POLICY IF EXISTS admin_encargado_console_types ON console_types;
CREATE POLICY admin_encargado_console_types ON console_types
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_console_types ON console_types;
CREATE POLICY operador_read_console_types ON console_types
    FOR SELECT TO PUBLIC USING (true);

-- 3. POLÍTICAS DE users
DROP POLICY IF EXISTS admin_users_policy ON users;
CREATE POLICY admin_users_policy ON users
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Admin');

DROP POLICY IF EXISTS public_read_users ON users;
CREATE POLICY public_read_users ON users
    FOR SELECT TO PUBLIC USING (true);

-- 4. POLÍTICAS DE pcs
DROP POLICY IF EXISTS admin_encargado_pcs ON pcs;
CREATE POLICY admin_encargado_pcs ON pcs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_select_pcs ON pcs;
CREATE POLICY operador_select_pcs ON pcs
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_update_pcs ON pcs;
CREATE POLICY operador_update_pcs ON pcs
    FOR UPDATE TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 5. POLÍTICAS DE plans
DROP POLICY IF EXISTS admin_encargado_plans ON plans;
CREATE POLICY admin_encargado_plans ON plans
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_plans ON plans;
CREATE POLICY operador_read_plans ON plans
    FOR SELECT TO PUBLIC USING (true);

-- 6. POLÍTICAS DE offers
DROP POLICY IF EXISTS admin_encargado_offers ON offers;
CREATE POLICY admin_encargado_offers ON offers
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_offers ON offers;
CREATE POLICY operador_read_offers ON offers
    FOR SELECT TO PUBLIC USING (true);

-- 7. POLÍTICAS DE sessions
DROP POLICY IF EXISTS admin_encargado_sessions ON sessions;
CREATE POLICY admin_encargado_sessions ON sessions
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_manage_sessions ON sessions;
CREATE POLICY operador_manage_sessions ON sessions
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 8. POLÍTICAS DE payments
DROP POLICY IF EXISTS admin_payments_policy ON payments;
CREATE POLICY admin_payments_policy ON payments
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Admin');

DROP POLICY IF EXISTS encargado_payments_policy ON payments;
CREATE POLICY encargado_payments_policy ON payments
    FOR SELECT TO PUBLIC USING (
        current_setting('app.current_user_role', true) = 'Encargado'
        AND created_at >= CURRENT_DATE
    );

DROP POLICY IF EXISTS operador_payments_policy ON payments;
CREATE POLICY operador_payments_policy ON payments
    FOR SELECT TO PUBLIC USING (operator_id = CAST(current_setting('app.current_user_id', true) AS UUID));

DROP POLICY IF EXISTS operador_insert_payments_policy ON payments;
CREATE POLICY operador_insert_payments_policy ON payments
    FOR INSERT TO PUBLIC WITH CHECK (
        current_setting('app.current_user_role', true) = 'Operador'
        AND operator_id = CAST(current_setting('app.current_user_id', true) AS UUID)
        AND status = 'Pendiente'
    );

-- 9. POLÍTICAS DE inventory
DROP POLICY IF EXISTS admin_encargado_inventory_policy ON inventory;
CREATE POLICY admin_encargado_inventory_policy ON inventory
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_inventory_policy ON inventory;
CREATE POLICY operador_read_inventory_policy ON inventory
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_update_inventory_policy ON inventory;
CREATE POLICY operador_update_inventory_policy ON inventory
    FOR UPDATE TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 10. POLÍTICAS DE inventory_logs
DROP POLICY IF EXISTS admin_encargado_inventory_logs ON inventory_logs;
CREATE POLICY admin_encargado_inventory_logs ON inventory_logs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_inventory_logs ON inventory_logs;
CREATE POLICY operador_read_inventory_logs ON inventory_logs
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_insert_inventory_logs ON inventory_logs;
CREATE POLICY operador_insert_inventory_logs ON inventory_logs
    FOR INSERT TO PUBLIC WITH CHECK (current_setting('app.current_user_role', true) = 'Operador');

-- 11. POLÍTICAS DE shift_closings
DROP POLICY IF EXISTS admin_encargado_shift_closings ON shift_closings;
CREATE POLICY admin_encargado_shift_closings ON shift_closings
    FOR SELECT TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_shift_closings ON shift_closings;
CREATE POLICY operador_shift_closings ON shift_closings
    FOR ALL TO PUBLIC USING (operator_id = CAST(current_setting('app.current_user_id', true) AS UUID));

-- 12. POLÍTICAS DE credentials
DROP POLICY IF EXISTS admin_encargado_credentials ON credentials;
CREATE POLICY admin_encargado_credentials ON credentials
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_credentials ON credentials;
CREATE POLICY operador_read_credentials ON credentials
    FOR SELECT TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 13. POLÍTICAS DE audit_logs
DROP POLICY IF EXISTS admin_audit_logs_policy ON audit_logs;
CREATE POLICY admin_audit_logs_policy ON audit_logs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Admin');

DROP POLICY IF EXISTS write_audit_logs_policy ON audit_logs;
CREATE POLICY write_audit_logs_policy ON audit_logs
    FOR INSERT TO PUBLIC WITH CHECK (true);
`;

async function applyRLS() {
  console.log("Aplicando políticas RLS en la base de datos...");
  try {
    await client.connect();
    console.log("Conexión con PostgreSQL establecida.");
    await client.query(rlsSql);
    console.log("¡Políticas RLS aplicadas con éxito en todas las tablas!");
  } catch (error) {
    console.error("Error al aplicar políticas RLS:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyRLS();
