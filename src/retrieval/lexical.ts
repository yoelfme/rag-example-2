import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { pool } from "../vector-store.ts";
import { type SearchFilter, toMetadataFilter } from "./filters.ts";
import { TOP_K } from "./semantic.ts";

// Palabras de la pregunta en español (stemming), unidas con OR; ordena por ts_rank.
// metadata @> $3: el chunk debe contener el filtro (ley, vigencia).
const SQL = `
  WITH q AS (SELECT replace(plainto_tsquery('spanish', $1)::text, ' & ', ' | ')::tsquery AS query)
  SELECT id, content, metadata FROM law_chunks, q
  WHERE fts @@ q.query AND metadata @> $3
  ORDER BY ts_rank(fts, q.query) DESC
  LIMIT $2`;

// Búsqueda léxica: coincidencia de palabras exactas (números de artículo, decretos, términos).
// Retriever propio: LangChain solo pide implementar _getRelevantDocuments.
export class LexicalRetriever extends BaseRetriever {
  lc_namespace = ["ai-guatemalan-lawyer", "retrievers"];
  filter: Record<string, string | boolean>;

  constructor(filter: SearchFilter = {}) {
    super();
    this.filter = toMetadataFilter(filter);
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // STEP 5a: full-text search en PostgreSQL → Documents.
    // const { rows } = await pool.query(SQL, [query, TOP_K, this.filter]);
    // return rows.map((row) => new Document({ id: row.id, pageContent: row.content, metadata: row.metadata }));
    throw new Error("STEP 5a: descomenta LexicalRetriever en src/retrieval/lexical.ts"); // placeholder: borrar al descomentar
  }
}
