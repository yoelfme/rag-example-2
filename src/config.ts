import { z } from "zod";

// Variables de entorno validadas al arrancar.
const Env = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "Falta OPENROUTER_API_KEY en .env"),
  LLM_MODEL: z.string().default("anthropic/claude-haiku-5.5"),
  EMBEDDING_MODEL: z.string().default("openai/text-embedding-3-small"),
  DATABASE_URL: z.string().default("postgres://rag:rag@localhost:5432/rag"),
});

export const config = Env.parse(process.env);

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
