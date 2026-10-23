import { llm } from "./llm.ts";
import { cite, getLaw } from "./ingestion/laws.ts";
import { loadLaw } from "./ingestion/load.ts";
import { chunkLaw } from "./ingestion/chunking.ts";
import { applyReforms, loadReforms } from "./ingestion/reforms.ts";
import { parseArgs } from "node:util";
import { hybridSearch } from "./retrieval/hybrid.ts";
import { lexicalRetriever } from "./retrieval/lexical.ts";
import { semanticRetriever } from "./retrieval/semantic.ts";
import { pool } from "./vector-store.ts";

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
  case "article": {
    // pnpm article codigo-civil 82
    const law = getLaw(args[0]);
    const chunks = applyReforms(await chunkLaw(law, await loadLaw(law)), await loadReforms());
    console.log(`${chunks.length} chunks\n`, chunks.filter((c) => c.metadata.article === args[1]));
    break;
  }
  case "search": {
    // pnpm search "me despidieron sin motivo" [--mode semantic|lexical|hybrid]
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { mode: { type: "string", default: "hybrid" } } });
    const query = positionals.join(" ");
    const docs =
      values.mode === "semantic" ? await semanticRetriever.invoke(query)
      : values.mode === "lexical" ? await lexicalRetriever.invoke(query)
      : await hybridSearch(query);
    docs.forEach((doc, i) => console.log(`${i + 1}. ${cite(doc.metadata)}  [${doc.id}]\n   ${doc.pageContent.split("\n")[1]}`));
    await pool.end();
    break;
  }
  default:
    console.log('Uso: pnpm ask "pregunta" | pnpm page <ley> <página> | pnpm article <ley> <número> | pnpm search "consulta" [--mode semantic|lexical|hybrid]');
}
