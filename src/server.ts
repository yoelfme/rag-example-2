import type { AIMessageChunk } from "@langchain/core/messages";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { graph } from "./graph/graph.ts";
import { cite } from "./ingestion/laws.ts";

// API compatible con OpenAI: Open WebUI (o cualquier cliente OpenAI) la usa como un modelo más.
const MODEL = { id: "ai-guatemalan-lawyer", name: "AI Guatemalan Lawyer" };
const PORT = 8000;

const ChatRequest = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.union([z.string(), z.array(z.any())]) })).min(1),
  stream: z.boolean().default(false),
});

// shortcut: solo usa el último mensaje del usuario (sin historial); agregar memoria si se necesita conversación.
function lastQuestion(messages: z.infer<typeof ChatRequest>["messages"]): string {
  const content = messages.findLast((m) => m.role === "user")?.content ?? "";
  return typeof content === "string" ? content : content.map((part) => part.text ?? "").join("");
}

// Formato de un chunk de streaming de OpenAI.
function completionChunk(content: string, finishReason: "stop" | null = null) {
  return JSON.stringify({
    id: "chatcmpl-rag",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: MODEL.id,
    choices: [{ index: 0, delta: { content }, finish_reason: finishReason }],
  });
}

const app = new Hono();

app.get("/v1/models", (c) =>
  c.json({ object: "list", data: [{ ...MODEL, object: "model", created: 0, owned_by: "rag-demo" }] }),
);

app.post("/v1/chat/completions", async (c) => {
  const parsed = ChatRequest.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: { message: parsed.error.message } }, 400);
  const question = lastQuestion(parsed.data.messages);

  if (!parsed.data.stream) {
    const { answer } = await graph.invoke({ question });
    return c.json({
      id: "chatcmpl-rag",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: MODEL.id,
      choices: [{ index: 0, message: { role: "assistant", content: answer }, finish_reason: "stop" }],
    });
  }

  // Server-Sent Events: tokens del nodo generate y, al final, los artículos consultados.
  return streamSSE(c, async (sse) => {
    let sources: string[] = [];
    const stream = await graph.stream({ question }, { streamMode: ["updates", "messages"] });
    for await (const [mode, data] of stream) {
      if (mode === "updates" && data.retrieve) sources = data.retrieve.documents.map((doc) => cite(doc.metadata));
      if (mode === "messages" && data[1].langgraph_node === "generate") {
        await sse.writeSSE({ data: completionChunk((data[0] as AIMessageChunk).text) });
      }
    }
    if (sources.length) {
      const list = [...new Set(sources)].map((s) => `- ${s}`).join("\n");
      await sse.writeSSE({ data: completionChunk(`\n\n---\n**Artículos consultados**\n${list}`) });
    }
    await sse.writeSSE({ data: completionChunk("", "stop") });
    await sse.writeSSE({ data: "[DONE]" });
  });
});

serve({ fetch: app.fetch, port: PORT }, () => console.log(`AI Guatemalan Lawyer en http://localhost:${PORT}/v1`));
