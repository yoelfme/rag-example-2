import { llm } from "./llm.ts";
import { getLaw } from "./ingestion/laws.ts";
import { loadLaw } from "./ingestion/load.ts";

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "ask": {
    // Uso normal: la pregunta va directo al LLM, sin evidencia.
    const stream = await llm.stream(args.join(" "));
    for await (const chunk of stream) process.stdout.write(chunk.text);
    process.stdout.write("\n");
    break;
  }
  case "page": {
    // pnpm page codigo-trabajo 31
    const pages = await loadLaw(getLaw(args[0]));
    const page = pages.find((p) => p.metadata.page === Number(args[1]));
    console.log(`${pages.length} páginas cargadas\n`, page);
    break;
  }
  default:
    console.log('Uso: pnpm ask "pregunta" | pnpm page <ley> <página>');
}
