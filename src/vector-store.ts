import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import pg from "pg";
import { config } from "./config.ts";
import { embeddings } from "./embeddings.ts";

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

// Base de datos vectorial: PostgreSQL + pgvector. Tabla definida en sql/schema.sql.
export const vectorStore = new PGVectorStore(embeddings, {
  pool,
  tableName: "law_chunks",
  columns: {
    idColumnName: "id",
    contentColumnName: "content",
    metadataColumnName: "metadata",
    vectorColumnName: "embedding",
  },
  distanceStrategy: "cosine",
});
