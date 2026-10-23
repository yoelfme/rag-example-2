import type { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { vectorStore } from "../vector-store.ts";
import { type SearchFilter, toMetadataFilter } from "./filters.ts";

export const TOP_K = 5;

// Búsqueda semántica: embedding de la pregunta → los k vectores más cercanos (coseno).
export function semanticRetriever(filter: SearchFilter = {}): VectorStoreRetriever {
  return vectorStore.asRetriever({ k: TOP_K, filter: toMetadataFilter(filter) });
}
