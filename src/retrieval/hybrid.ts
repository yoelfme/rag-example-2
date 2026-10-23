import { EnsembleRetriever } from "@langchain/classic/retrievers/ensemble";
import type { Document } from "@langchain/core/documents";
import type { SearchFilter } from "./filters.ts";
import { LexicalRetriever } from "./lexical.ts";
import { semanticRetriever, TOP_K } from "./semantic.ts";

// Búsqueda híbrida: combina ambos rankings con Reciprocal Rank Fusion y quita duplicados.
export async function hybridSearch(query: string, filter: SearchFilter = {}): Promise<Document[]> {
  const retriever = new EnsembleRetriever({
    retrievers: [semanticRetriever(filter), new LexicalRetriever(filter)],
    weights: [0.5, 0.5],
  });
  // EnsembleRetriever devuelve la unión completa: nos quedamos con los TOP_K mejores.
  return (await retriever.invoke(query)).slice(0, TOP_K);
}
