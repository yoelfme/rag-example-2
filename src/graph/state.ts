import type { Document } from "@langchain/core/documents";
import { StateSchema } from "@langchain/langgraph";
import { z } from "zod";

// Salida estructurada del nodo analyze (validada con Zod).
export const Analysis = z.object({
  needsSearch: z.boolean().describe("¿Hay que buscar en la ley para responder?"),
  law: z.enum(["codigo-trabajo", "codigo-civil"]).nullable().describe("Ley a filtrar, o null"),
  article: z.string().nullable().describe('Número de artículo mencionado, p. ej. "82", o null'),
  searchQuery: z.string().describe("Consulta para buscar en la ley"),
});

// Estado que viaja entre nodos: cada nodo lee y devuelve una parte.
export const RagState = new StateSchema({
  question: z.string(),
  analysis: Analysis.optional(),
  documents: z.array(z.custom<Document>()).default(() => []),
  answer: z.string().optional(),
});

export type RagStateType = typeof RagState.State;
