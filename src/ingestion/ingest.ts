import { readFile } from "node:fs/promises";
import { pool, vectorStore } from "../vector-store.ts";
import { chunkLaw } from "./chunking.ts";
import { LAWS } from "./laws.ts";
import { loadLaw } from "./load.ts";
import { applyReforms, loadReforms } from "./reforms.ts";

// Indexar: PDF → artículos → reformas → embeddings → pgvector. Borra y recarga todo.
await pool.query(await readFile("sql/schema.sql", "utf8"));
await pool.query("TRUNCATE law_chunks");

const reforms = await loadReforms();

for (const law of LAWS) {
  const pages = await loadLaw(law);
  const chunks = applyReforms(await chunkLaw(law, pages), reforms);
  console.log(`${law.name}: ${pages.length} páginas → ${chunks.length} chunks. Generando embeddings...`);

  // addDocuments calcula los embeddings y hace INSERT.
  await vectorStore.addDocuments(chunks, { ids: chunks.map((c) => c.id!) });
}

const { rows } = await pool.query("SELECT count(*) FROM law_chunks");
console.log(`Listo: ${rows[0].count} chunks en law_chunks.`);
await pool.end();
