# Scenarios for the "AI Guatemalan Lawyer" RAG demo.
# Language: ASD-STE100 Simplified Technical English. Test inputs stay in Spanish.
# Each Rule agrees with one git tag (step-0 ... step-8). Each scenario has an ID (QA-NN).

Feature: AI Guatemalan Lawyer
  The system answers questions about the Guatemalan Labor Code and Civil Code.
  The system finds the applicable articles before it writes an answer.
  The answer gives the law, the article, and the page of each source.

  Background:
    Given the PostgreSQL container operates
    And the file ".env" contains a valid OPENROUTER_API_KEY

  Rule: Step 0 - The chatbot without RAG answers without evidence

    @step-0 @QA-01
    Scenario: The chatbot answers the guide question without Guatemalan law
      When I run 'pnpm chat "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"'
      Then the answer does not cite "Código de Trabajo, art. 82"
      And the answer does not refer to an article that the system found

  Rule: Step 1 - The loader extracts clean pages from the PDF files

    @step-1 @QA-02
    Scenario: The loader removes the page header and keeps the page number
      When I run "pnpm page codigo-trabajo 31"
      Then the output shows "142 páginas cargadas"
      And the page text does not start with "OFICINA NACIONAL DE SERVICIO CIVIL"
      And the metadata contains "law: 'codigo-trabajo'" and "page: 31"

  Rule: Step 2 - The chunker makes one chunk for each article

    @step-2 @QA-03
    Scenario: A long article becomes three parts with the same page
      When I run "pnpm article codigo-trabajo 82"
      Then the output shows "499 chunks"
      And the output shows the IDs "trabajo-82-p1", "trabajo-82-p2" and "trabajo-82-p3"
      And each part starts with "Código de Trabajo, artículo 82:"
      And each part has "page: 36"

    @step-2 @QA-04
    Scenario: The reform file marks a repealed article
      Given the file "data/reformas/decreto-13-2017.md" lists article "82" of "codigo-civil"
      When I run "pnpm article codigo-civil 82"
      Then the chunk "civil-82" has "in_force: false"
      And the chunk "civil-82" has "repealed_by: 'Decreto 13-2017'"

    @step-2 @QA-05
    Scenario: The unit tests for the chunker pass
      When I run "pnpm test"
      Then the output shows "2 passed"

  Rule: Step 3 - The ingestion stores the embeddings in pgvector

    @step-3 @QA-06
    Scenario: The ingestion loads all chunks of the two laws
      When I run "pnpm ingest"
      Then the output shows "Listo: 2505 chunks en law_chunks."

    @step-3 @QA-07
    Scenario: The database row of a repealed article keeps its metadata
      Given the ingestion is complete
      When I query the table "law_chunks" for the IDs "trabajo-78" and "civil-82"
      Then the row "civil-82" has "in_force": false
      And each row has an embedding with 1536 dimensions

    @step-3 @workshop @QA-08
    Scenario: A failed ingestion does not delete the data
      Given the branch "workshop" is active
      And the block "STEP 1" is commented out
      When I run "pnpm ingest"
      Then the output shows "STEP 1: descomenta loadLaw"
      And the table "law_chunks" still contains 2505 rows

  Rule: Step 4 - The semantic search finds articles by meaning

    @step-4 @QA-09
    Scenario: The semantic search finds dismissal articles without the same words
      When I run 'pnpm search "¿Me tienen que pagar algo si me despiden sin motivo?" --mode semantic'
      Then the results contain "Código de Trabajo, art. 82"
      And the results contain "Código de Trabajo, art. 78"

    @step-4 @QA-10
    Scenario: The semantic search does not find an article by its number
      When I run 'pnpm search "¿Qué dice el artículo 82?" --mode semantic'
      Then the first result is not "Código de Trabajo, art. 82"

  Rule: Step 5 - The lexical search and the hybrid search find exact words

    @step-5 @QA-11
    Scenario: The lexical search finds the article by its number
      When I run 'pnpm search "¿Qué dice el artículo 82?" --mode lexical'
      Then the first result is "Código de Trabajo, art. 82"

    @step-5 @QA-12
    Scenario: The hybrid search combines the two rankings
      When I run 'pnpm search "¿Qué dice el artículo 82?"'
      Then the results contain "Código de Trabajo, art. 82"
      And the output shows not more than 5 results

  Rule: Step 6 - The metadata filters control which chunks can enter

    @step-6 @QA-13
    Scenario: The search does not return a repealed article
      When I run 'pnpm search "¿Qué dice el artículo 82?" --mode lexical'
      Then the results do not contain "Código Civil, art. 82"

    @step-6 @QA-14
    Scenario: The law filter returns articles of one law only
      When I run 'pnpm search "¿Qué dice el artículo 82?" --law codigo-trabajo'
      Then each result starts with "Código de Trabajo"

    @step-6 @QA-15
    Scenario: The article filter returns the parts of one article only
      When I run 'pnpm search "artículo 82" --law codigo-trabajo --article 82 --mode lexical'
      Then the output shows the IDs "trabajo-82-p1", "trabajo-82-p2" and "trabajo-82-p3"
      And the output shows no other ID

  Rule: Step 7 - The RAG graph analyzes, retrieves, and generates

    @step-7 @QA-16
    Scenario: The RAG answer cites the applicable article
      When I run 'pnpm ask "Me despidieron sin causa justificada después de 3 años. ¿Qué indemnización me corresponde?"'
      Then the analysis shows "needsSearch: true" and "law: 'codigo-trabajo'"
      And the retrieved articles contain "Código de Trabajo, art. 82"
      And the answer contains "Fuente: Código de Trabajo, art. 82"
      And the answer tells that the salary is necessary to calculate the amount

    @step-7 @QA-17
    Scenario: A general question does not start a search
      When I run 'pnpm ask "¿Qué es un contrato de trabajo?"'
      Then the analysis shows "needsSearch: false"
      And the output does not show "ARTÍCULOS RECUPERADOS"

    @step-7 @QA-18
    Scenario: A question about a repealed article gets no evidence
      When I run 'pnpm ask "¿Qué dice el artículo 82 del Código Civil?"'
      Then the analysis shows "law: 'codigo-civil'" and "article: '82'"
      And the output shows "ARTÍCULOS RECUPERADOS (0)"
      And the answer does not show the text of the repealed article

  Rule: Step 8 - The OpenAI-compatible API and Open WebUI give a chat interface

    @step-8 @QA-19
    Scenario: The API lists the model
      Given the API operates ("pnpm serve")
      When I send "GET http://localhost:8000/v1/models"
      Then the response contains the model "ai-guatemalan-lawyer" with the name "AI Guatemalan Lawyer"

    @step-8 @QA-20
    Scenario: The API sends the answer as a stream of events
      Given the API operates
      When I send a "POST /v1/chat/completions" request with "stream": true
      Then the response contains "chat.completion.chunk" events
      And the last event is "data: [DONE]"
      And the stream contains "Artículos consultados"

    @step-8 @QA-21
    Scenario: The API refuses a request without messages
      Given the API operates
      When I send a "POST /v1/chat/completions" request with an empty "messages" list
      Then the response status is 400

    @step-8 @QA-22
    Scenario: Open WebUI shows the model and the RAG answer
      Given the API operates
      And Open WebUI operates on "http://localhost:3080"
      When I select the model "AI Guatemalan Lawyer"
      And I send the guide question
      Then the chat shows an answer with "Fuente: Código de Trabajo, art. 82"
      And the chat shows the list "Artículos consultados"

  Rule: Workshop - The branch "workshop" shows each missing step

    @workshop @QA-23
    Scenario: A commented-out step gives an instruction
      Given the branch "workshop" is active
      When I run 'pnpm search "despido"'
      Then the output shows "STEP 4: descomenta semanticRetriever en src/retrieval/semantic.ts"
