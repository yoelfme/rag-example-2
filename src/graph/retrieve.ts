import { hybridSearch } from "../retrieval/hybrid.ts";
import type { RagStateType } from "./state.ts";

// Recuperar: búsqueda híbrida con los filtros que extrajo analyze.
export async function retrieve(state: RagStateType) {
  const { searchQuery, law, article } = state.analysis!;
  const documents = await hybridSearch(searchQuery, { law: law ?? undefined, article: article ?? undefined });
  return { documents };
}
