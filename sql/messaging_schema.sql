-- ============================================================
-- MÓDULO DE MENSAJERÍA EN TIEMPO REAL — Schema SQL
-- Para ejecutar en el Editor SQL de Insforge
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: conversations
-- Almacena cada conversación (directa, grupal o vinculada a módulo)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    type            TEXT NOT NULL CHECK (type IN ('direct', 'group', 'module-linked')),
    title           TEXT NOT NULL DEFAULT '',
    
    -- Referencia opcional a un módulo del sistema
    module_type     TEXT CHECK (module_type IN ('nc', 'audit', 'document', 'project', NULL)),
    module_id       TEXT,
    module_title    TEXT,
    
    -- Avatar personalizado (iniciales o imagen URL)
    avatar          TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_module ON conversations(module_type, module_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: conversation_participants
-- Relaciona usuarios con conversaciones (N:M)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL DEFAULT '',
    role            TEXT NOT NULL DEFAULT '',
    avatar          TEXT,
    
    -- Estado en tiempo real (se actualiza vía API)
    is_online       BOOLEAN DEFAULT FALSE,
    is_typing       BOOLEAN DEFAULT FALSE,
    last_seen_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Última vez que leyó mensajes en esta conversación
    last_read_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Rol dentro de la conversación
    conv_role       TEXT DEFAULT 'member' CHECK (conv_role IN ('admin', 'member')),
    
    joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

-- ────────────────────────────────────────────────────────────
-- 3. TABLA: messages
-- Almacena cada mensaje enviado
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       TEXT NOT NULL,
    sender_name     TEXT NOT NULL DEFAULT '',
    sender_avatar   TEXT,
    
    -- Contenido del mensaje
    content         TEXT NOT NULL DEFAULT '',
    type            TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'file', 'image')),
    
    -- Estado de lectura global
    read_status     TEXT NOT NULL DEFAULT 'sent' CHECK (read_status IN ('sent', 'delivered', 'read')),
    
    -- Respuesta a otro mensaje (quote/reply)
    reply_to_id         TEXT,
    reply_to_sender     TEXT,
    reply_to_content    TEXT,
    
    -- Archivos adjuntos
    file_name       TEXT,
    file_url        TEXT,
    file_size       BIGINT,
    
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. TABLA: message_reads
-- Registra quién ha leído cada mensaje
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reads (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    message_id  TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL,
    read_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON message_reads(user_id);

-- ────────────────────────────────────────────────────────────
-- 5. FUNCIÓN: Actualizar updated_at automáticamente
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

-- Trigger: actualizar timestamp de conversación al insertar mensaje
DROP TRIGGER IF EXISTS trg_update_conv_on_message ON messages;
CREATE TRIGGER trg_update_conv_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- ────────────────────────────────────────────────────────────
-- 6. FUNCIÓN: Contar mensajes no leídos para un usuario
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id TEXT, p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_last_read TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    SELECT last_read_at INTO v_last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
    
    IF v_last_read IS NULL THEN
        v_last_read := '1970-01-01'::TIMESTAMP WITH TIME ZONE;
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND created_at > v_last_read;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- 7. VISTA: Conversaciones con último mensaje y conteo
-- (Útil para listar conversaciones en el panel izquierdo)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_conversations_with_last_message AS
SELECT 
    c.id,
    c.type,
    c.title,
    c.module_type,
    c.module_id,
    c.module_title,
    c.avatar,
    c.created_at,
    c.updated_at,
    -- Último mensaje
    lm.id AS last_message_id,
    lm.sender_id AS last_message_sender_id,
    lm.sender_name AS last_message_sender_name,
    lm.content AS last_message_content,
    lm.type AS last_message_type,
    lm.read_status AS last_message_read_status,
    lm.created_at AS last_message_at
FROM conversations c
LEFT JOIN LATERAL (
    SELECT * FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
) lm ON TRUE
ORDER BY COALESCE(lm.created_at, c.created_at) DESC;

-- ────────────────────────────────────────────────────────────
-- 8. DATOS INICIALES DE PRUEBA (Opcionales)
-- Puedes comentar esta sección si no deseas datos de prueba
-- ────────────────────────────────────────────────────────────

-- Conversación directa: Inspector ↔ Edwin Bedoya
INSERT INTO conversations (id, type, title) VALUES
    ('conv-1', 'direct', 'Edwin Bedoya');

INSERT INTO conversation_participants (conversation_id, user_id, username, role, avatar, is_online) VALUES
    ('conv-1', 'user-3', 'Janier Mosquera', 'Coord. Calidad', 'JM', TRUE),
    ('conv-1', 'user-2', 'Edwin Bedoya', 'Inspector Calidad', 'EB', TRUE);

INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, type, read_status, created_at) VALUES
    ('m1', 'conv-1', 'user-3', 'Janier Mosquera', 'Buenos días Edwin, ¿cómo va el control del lote G-90?', 'text', 'read', '2026-02-23T08:15:00Z'),
    ('m2', 'conv-1', 'user-2', 'Edwin Bedoya', 'Hola! Estoy terminando la inspección visual. Ya llevo el 80%.', 'text', 'read', '2026-02-23T08:20:00Z'),
    ('m3', 'conv-1', 'user-3', 'Janier Mosquera', 'Excelente, avísame cuando termines para la validación final.', 'text', 'read', '2026-02-23T09:00:00Z'),
    ('m4', 'conv-1', 'user-2', 'Edwin Bedoya', '¿Ya revisaste el lote G-90? Necesito tu aprobación.', 'text', 'delivered', '2026-02-23T11:25:00Z');

