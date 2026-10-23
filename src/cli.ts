import type { AIMessageChunk } from "@langchain/core/messages";
import { graph } from "./graph/graph.ts";
import { llm } from "./llm.ts";
import { cite, getLaw } from "./ingestion/laws.ts";
import { loadLaw } from "./ingestion/load.ts";
import { chunkLaw } from "./ingestion/chunking.ts";
import { applyReforms, loadReforms } from "./ingestion/reforms.ts";
import { parseArgs } from "node:util";
import { hybridSearch } from "./retrieval/hybrid.ts";
import { LexicalRetriever } from "./retrieval/lexical.ts";
import type { SearchFilter } from "./retrieval/filters.ts";
import { semanticRetriever } from "./retrieval/semantic.ts";
import { pool } from "./vector-store.ts";

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "ask": {
    // RAG: analyze → retrieve → generate. Muestra cada paso y transmite la respuesta.
    const stream = await graph.stream({ question: args.join(" ") }, { streamMode: ["updates", "messages"] });
    for await (const [mode, data] of stream) {
      if (mode === "updates" && data.analyze) console.log("🔎 Análisis:", data.analyze.analysis, "\n");
      if (mode === "updates" && data.retrieve) {
        console.log("📚 Artículos recuperados:");
        for (const doc of data.retrieve.documents) console.log(`   - ${cite(doc.metadata)}  [${doc.id}]`);
        console.log();
      }
      // Tokens del LLM, solo los del nodo generate (analyze también usa el LLM).
      if (mode === "messages" && data[1].langgraph_node === "generate") process.stdout.write((data[0] as AIMessageChunk).text);
    }
    process.stdout.write("\n");
    await pool.end();
    break;
  }
  case "chat": {
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
    // pnpm search "artículo 82" [--mode semantic|lexical|hybrid] [--law codigo-trabajo] [--article 82]
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: { mode: { type: "string", default: "hybrid" }, law: { type: "string" }, article: { type: "string" } },
    });
    const query = positionals.join(" ");
    const filter: SearchFilter = { law: values.law ? getLaw(values.law).id : undefined, article: values.article };
    const docs =
      values.mode === "semantic" ? await semanticRetriever(filter).invoke(query)
      : values.mode === "lexical" ? await new LexicalRetriever(filter).invoke(query)
      : await hybridSearch(query, filter);
    docs.forEach((doc, i) => console.log(`${i + 1}. ${cite(doc.metadata)}  [${doc.id}]\n   ${doc.pageContent.split("\n")[1]}`));
    await pool.end();
    break;
  }
  default:
    console.log('Uso: pnpm ask "pregunta" | pnpm chat "pregunta" | pnpm page <ley> <página> | pnpm article <ley> <número> | pnpm search "consulta" [--mode semantic|lexical|hybrid] [--law <ley>] [--article <n>]');
}
