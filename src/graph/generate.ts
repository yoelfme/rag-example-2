import { cite } from "../ingestion/laws.ts";
import { llm } from "../llm.ts";
import { GENERATE_PROMPT } from "../prompts.ts";
import type { RagStateType } from "./state.ts";

// Aumentar + generar: la pregunta viaja junto con los artículos recuperados.
export async function generate(state: RagStateType) {
  const articles = state.documents.map((doc) => `[${cite(doc.metadata)}]\n${doc.pageContent}`).join("\n\n");
  const searched = state.analysis?.needsSearch;
  // Sin búsqueda: pregunta sola. Con búsqueda sin resultados: decirlo (puede estar derogado).
  const context = articles || "Ninguno: no hay artículos vigentes que coincidan (puede estar derogado).";
  const prompt = searched ? `Artículos:\n${context}\n\nPregunta: ${state.question}` : state.question;

  const response = await llm.invoke([
    ["system", GENERATE_PROMPT],
    ["human", prompt],
  ]);
  return { answer: response.text };
}