-- Conversación grupal: Equipo Calidad ISO
INSERT INTO conversations (id, type, title) VALUES
    ('conv-2', 'group', 'Equipo Calidad ISO');

INSERT INTO conversation_participants (conversation_id, user_id, username, role, avatar, is_online) VALUES
    ('conv-2', 'user-3', 'Janier Mosquera', 'Coord. Calidad', 'JM', TRUE),
    ('conv-2', 'user-1', 'Alejandro Agudelo', 'Inspector Calidad', 'AA', TRUE),
    ('conv-2', 'user-4', 'Jorge Pabón', 'Inspector Calidad', 'JP', FALSE),
    ('conv-2', 'user-7', 'Sara Hurtado', 'Inspector Calidad', 'SH', TRUE);

INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, type, read_status, created_at) VALUES
    ('m5', 'conv-2', 'user-7', 'Sara Hurtado', 'Equipo, recordar que la auditoría externa es el viernes.', 'text', 'read', '2026-02-23T09:00:00Z'),
    ('m6', 'conv-2', 'user-3', 'Janier Mosquera', 'Entendido. Ya tengo el listado de documentación pendiente.', 'text', 'read', '2026-02-23T09:15:00Z'),
    ('m7', 'conv-2', 'user-1', 'Alejandro Agudelo', '¿Necesitan apoyo con la preparación de evidencias?', 'text', 'read', '2026-02-23T09:30:00Z');

-- Conversación vinculada a NC
INSERT INTO conversations (id, type, title, module_type, module_id, module_title) VALUES
    ('conv-3', 'module-linked', 'NC-24-089: Desviación dimensional', 'nc', 'NC-24-089', 'Desviación dimensional en lote A-102');

INSERT INTO conversation_participants (conversation_id, user_id, username, role, avatar, is_online) VALUES
    ('conv-3', 'user-3', 'Janier Mosquera', 'Coord. Calidad', 'JM', TRUE),
    ('conv-3', 'user-5', 'Jhonatan Guerra', 'Inspector Calidad', 'JG', FALSE);

INSERT INTO messages (id, conversation_id, sender_id, sender_name, content, type, read_status, created_at) VALUES
    ('m8', 'conv-3', 'user-3', 'Janier Mosquera', 'Jhonatan, detectamos la desviación en el lote A-102. ¿Puedes verificar en planta?', 'text', 'read', '2026-02-22T14:00:00Z'),
    ('m9', 'conv-3', 'user-5', 'Jhonatan Guerra', 'Revisé las muestras, confirmo la desviación de 2mm.', 'text', 'delivered', '2026-02-23T09:30:00Z');

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Tablas creadas:
--   1. conversations          - Conversaciones
--   2. conversation_participants - Participantes por conversación
--   3. messages               - Mensajes
--   4. message_reads          - Registro de lecturas
--
-- Funciones:
--   - update_conversation_timestamp() - Auto-actualiza timestamp
--   - get_unread_count()              - Cuenta mensajes no leídos
--
-- Vista:
--   - v_conversations_with_last_message - Lista optimizada
-- ============================================================
