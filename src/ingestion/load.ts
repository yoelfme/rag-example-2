import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import type { Law } from "./laws.ts";

// Encabezado repetido en cada página: "OFICINA NACIONAL DE SERVICIO CIVIL\n1085\n".
const PAGE_HEADER = /^OFICINA NACIONAL DE SERVICIO CIVIL\n\d+\n/;

// Extraer y limpiar: un Document por página, con ley y número de página.
export async function loadLaw(law: Law): Promise<Document[]> {
  const pages = await new PDFLoader(law.file).load();
  return pages.map(
    (page) =>
      new Document({
        pageContent: page.pageContent.replace(PAGE_HEADER, ""),
        metadata: { law: law.id, page: page.metadata.loc.pageNumber },
      }),
  );
}
