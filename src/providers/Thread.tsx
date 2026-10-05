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
  deleteAllThreads: () => Promise<{
    deletedThreadIds: string[];
    failedCount: number;
  }>;
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

    const pageSize = 100;
    const threads: Thread[] = [];
    let offset = 0;

    while (true) {
      const page = await client.threads.search({
        metadata: {
          ...getThreadSearchMetadata(finalAssistantId),
        },
        limit: pageSize,
        offset,
        select: [
          "thread_id",
          "created_at",
          "updated_at",
          "metadata",
          "status",
        ],
      });
      threads.push(...page);
      if (page.length < pageSize) return threads;
      offset += page.length;
    }
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

  const deleteAllThreads = useCallback(async () => {
    if (!finalApiUrl || !finalAssistantId) {
      throw new Error("LangGraph API URL or assistant ID is not configured.");
    }

    const threadsToDelete = await getThreads();
    const client = createClient(
      finalApiUrl,
      apiKey || undefined,
      finalAuthScheme || undefined,
      accessToken ?? undefined,
    );
    const results: PromiseSettledResult<void>[] = [];
    const batchSize = 10;
    for (let index = 0; index < threadsToDelete.length; index += batchSize) {
      const batch = threadsToDelete.slice(index, index + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((thread) => client.threads.delete(thread.thread_id)),
      );
      results.push(...batchResults);
    }
    const deletedThreadIds = results.flatMap((result, index) =>
      result.status === "fulfilled"
        ? [threadsToDelete[index].thread_id]
        : [],
    );
    const failedCount = results.length - deletedThreadIds.length;
    const deletedThreadIdSet = new Set(deletedThreadIds);

    setThreads((currentThreads) =>
      currentThreads.filter((thread) =>
        !deletedThreadIdSet.has(thread.thread_id),
      ),
    );

    return { deletedThreadIds, failedCount };
  }, [accessToken, apiKey, finalApiUrl, finalAuthScheme, getThreads]);

  const value = {
    getThreads,
    deleteThread,
    deleteAllThreads,
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
