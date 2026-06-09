-- ============================================================
-- SUBPROCESO: Instructivos de Diseños — Schema SQL
-- Para ejecutar en el motor de base de datos de InsForge (PostgreSQL)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLA: instructivos_diseno
-- Almacena la información principal de los instructivos de calidad
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instructivos_diseno (
    id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    codigo                  TEXT UNIQUE NOT NULL,
    version                 TEXT DEFAULT 'V1',
    nombre_diseno           TEXT NOT NULL,
    nombre_personalizado    TEXT NOT NULL,
    areas_aplicacion        JSONB DEFAULT '[]'::jsonb,
    elaborado_por           TEXT NOT NULL,
    revisado_por            TEXT,
    aprobado_por            TEXT,
    fecha_creacion          DATE NOT NULL,
    vigencia_hasta          DATE NOT NULL,
    estado                  TEXT DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'En Revisión', 'Aprobado', 'Obsoleto')),
    objetivo                TEXT NOT NULL,
    imagen_referencia       TEXT,
    descripcion_sistema     TEXT,
    
    -- Sub-elementos almacenados como JSONB para mantener la flexibilidad del MVP
    materiales              JSONB DEFAULT '[]'::jsonb,
    equipos_inspeccion      JSONB DEFAULT '[]'::jsonb,
    criterios               JSONB DEFAULT '[]'::jsonb,
    componentes_defectos    JSONB DEFAULT '[]'::jsonb,
    historial_versiones     JSONB DEFAULT '[]'::jsonb,
    
    -- Observaciones y Firmas en Base64/URLs
    observaciones_generales TEXT,
    firma_elaborado         TEXT,
    firma_revisado          TEXT,
    firma_aprobado          TEXT,
    
    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar las búsquedas
CREATE INDEX IF NOT EXISTS idx_instructivos_codigo ON instructivos_diseno(codigo);
CREATE INDEX IF NOT EXISTS idx_instructivos_estado ON instructivos_diseno(estado);
CREATE INDEX IF NOT EXISTS idx_instructivos_diseno ON instructivos_diseno(nombre_diseno);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
