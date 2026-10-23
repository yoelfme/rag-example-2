# AI Guatemalan Lawyer — del chatbot a RAG

Demo de la charla **«AI Engineering: del chatbot a RAG»**. Responde preguntas sobre el
Código de Trabajo y el Código Civil de Guatemala citando el artículo exacto.

> Ejemplo didáctico. No sustituye asesoría legal.

## Requisitos

- Node.js 24+ (ejecuta TypeScript nativo, sin build)
- pnpm
- Docker
- API key de [OpenRouter](https://openrouter.ai)

```bash
pnpm install
cp .env.example .env   # agrega tu OPENROUTER_API_KEY
docker compose up -d
```

## Pasos

Cada paso es un tag de git: `git checkout step-N-...`. Los diagramas están en `docs/diagrams/`.

### Paso 0 · Chatbot sin RAG (`step-0-chatbot`)

La pregunta va directo al LLM. Puede inventar el artículo.

```bash
pnpm ask "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"
```

Archivos: `src/config.ts`, `src/llm.ts`, `src/cli.ts`.

### Paso 1 · Cargar y limpiar (`step-1-load`)

`PDFLoader` crea un `Document` por página. Quitamos el encabezado repetido y guardamos
`law` y `page` como metadata para poder citar después.

```bash
pnpm page codigo-trabajo 31
```

Archivos: `src/ingestion/laws.ts`, `src/ingestion/load.ts`.

### Paso 2 · Chunking (`step-2-chunking`)

Chunking estructural: **un artículo = un chunk** (las leyes ya traen su unidad natural).
Solo los artículos de más de 1500 caracteres se dividen con `RecursiveCharacterTextSplitter`,
y cada parte conserva el prefijo «Código de Trabajo, artículo 82:».

Las reformas viven en `data/reformas/*.md` (frontmatter) y marcan artículos como `in_force: false`.

```bash
pnpm article codigo-trabajo 82   # 3 partes, página 36
pnpm article codigo-civil 82     # in_force: false (Decreto 13-2017)
pnpm test
```

Archivos: `src/ingestion/chunking.ts`, `src/ingestion/reforms.ts`, `data/reformas/decreto-13-2017.md`.
