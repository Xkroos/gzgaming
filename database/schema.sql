-- -------------------------------------------------------------
-- BASE DE DATOS: GAME ZONE
-- SISTEMA DE GESTIÓN Y AUTOMATIZACIÓN DE PROCESOS ADMINISTRATIVOS
-- DIALECTO: PostgreSQL (Puro)
-- -------------------------------------------------------------

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. ENUMS Y DOMINIOS
-- -------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('Admin', 'Encargado', 'Operador');
CREATE TYPE pc_status AS ENUM ('Disponible', 'En Uso', 'Bloqueada', 'Suspendida');
CREATE TYPE session_status AS ENUM ('Activa', 'Completada', 'Bloqueada');
CREATE TYPE payment_status AS ENUM ('Pendiente', 'Validado', 'Rechazado');
CREATE TYPE payment_method AS ENUM ('Pago Móvil', 'Efectivo $', 'Efectivo Bs.', 'Transferencia', 'Punto de Venta');
CREATE TYPE credential_category AS ENUM ('PC Login', 'Steam', 'Epic Games', 'Riot Games', 'Otros');

-- -------------------------------------------------------------
-- 2. TABLAS PRINCIPALES
-- -------------------------------------------------------------

-- Tabla de Tipos de Consolas (Categorías)
CREATE TABLE console_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 2.00 CHECK (hourly_rate >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios (Personal)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'Operador',
    status VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Equipos Gaming (PCs o Consolas)
CREATE TABLE pcs (
    id VARCHAR(20) PRIMARY KEY, -- e.g. 'PC-01', 'PC-02'
    pc_name VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) UNIQUE,
    status pc_status NOT NULL DEFAULT 'Disponible',
    hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 2.00 CHECK (hourly_rate >= 0),
    details TEXT,
    console_type_id UUID REFERENCES console_types(id) ON DELETE SET NULL,
    remaining_time INT NOT NULL DEFAULT 0,
    total_assigned_time INT NOT NULL DEFAULT 0,
    client_name VARCHAR(100),
    current_session_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Planes y Promociones
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Ofertas y Reglas de Descuento (ej. Lunes de oferta 50%)
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, ...
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Sesiones de Juego de Clientes
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pc_id VARCHAR(20) REFERENCES pcs(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Operador que inicia la sesión
    client_name VARCHAR(100) NOT NULL DEFAULT 'Cliente Invitado',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INT NOT NULL CHECK (duration_minutes >= 0), -- 0 significa libre/ilimitado
    end_time TIMESTAMP WITH TIME ZONE,
    price_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_usd >= 0),
    status session_status NOT NULL DEFAULT 'Activa',
    offer_applied_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pagos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(50),
    operator_id UUID REFERENCES users(id) ON DELETE RESTRICT, -- Operador que cobró
    validator_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin que validó el pago
    amount_usd DECIMAL(10, 2) NOT NULL CHECK (amount_usd >= 0),
    amount_ves DECIMAL(15, 2) NOT NULL CHECK (amount_ves >= 0), -- Almacenado en bolívares
    bcv_rate DECIMAL(10, 4) NOT NULL, -- Tasa oficial BCV capturada al registrar el pago
    payment_method payment_method NOT NULL,
    receipt_image_url TEXT, -- Captura del comprobante
    reference VARCHAR(100), -- Referencia del pago
    status payment_status NOT NULL DEFAULT 'Pendiente',
    offer_applied VARCHAR(100), -- Descripción de la oferta activa si aplica
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de Inventario de Stack/Consumibles (Bebidas, Snacks, etc.)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    price_usd DECIMAL(10, 2) NOT NULL CHECK (price_usd >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INT NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    category VARCHAR(50) NOT NULL, -- e.g. 'Bebidas', 'Snacks', 'Hardware'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Historial de Reabastecimiento de Inventario
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT, -- Quién hizo el movimiento (Encargado/Admin)
    change_amount INT NOT NULL, -- Positivo para recarga, Negativo para venta
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Cierre de Caja del Operador (Cerrar Caja)
CREATE TABLE shift_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_usd_generated DECIMAL(10, 2) NOT NULL CHECK (total_usd_generated >= 0),
    total_ves_generated DECIMAL(15, 2) NOT NULL CHECK (total_ves_generated >= 0),
    total_time_minutes INT NOT NULL DEFAULT 0 CHECK (total_time_minutes >= 0),
    details JSONB, -- Detalles adicionales agregados por el operador (conteo físico de efectivo, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Credenciales de Cuentas y PC Logins
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_name VARCHAR(100) NOT NULL, -- e.g. 'PC-01 Windows', 'Steam Account 03'
    login_username VARCHAR(100) NOT NULL,
    login_password VARCHAR(255) NOT NULL,
    category credential_category NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Bitácora de Seguridad (Audit Log)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL, -- Respaldado en caso de borrado de usuario
    role VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'LOGIN', 'LOGOUT', 'VALIDATE_PAYMENT', 'RESTOCK'
    details TEXT,
    ip_address VARCHAR(45),
    status VARCHAR(20) NOT NULL DEFAULT 'Éxito', -- 'Éxito', 'Fallo', 'Advertencia'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 3. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA RÁPIDA
-- -------------------------------------------------------------
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_sessions_pc_status ON sessions(pc_id, status);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_inventory_stock ON inventory(stock);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- -------------------------------------------------------------
-- 4. DISPARADORES (TRIGGERS) PARA AUDITORÍA AUTOMÁTICA
-- -------------------------------------------------------------

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_pcs_modtime BEFORE UPDATE ON pcs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_credentials_modtime BEFORE UPDATE ON credentials FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_console_types_modtime BEFORE UPDATE ON console_types FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- -------------------------------------------------------------
-- 5. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- -------------------------------------------------------------
-- Habilitar RLS en todas las tablas para máxima seguridad
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

-- Asumimos el uso de variables de sesión en PostgreSQL cargadas por el backend o el cliente
-- e.g. SET LOCAL app.current_user_role = 'Operador';
-- e.g. SET LOCAL app.current_user_id = 'xxxx-yyyy-zzzz';

-- 1. POLÍTICAS DE console_types
DROP POLICY IF EXISTS admin_encargado_console_types ON console_types;
CREATE POLICY admin_encargado_console_types ON console_types
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_console_types ON console_types;
CREATE POLICY operador_read_console_types ON console_types
    FOR SELECT TO PUBLIC USING (true);

-- 2. POLÍTICAS DE users
DROP POLICY IF EXISTS admin_users_policy ON users;
CREATE POLICY admin_users_policy ON users
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Admin');

DROP POLICY IF EXISTS public_read_users ON users;
CREATE POLICY public_read_users ON users
    FOR SELECT TO PUBLIC USING (true);

-- 3. POLÍTICAS DE pcs
DROP POLICY IF EXISTS admin_encargado_pcs ON pcs;
CREATE POLICY admin_encargado_pcs ON pcs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_select_pcs ON pcs;
CREATE POLICY operador_select_pcs ON pcs
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_update_pcs ON pcs;
CREATE POLICY operador_update_pcs ON pcs
    FOR UPDATE TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 4. POLÍTICAS DE plans
DROP POLICY IF EXISTS admin_encargado_plans ON plans;
CREATE POLICY admin_encargado_plans ON plans
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_plans ON plans;
CREATE POLICY operador_read_plans ON plans
    FOR SELECT TO PUBLIC USING (true);

-- 5. POLÍTICAS DE offers
DROP POLICY IF EXISTS admin_encargado_offers ON offers;
CREATE POLICY admin_encargado_offers ON offers
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_offers ON offers;
CREATE POLICY operador_read_offers ON offers
    FOR SELECT TO PUBLIC USING (true);

-- 6. POLÍTICAS DE sessions
DROP POLICY IF EXISTS admin_encargado_sessions ON sessions;
CREATE POLICY admin_encargado_sessions ON sessions
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_manage_sessions ON sessions;
CREATE POLICY operador_manage_sessions ON sessions
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 7. POLÍTICAS DE payments
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

-- 8. POLÍTICAS DE inventory
DROP POLICY IF EXISTS admin_encargado_inventory_policy ON inventory;
CREATE POLICY admin_encargado_inventory_policy ON inventory
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_inventory_policy ON inventory;
CREATE POLICY operador_read_inventory_policy ON inventory
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_update_inventory_policy ON inventory;
CREATE POLICY operador_update_inventory_policy ON inventory
    FOR UPDATE TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 9. POLÍTICAS DE inventory_logs
DROP POLICY IF EXISTS admin_encargado_inventory_logs ON inventory_logs;
CREATE POLICY admin_encargado_inventory_logs ON inventory_logs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_inventory_logs ON inventory_logs;
CREATE POLICY operador_read_inventory_logs ON inventory_logs
    FOR SELECT TO PUBLIC USING (true);

DROP POLICY IF EXISTS operador_insert_inventory_logs ON inventory_logs;
CREATE POLICY operador_insert_inventory_logs ON inventory_logs
    FOR INSERT TO PUBLIC WITH CHECK (current_setting('app.current_user_role', true) = 'Operador');

-- 10. POLÍTICAS DE shift_closings
DROP POLICY IF EXISTS admin_encargado_shift_closings ON shift_closings;
CREATE POLICY admin_encargado_shift_closings ON shift_closings
    FOR SELECT TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_shift_closings ON shift_closings;
CREATE POLICY operador_shift_closings ON shift_closings
    FOR ALL TO PUBLIC USING (operator_id = CAST(current_setting('app.current_user_id', true) AS UUID));

-- 11. POLÍTICAS DE credentials
DROP POLICY IF EXISTS admin_encargado_credentials ON credentials;
CREATE POLICY admin_encargado_credentials ON credentials
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) IN ('Admin', 'Encargado'));

DROP POLICY IF EXISTS operador_read_credentials ON credentials;
CREATE POLICY operador_read_credentials ON credentials
    FOR SELECT TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Operador');

-- 12. POLÍTICAS DE audit_logs
DROP POLICY IF EXISTS admin_audit_logs_policy ON audit_logs;
CREATE POLICY admin_audit_logs_policy ON audit_logs
    FOR ALL TO PUBLIC USING (current_setting('app.current_user_role', true) = 'Admin');

DROP POLICY IF EXISTS write_audit_logs_policy ON audit_logs;
CREATE POLICY write_audit_logs_policy ON audit_logs
    FOR INSERT TO PUBLIC WITH CHECK (true);
