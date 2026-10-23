-- Tabla de chunks: texto + vector + metadata (ley, artículo, página, vigencia).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS law_chunks (
  id        text PRIMARY KEY,            -- "trabajo-82", "civil-82"
  content   text NOT NULL,
  metadata  jsonb NOT NULL,
  embedding vector(1536) NOT NULL,       -- openai/text-embedding-3-small
  -- Búsqueda léxica (paso 5): índice de palabras en español.
  fts       tsvector GENERATED ALWAYS AS (to_tsvector('spanish', content)) STORED
);

CREATE INDEX IF NOT EXISTS law_chunks_embedding_idx ON law_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS law_chunks_fts_idx ON law_chunks USING gin (fts);
