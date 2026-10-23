import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Law } from "./laws.ts";

// Inicio de artículo: "ARTÍCULO 82." o "ARTICULO 14 BIS." al inicio de línea.
// Solo mayúsculas: no corta en referencias como "el artículo 79".
const ARTICLE_HEADING = /^ART[IÍ]CULO\s*(\d+(?:\s+(?:BIS|TER|QUATER))?)\s*\./gm;

// Artículos más largos que esto se dividen con el splitter recursivo.
const MAX_CHUNK_SIZE = 1500;

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: MAX_CHUNK_SIZE, chunkOverlap: 150 });

type Article = { article: string; page: number; text: string };

// Chunking estructural: un artículo = un chunk.
export function splitIntoArticles(pages: Document[]): Article[] {
  const articles: Article[] = [];
  let current: Article | undefined;

  for (const page of pages) {
    let cursor = 0;
    for (const match of page.pageContent.matchAll(ARTICLE_HEADING)) {
      if (current) current.text += page.pageContent.slice(cursor, match.index);
      current = { article: match[1].toLowerCase(), page: page.metadata.page, text: "" };
      articles.push(current);
      cursor = match.index;
    }
    // El resto de la página pertenece al artículo abierto (puede seguir en la siguiente).
    if (current) current.text += page.pageContent.slice(cursor) + "\n";
  }
  return articles.map((a) => ({ ...a, text: a.text.trim() }));
}

// Chunking recursivo solo para artículos largos; cada parte conserva ley y artículo.
export async function chunkLaw(law: Law, pages: Document[]): Promise<Document[]> {
  const chunks: Document[] = [];
  const seen = new Map<string, number>();

  for (const { article, page, text } of splitIntoArticles(pages)) {
    // Algunos PDFs repiten un número (texto reformado + original): id único con sufijo.
    const baseId = `${law.id.replace("codigo-", "")}-${article.replace(" ", "-")}`;
    const count = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-v${count}`;

    const parts = text.length > MAX_CHUNK_SIZE ? await splitter.splitText(text) : [text];
    parts.forEach((part, i) => {
      chunks.push(
        new Document({
          id: parts.length === 1 ? id : `${id}-p${i + 1}`,
          // Prefijo con la ley: el fragmento se entiende solo (y se cita) aunque esté partido.
          pageContent: `${law.name}, artículo ${article}:\n${part}`,
          metadata: { law: law.id, article, page, in_force: true },
        }),
      );
    });
  }
  return chunks;
}
