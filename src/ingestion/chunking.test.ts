import { Document } from "@langchain/core/documents";
import { expect, test } from "vitest";
import { chunkLaw, splitIntoArticles } from "./chunking.ts";
import { getLaw } from "./laws.ts";

const pages = [
  new Document({ pageContent: "CONSIDERANDO: preámbulo\nARTÍCULO 81. Texto del 81.\nARTÍCULO 82. Despido injustificado,", metadata: { page: 1 } }),
  new Document({ pageContent: "según el artículo 79.\nARTÍCULO 82 BIS. Agregado.", metadata: { page: 2 } }),
];

test("un artículo por chunk, con la página donde inicia", () => {
  const articles = splitIntoArticles(pages);
  expect(articles.map((a) => a.article)).toEqual(["81", "82", "82 bis"]);
  // La referencia "artículo 79" no abre un artículo nuevo y el 82 continúa en la página 2.
  expect(articles[1]).toMatchObject({ page: 1, text: "ARTÍCULO 82. Despido injustificado,\nsegún el artículo 79." });
});

test("cada chunk lleva ley, artículo y un id legible", async () => {
  const [, chunk] = await chunkLaw(getLaw("codigo-trabajo"), pages);
  expect(chunk.id).toBe("trabajo-82");
  expect(chunk.pageContent.startsWith("Código de Trabajo, artículo 82:")).toBe(true);
  expect(chunk.metadata).toEqual({ law: "codigo-trabajo", article: "82", page: 1, in_force: true });
});
