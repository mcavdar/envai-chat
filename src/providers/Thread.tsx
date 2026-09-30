import { validate } from "uuid";
import { useLangGraphConfig } from "@/lib/use-langgraph-config";
import { Thread } from "@langchain/langgraph-sdk";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { createClient } from "./client";
import { useAuth } from "./Auth";

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  deleteThread: (threadId: string) => Promise<void>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

function getThreadSearchMetadata(
  assistantId: string,
): { graph_id: string } | { assistant_id: string } {
  if (validate(assistantId)) {
    return { assistant_id: assistantId };
  } else {
    return { graph_id: assistantId };
  }
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const { finalApiUrl, finalAssistantId, finalAuthScheme, apiKey } =
    useLangGraphConfig();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const { accessToken } = useAuth();

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    if (!finalApiUrl || !finalAssistantId) return [];
    const client = createClient(
      finalApiUrl,
      apiKey || undefined,
      finalAuthScheme || undefined,
      accessToken ?? undefined,
    );

    const threads = await client.threads.search({
      metadata: {
        ...getThreadSearchMetadata(finalAssistantId),
      },
      limit: 100,
      select: [
        "thread_id",
        "created_at",
        "updated_at",
        "metadata",
        "status",
      ],
    });

    return threads;
  }, [accessToken, apiKey, finalApiUrl, finalAssistantId, finalAuthScheme]);

  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      if (!finalApiUrl) {
        throw new Error("LangGraph API URL is not configured.");
      }

      const client = createClient(
        finalApiUrl,
        apiKey || undefined,
        finalAuthScheme || undefined,
        accessToken ?? undefined,
      );

      await client.threads.delete(threadId);
      setThreads((currentThreads) =>
        currentThreads.filter((thread) => thread.thread_id !== threadId),
      );
    },
    [accessToken, apiKey, finalApiUrl, finalAuthScheme],
  );

  const value = {
    getThreads,
    deleteThread,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
