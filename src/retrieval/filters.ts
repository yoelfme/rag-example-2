import type { LawId } from "../ingestion/laws.ts";

export type SearchFilter = { law?: LawId; article?: string };

// Filtro: quién puede entrar. Siempre solo artículos vigentes; ley y artículo son opcionales.
export function toMetadataFilter({ law, article }: SearchFilter = {}): Record<string, string | boolean> {
  // STEP 6: solo vigentes; ley y artículo opcionales.
  // return { in_force: true, ...(law && { law }), ...(article && { article }) };
  return {}; // placeholder: borrar al descomentar
}
