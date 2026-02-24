-- ============================================================
-- SISTEMA UNIFICADO DE NOTIFICACIONES — Schema SQL
-- Para ejecutar en el Editor SQL de InsForge
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLA: internal_notifications
-- Notificaciones internas tipo campana (🔔)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internal_notifications (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT NOT NULL DEFAULT '',
    reference_id    TEXT,
    module_name     TEXT,
    event_type      TEXT,
    priority        TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON internal_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON internal_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_module ON internal_notifications(module_name);

-- ────────────────────────────────────────────────────────────
-- 2. TABLA: automation_rules
-- Reglas configurables del motor de automatización
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name            TEXT NOT NULL DEFAULT '',
    description     TEXT DEFAULT '',
    event_type      TEXT NOT NULL,
    module_name     TEXT NOT NULL,
    condition_json  JSONB DEFAULT '{}',
    actions_json    JSONB DEFAULT '{"send_email": false, "create_internal_notification": true, "create_chat_thread": false}',
    recipients_json JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_event ON automation_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_rules_module ON automation_rules(module_name);
CREATE INDEX IF NOT EXISTS idx_rules_active ON automation_rules(is_active);

-- ────────────────────────────────────────────────────────────
-- 3. TABLA: email_logs
-- Registro de todos los correos enviados o intentados
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    module_name     TEXT,
    reference_id    TEXT,
    recipient       TEXT NOT NULL,
    subject         TEXT NOT NULL,
    body            TEXT DEFAULT '',
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'queued')),
    error_message   TEXT,
    triggered_by    TEXT,
    rule_id         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_module ON email_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 4. TABLA: event_logs
-- Registro de todos los eventos emitidos (auditoría)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_logs (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    event_type      TEXT NOT NULL,
    module_name     TEXT NOT NULL,
    reference_id    TEXT,
    triggered_by    TEXT,
    payload_json    JSONB DEFAULT '{}',
    rules_matched   INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at DESC);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Tablas creadas:
--   1. internal_notifications  - Notificaciones tipo campana
--   2. automation_rules        - Reglas de automatización
--   3. email_logs              - Registro de correos
--   4. event_logs              - Registro de eventos (auditoría)
-- ============================================================
