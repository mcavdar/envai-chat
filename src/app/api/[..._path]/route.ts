import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

// This file acts as a proxy for requests to your LangGraph server.
// Read the Going to Production section for more information:
// https://github.com/langchain-ai/agent-chat-ui?tab=readme-ov-file#going-to-production

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
  initApiPassthrough({
    apiUrl: process.env.LANGGRAPH_API_URL ?? "remove-me",
    apiKey: process.env.LANGSMITH_API_KEY ?? "remove-me",
    runtime: "edge",
    headers: (request): Record<string, string> => {
      const forwardedHeaders: Record<string, string> = {};
      const contentType = request.headers.get("content-type");

      if (contentType) {
        forwardedHeaders["Content-Type"] = contentType;
      }

      return forwardedHeaders;
    },
  });