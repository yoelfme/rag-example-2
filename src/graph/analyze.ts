import { llm } from "../llm.ts";
import { ANALYZE_PROMPT } from "../prompts.ts";
import { Analysis, type RagStateType } from "./state.ts";

// Structured output: el LLM responde un objeto que cumple el schema de Zod.
const analyzer = llm.withStructuredOutput(Analysis, { name: "analysis" });

export async function analyze(state: RagStateType) {
  const analysis = await analyzer.invoke([
    ["system", ANALYZE_PROMPT],
    ["human", state.question],
  ]);
  return { analysis };
}
