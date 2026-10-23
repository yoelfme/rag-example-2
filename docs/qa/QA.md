# QA guide: AI Guatemalan Lawyer

This guide tells you how to test the RAG demo. Each test agrees with one scenario in
[`ai-guatemalan-lawyer.feature`](ai-guatemalan-lawyer.feature). Each scenario has an ID (QA-01 ... QA-23).

Language: ASD-STE100 Simplified Technical English. Test inputs and expected outputs stay in Spanish
because the application uses Spanish.

## 1. Terms

| Term | Meaning |
|---|---|
| Chunk | One part of a law that the system stores and finds. Usually one article. |
| Embedding | A list of 1536 numbers that represents the meaning of a text. |
| Semantic search | A search that compares embeddings. It finds text with a similar meaning. |
| Lexical search | A search that compares words. It finds exact numbers and terms. |
| Hybrid search | A search that combines the semantic ranking and the lexical ranking (Reciprocal Rank Fusion). |
| Metadata filter | A condition on the law, the article, or `in_force`. Only chunks that agree with the condition can enter the results. |
| Repealed article | An article that is not in force. The system marks it with `in_force: false`. |

## 2. Equipment and preparation

You must have:

- Node.js 24 or later
- pnpm
- Docker
- An OpenRouter API key

Do these steps one time before the tests:

1. Install the dependencies: `pnpm install`.
2. Copy `.env.example` to `.env`.
3. Write your key in `.env` (`OPENROUTER_API_KEY=...`).
4. Start the containers: `docker compose up -d`.
5. Load the laws into the database: `pnpm ingest`. The ingestion takes approximately 30 seconds.

## 3. Test order

Do the tests in the order of the IDs. Some tests use the result of an earlier test:

- QA-07 and all tests after QA-07 need the data from QA-06.
- QA-19 to QA-22 need the API. Start it with `pnpm serve` in a second terminal.
- QA-08 and QA-23 need the branch `workshop`. Do these tests last.

The answers of the LLM are not always the same. For the LLM tests (QA-01, QA-16 to QA-18, QA-20, QA-22),
examine the meaning of the answer. Do not compare the exact text.

## 4. Test procedures

### Step 0: Chatbot without RAG

**QA-01. The chatbot answers without Guatemalan law.**

1. Run `pnpm chat "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"`.
2. Read the answer.
3. Make sure that the answer does not cite "Código de Trabajo, art. 82".

Expected result: the answer uses the law of a different country, or the answer does not give an article.

### Step 1: Load

**QA-02. The loader removes the page header.**

1. Run `pnpm page codigo-trabajo 31`.
2. Make sure that the output shows `142 páginas cargadas`.
3. Make sure that the text does not start with `OFICINA NACIONAL DE SERVICIO CIVIL`.
4. Make sure that the metadata shows `law: 'codigo-trabajo'` and `page: 31`.

### Step 2: Chunking

**QA-03. A long article becomes three parts.**

1. Run `pnpm article codigo-trabajo 82`.
2. Make sure that the output shows `499 chunks`.
3. Make sure that the IDs are `trabajo-82-p1`, `trabajo-82-p2` and `trabajo-82-p3`.
4. Make sure that each part starts with `Código de Trabajo, artículo 82:` and has `page: 36`.

**QA-04. The reform file marks a repealed article.**

1. Run `pnpm article codigo-civil 82`.
2. Make sure that the chunk `civil-82` has `in_force: false`.
3. Make sure that the chunk `civil-82` has `repealed_by: 'Decreto 13-2017'`.

**QA-05. The unit tests pass.**

1. Run `pnpm test`.
2. Make sure that the output shows `2 passed`.

### Step 3: Embeddings and vector database

**QA-06. The ingestion loads all chunks.**

1. Run `pnpm ingest`.
2. Make sure that the last line is `Listo: 2505 chunks en law_chunks.`

**QA-07. The database row keeps its metadata.**

1. Run this command:

   ```bash
   docker compose exec postgres psql -U rag -c \
     "SELECT id, metadata, vector_dims(embedding) FROM law_chunks WHERE id IN ('trabajo-78', 'civil-82');"
   ```

2. Make sure that the row `civil-82` has `"in_force": false`.
3. Make sure that the column `vector_dims` shows `1536` for each row.

**QA-08. A failed ingestion does not delete the data.** Do this test on the branch `workshop` (see section 5).

### Step 4: Semantic search

**QA-09. The semantic search finds articles by meaning.**

1. Run `pnpm search "¿Me tienen que pagar algo si me despiden sin motivo?" --mode semantic`.
2. Make sure that the results contain `Código de Trabajo, art. 82` and `Código de Trabajo, art. 78`.

**QA-10. The semantic search does not find an article by its number.**

