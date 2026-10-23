import { ChatOpenAI } from "@langchain/openai";
import { config, OPENROUTER_BASE_URL } from "./config.ts";

// Modelo generador: API compatible con OpenAI servida por OpenRouter.
export const llm = new ChatOpenAI({
  model: config.LLM_MODEL,
  apiKey: config.OPENROUTER_API_KEY,
  configuration: { baseURL: OPENROUTER_BASE_URL },
});
