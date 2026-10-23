import { vectorStore } from "../vector-store.ts";

export const TOP_K = 5;

// Búsqueda semántica: embedding de la pregunta → los k vectores más cercanos (coseno).
export const semanticRetriever = vectorStore.asRetriever({ k: TOP_K });
