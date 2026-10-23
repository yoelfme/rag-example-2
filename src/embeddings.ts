import { OpenAIEmbeddings } from "@langchain/openai";
import { config, OPENROUTER_BASE_URL } from "./config.ts";

// Modelo de embeddings: texto → vector de 1536 números (para comparar y buscar).
export const embeddings = new OpenAIEmbeddings({
  model: config.EMBEDDING_MODEL,
  apiKey: config.OPENROUTER_API_KEY,
  configuration: { baseURL: OPENROUTER_BASE_URL },
  encodingFormat: "float",
  batchSize: 100,
});
