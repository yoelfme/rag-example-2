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
