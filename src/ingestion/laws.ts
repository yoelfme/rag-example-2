// Leyes del corpus. `id` se guarda como metadata `law`.
export const LAWS = [
  { id: "codigo-trabajo", name: "Código de Trabajo", file: "data/pdfs/codigo-trabajo.pdf" },
  { id: "codigo-civil", name: "Código Civil", file: "data/pdfs/codigo-civil.pdf" },
] as const;

export type Law = (typeof LAWS)[number];
export type LawId = Law["id"];

export function getLaw(id: string): Law {
  const law = LAWS.find((l) => l.id === id);
  if (!law) throw new Error(`Ley desconocida: ${id}. Opciones: ${LAWS.map((l) => l.id).join(", ")}`);
  return law;
}

// Cita legible de un chunk: "Código de Trabajo, art. 82 (p. 36)".
export function cite(metadata: Record<string, any>): string {
  return `${getLaw(metadata.law).name}, art. ${metadata.article} (p. ${metadata.page})`;
}
