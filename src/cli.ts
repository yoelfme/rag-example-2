import { llm } from "./llm.ts";

const [command, ...rest] = process.argv.slice(2);
const question = rest.join(" ");

if (command === "ask") {
  // Uso normal: la pregunta va directo al LLM, sin evidencia.
  const stream = await llm.stream(question);
  for await (const chunk of stream) process.stdout.write(chunk.text);
  process.stdout.write("\n");
} else {
  console.log('Uso: pnpm ask "pregunta"');
}
