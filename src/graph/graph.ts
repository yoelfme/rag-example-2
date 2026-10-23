import { END, START, StateGraph } from "@langchain/langgraph";
import { analyze } from "./analyze.ts";
import { generate } from "./generate.ts";
import { retrieve } from "./retrieve.ts";
import { RagState } from "./state.ts";

// analyze → (retrieve) → generate. Si no hace falta buscar, salta directo a generate.
export const graph = new StateGraph(RagState)
  .addNode("analyze", analyze)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge(START, "analyze")
  .addConditionalEdges("analyze", (state) => (state.analysis!.needsSearch ? "retrieve" : "generate"), ["retrieve", "generate"])
  .addEdge("retrieve", "generate")
  .addEdge("generate", END)
  .compile();
