-- SCRIPT DE INFRAESTRUCTURA PARA AGENTE IA (ALCO RAG)
-- Ejecuta este script en el editor SQL de Insforge

-- 1. Habilitar extensión vectorial (si no está activa)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear tabla de fragmentos de conocimiento
CREATE TABLE IF NOT EXISTS kb_fragments (
  id BIGSERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- 768 es la dimensión de 'text-embedding-004' o 'embedding-001' de Google
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índice para búsqueda semántica rápida
CREATE INDEX IF NOT EXISTS kb_fragments_embedding_idx ON kb_fragments 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Crear función para búsqueda de similitud (RPC)
CREATE OR REPLACE FUNCTION match_kb_fragments (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_fragments.id,
    kb_fragments.content,
    kb_fragments.metadata,
    1 - (kb_fragments.embedding <=> query_embedding) AS similarity
  FROM kb_fragments
  WHERE 1 - (kb_fragments.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
