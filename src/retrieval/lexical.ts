import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { pool } from "../vector-store.ts";
import { TOP_K } from "./semantic.ts";

// Palabras de la pregunta en español (stemming), unidas con OR; ordena por ts_rank.
const SQL = `
  WITH q AS (SELECT replace(plainto_tsquery('spanish', $1)::text, ' & ', ' | ')::tsquery AS query)
  SELECT id, content, metadata FROM law_chunks, q
  WHERE fts @@ q.query
  ORDER BY ts_rank(fts, q.query) DESC
  LIMIT $2`;

// Búsqueda léxica: coincidencia de palabras exactas (números de artículo, decretos, términos).
// Retriever propio: LangChain solo pide implementar _getRelevantDocuments.
export class LexicalRetriever extends BaseRetriever {
  lc_namespace = ["ai-guatemalan-lawyer", "retrievers"];

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const { rows } = await pool.query(SQL, [query, TOP_K]);
    return rows.map((row) => new Document({ id: row.id, pageContent: row.content, metadata: row.metadata }));
  }
}

export const lexicalRetriever = new LexicalRetriever();
