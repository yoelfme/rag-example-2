import { readdir, readFile } from "node:fs/promises";
import type { Document } from "@langchain/core/documents";
import matter from "gray-matter";

const REFORMS_DIR = "data/reformas";

type Reform = { decree: string; law: string; articles: string[]; status: "derogado" };

// Cada reforma es un markdown con frontmatter: actualizar la base, no reentrenar el modelo.
export async function loadReforms(): Promise<Reform[]> {
  const files = await readdir(REFORMS_DIR);
  return Promise.all(
    files.filter((f) => f.endsWith(".md")).map(async (f) => matter(await readFile(`${REFORMS_DIR}/${f}`, "utf8")).data as Reform),
  );
}

// Marca como no vigentes los artículos derogados.
export function applyReforms(chunks: Document[], reforms: Reform[]): Document[] {
  for (const reform of reforms) {
    for (const chunk of chunks) {
      const { law, article } = chunk.metadata;
      if (law === reform.law && reform.articles.includes(article)) {
        chunk.metadata.in_force = false;
        chunk.metadata.repealed_by = `Decreto ${reform.decree}`;
      }
    }
  }
  return chunks;
}
