-- ============================================================
-- MÓDULO DE MENSAJERÍA CENTRALIZADA (User-Centric) — Schema V2
-- Para ejecutar en el Editor SQL de Insforge
-- ============================================================
-- ATENCIÓN: Este script reemplazará las tablas de mensajería existentes.
-- ============================================================

-- Eliminar tablas y vistas anteriores (Módulo viejo)
DROP VIEW IF EXISTS v_conversations_with_last_message CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: user_sessions (NUEVA)
-- Gestiona el estado de conexión para features de Tiempo Real
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id         TEXT PRIMARY KEY,
    socket_id       TEXT,
    is_online       BOOLEAN DEFAULT FALSE,
    last_activity   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info     TEXT
);

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: conversations (REDISEÑADA)
-- Centrada en usuarios, independiente de módulos.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    type            TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    organization_id TEXT NOT NULL DEFAULT 'default_org', -- Multi-tenant isolation
    created_by      TEXT NOT NULL, -- Quién inició el chat / grupo
    
    -- Opcional: Nombre y avatar para grupos
    title           TEXT,
    avatar          TEXT,
    
    -- Opcional: Referencia pasiva a módulo (No controla el chat, solo metadata)
    linked_module   TEXT CHECK (linked_module IN ('nc', 'audit', 'document', 'project', NULL)),
    linked_id       TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- ────────────────────────────────────────────────────────────
-- 3. TABLA: conversation_participants
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    
    -- Control de lectura (última vez que el usuario vio la conversación)
    last_read_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Rol dentro del grupo
    role            TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);

-- ────────────────────────────────────────────────────────────
-- 4. TABLA: messages (REDISEÑADA)
-- Soporta system messages y borrado lógico (Auditabilidad)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL, -- El emisor. Puede ser "system"
    
    content         TEXT NOT NULL DEFAULT '',
    message_type    TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    
    -- Estado global (aplica principalmente para 1:1)
    read_status     TEXT NOT NULL DEFAULT 'sent' CHECK (read_status IN ('sent', 'delivered', 'read')),
    
    -- Hilos / Quotes
    reply_to_id     TEXT REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Adjuntos (si message_type in ('file', 'image'))
    file_url        TEXT,
    file_name       TEXT,
    file_size       BIGINT,
    
    -- Auditabilidad (Empresarial)
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at       TIMESTAMP WITH TIME ZONE,
    deleted_at      TIMESTAMP WITH TIME ZONE -- Borrado lógico (compliance)
);

CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ────────────────────────────────────────────────────────────
-- 5. TRIGGERS Y FUNCIONES
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conv_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Función: Contar no leídos
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id TEXT, p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_last_read TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    SELECT last_read_at INTO v_last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    IF v_last_read IS NULL THEN v_last_read := '1970-01-01'::TIMESTAMP WITH TIME ZONE; END IF;
    
    SELECT COUNT(*) INTO v_count FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND created_at > v_last_read
      AND deleted_at IS NULL;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- 6. VISTA: Directorio de Usuarios Activos
-- (Cruza la data estática con sus sesiones dinámicas)
-- Asume que la tabla "users" existe o se gestiona vía el sistema/mock
-- ────────────────────────────────────────────────────────────
-- Nota: En este proxy de supabase la tabla de usuarios se llama diferente o se saca de auth, 
-- pero definimos la vista para mapear el estado online.
/*
CREATE OR REPLACE VIEW v_active_directory AS
SELECT 
    u.id, 
    u.name, 
    u.email, 
    u.role, 
    u.organization_id,
    COALESCE(s.is_online, FALSE) AS is_online,
    s.last_activity
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id
WHERE u.status = 'active';
*/

-- ============================================================
-- FIN DEL SCRIPT V2
-- ============================================================