1. Run `pnpm search "¿Qué dice el artículo 82?" --mode semantic`.
2. Make sure that the first result is not `Código de Trabajo, art. 82`.

Expected result: this is a known limit of the semantic search. QA-11 shows the solution.

### Step 5: Lexical search and hybrid search

**QA-11. The lexical search finds the article by its number.**

1. Run `pnpm search "¿Qué dice el artículo 82?" --mode lexical`.
2. Make sure that the first result is `Código de Trabajo, art. 82`.

**QA-12. The hybrid search combines the two rankings.**

1. Run `pnpm search "¿Qué dice el artículo 82?"`.
2. Make sure that the results contain `Código de Trabajo, art. 82`.
3. Make sure that the output shows not more than 5 results.

### Step 6: Metadata filters

**QA-13. The search does not return a repealed article.**

1. Run `pnpm search "¿Qué dice el artículo 82?" --mode lexical`.
2. Make sure that the results do not contain `Código Civil, art. 82`.

**QA-14. The law filter returns one law only.**

1. Run `pnpm search "¿Qué dice el artículo 82?" --law codigo-trabajo`.
2. Make sure that each result starts with `Código de Trabajo`.

**QA-15. The article filter returns one article only.**

1. Run `pnpm search "artículo 82" --law codigo-trabajo --article 82 --mode lexical`.
2. Make sure that the output shows only `trabajo-82-p1`, `trabajo-82-p2` and `trabajo-82-p3`.

### Step 7: RAG graph

**QA-16. The RAG answer cites the applicable article.**

1. Run `pnpm ask "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"`.
2. Make sure that the analysis shows `needsSearch: true` and `law: 'codigo-trabajo'`.
3. Make sure that the retrieved articles contain `Código de Trabajo, art. 82`.
4. Make sure that the answer contains `Fuente: Código de Trabajo, art. 82`.
5. Make sure that the answer tells you that it needs the salary to calculate the amount.

**QA-17. A general question does not start a search.**

1. Run `pnpm ask "¿Qué es un contrato de trabajo?"`.
2. Make sure that the analysis shows `needsSearch: false`.
3. Make sure that the output does not show `Artículos recuperados`.

**QA-18. A question about a repealed article gets no evidence.**

1. Run `pnpm ask "¿Qué dice el artículo 82 del Código Civil?"`.
2. Make sure that the analysis shows `law: 'codigo-civil'` and `article: '82'`.
3. Make sure that the list of retrieved articles is empty.
4. Make sure that the answer does not show the text of the repealed article.

### Step 8: API and Open WebUI

Start the API in a second terminal before these tests: `pnpm serve`.

**QA-19. The API lists the model.**

1. Run `curl -s localhost:8000/v1/models`.
2. Make sure that the response contains `"id":"ai-guatemalan-lawyer"` and `"name":"AI Guatemalan Lawyer"`.

**QA-20. The API sends the answer as a stream.**

1. Run this command:

   ```bash
   curl -N localhost:8000/v1/chat/completions -H 'content-type: application/json' \
     -d '{"stream": true, "messages": [{"role": "user", "content": "¿Cuántos días de vacaciones me corresponden?"}]}'
   ```

2. Make sure that each line starts with `data:` and contains `chat.completion.chunk`.
3. Make sure that the stream contains `Artículos consultados`.
4. Make sure that the last line is `data: [DONE]`.

**QA-21. The API refuses a request without messages.**

1. Run `curl -s -o /dev/null -w "%{http_code}" localhost:8000/v1/chat/completions -H 'content-type: application/json' -d '{"messages": []}'`.
2. Make sure that the output is `400`.

**QA-22. Open WebUI shows the model and the RAG answer.**

1. Open `http://localhost:3080` in a browser.
2. Select the model `AI Guatemalan Lawyer`.
3. Send the guide question.
4. Make sure that the answer contains `Fuente: Código de Trabajo, art. 82`.
5. Make sure that the answer ends with the list `Artículos consultados`.

## 5. Tests on the branch `workshop`

Do these tests last. Do not ingest the data again on this branch before QA-08.

1. Run `git switch workshop`.

**QA-08. A failed ingestion does not delete the data.**

1. Run `pnpm ingest`.
2. Make sure that the output shows `STEP 1: descomenta loadLaw`.
3. Run `docker compose exec postgres psql -U rag -tAc "SELECT count(*) FROM law_chunks"`.
4. Make sure that the output is `2505`.

**QA-23. A commented-out step gives an instruction.**

1. Run `pnpm search "despido"`.
2. Make sure that the output shows `STEP 4: descomenta semanticRetriever en src/retrieval/semantic.ts`.

After the tests, run `git switch main`.

## 6. Record the results

For each test, record:

- The ID (for example, QA-11)
- PASS or FAIL
- A screenshot of the output
- For a FAIL: the command, the output, and the expected result
