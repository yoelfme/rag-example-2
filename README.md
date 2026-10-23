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

La pregunta va directo al LLM. Puede inventar el artículo (desde el paso 7 este comando es `pnpm chat`).

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

### Paso 3 · Embeddings y base vectorial (`step-3-embeddings-vectordb`)

Cada chunk se convierte en un vector (`openai/text-embedding-3-small`, 1536 dimensiones)
y se guarda en PostgreSQL + pgvector junto con su texto y metadata. Tarda ~30 s.

```bash
pnpm ingest
docker compose exec postgres psql -U rag -c \
  "SELECT id, metadata, left(content, 60) FROM law_chunks WHERE id IN ('trabajo-78', 'civil-82');"
```

Archivos: `src/embeddings.ts`, `src/vector-store.ts`, `src/ingestion/ingest.ts`, `sql/schema.sql`.

### Paso 4 · Búsqueda semántica (`step-4-semantic-search`)

La pregunta se convierte en embedding y pgvector devuelve los `k` chunks más cercanos.
Encuentra ideas aunque las palabras no coincidan… pero falla con números exactos.

```bash
pnpm search "¿Me tienen que pagar algo si me despiden sin motivo?"   # arts. 78, 80, 82
pnpm search "¿Qué dice el artículo 82?"                              # no lo encuentra
```

Archivos: `src/retrieval/semantic.ts`.

### Paso 5 · Búsqueda léxica e híbrida (`step-5-lexical-hybrid`)

- **Léxica**: full-text search de PostgreSQL en español (columna `fts`). Encuentra «artículo 82»…
  de ambos códigos: no sabe de qué ley.
- **Híbrida**: `EnsembleRetriever` combina semántica + léxica con Reciprocal Rank Fusion.

```bash
pnpm search "¿Qué dice el artículo 82?" --mode lexical   # Trabajo 82 y Civil 82
pnpm search "¿Qué dice el artículo 82?"                  # híbrida (default)
```

Archivos: `src/retrieval/lexical.ts`, `src/retrieval/hybrid.ts`.

### Paso 6 · Filtros por metadatos (`step-6-metadata-filters`)

El filtro decide **quién puede entrar**; el ranking, **en qué orden**. Siempre `in_force: true`
(el art. 82 del Código Civil, derogado, ya no aparece) y opcionalmente ley y artículo.

```bash
pnpm search "¿Qué dice el artículo 82?" --mode lexical            # sin Civil 82
pnpm search "¿Qué dice el artículo 82?" --law codigo-trabajo      # solo Código de Trabajo
pnpm search "artículo 82" --law codigo-trabajo --article 82       # las 3 partes del art. 82
```

Archivos: `src/retrieval/filters.ts` (+ filtro en `semantic.ts`, `lexical.ts`, `hybrid.ts`).

### Paso 7 · Grafo RAG (`step-7-rag-graph`)

Un grafo de LangGraph con tres nodos:

1. **analyze**: structured output con Zod → `needsSearch`, `law`, `article`, `searchQuery`.
2. **retrieve**: búsqueda híbrida con esos filtros (se salta si `needsSearch` es `false`).
3. **generate**: prompt aumentado (pregunta + artículos) → respuesta con `Fuente: <ley>, art. N`.

```bash
pnpm ask "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"
pnpm ask "¿Qué es un contrato de trabajo?"           # no busca
pnpm ask "¿Qué dice el artículo 82 del Código Civil?" # derogado: no hay evidencia vigente
pnpm chat "Me despidieron sin causa..."               # comparación: el chatbot sin RAG
```

Archivos: `src/graph/state.ts`, `src/graph/analyze.ts`, `src/graph/retrieve.ts`, `src/graph/generate.ts`,
`src/graph/graph.ts`, `src/prompts.ts`.

### Paso 8 · Open WebUI (`step-8-open-webui`)

`src/server.ts` expone el grafo como una API compatible con OpenAI (Hono): `GET /v1/models` y
`POST /v1/chat/completions` con streaming (SSE). Open WebUI la usa como el modelo **AI Guatemalan Lawyer**.

```bash
docker compose up -d   # postgres + open-webui
pnpm serve             # API en http://localhost:8000/v1
open http://localhost:3080
```

Sin interfaz:

```bash
curl -N localhost:8000/v1/chat/completions -H 'content-type: application/json' \
  -d '{"stream": true, "messages": [{"role": "user", "content": "¿Cuántos días de vacaciones me corresponden?"}]}'
```

Archivos: `src/server.ts`, `docker-compose.yml`.
