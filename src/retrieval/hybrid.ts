import { EnsembleRetriever } from "@langchain/classic/retrievers/ensemble";
import type { Document } from "@langchain/core/documents";
import { lexicalRetriever } from "./lexical.ts";
import { semanticRetriever, TOP_K } from "./semantic.ts";

// Búsqueda híbrida: combina ambos rankings con Reciprocal Rank Fusion y quita duplicados.
const hybridRetriever = new EnsembleRetriever({
  retrievers: [semanticRetriever, lexicalRetriever],
  weights: [0.5, 0.5],
});

export async function hybridSearch(query: string): Promise<Document[]> {
  // EnsembleRetriever devuelve la unión completa: nos quedamos con los TOP_K mejores.
  return (await hybridRetriever.invoke(query)).slice(0, TOP_K);
}
