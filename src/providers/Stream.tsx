import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  isUIMessage,
  isRemoveUIMessage,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { DeploymentConfigForm } from "@/components/DeploymentConfigForm";
import { setApiKey as storeApiKey } from "@/lib/api-key";
import { useLangGraphConfig } from "@/lib/use-langgraph-config";
import { useAuth } from "./Auth";
import { useThreads } from "./Thread";
import { toast } from "sonner";

export type OnboardingChoice = { label: string; value: string };

export type OnboardingState = {
  status: "in_progress" | "complete";
  awaiting: "grade" | "goals" | null;
  choices: OnboardingChoice[];
};

export type StateType = {
  messages: Message[];
  ui?: UIMessage[];
  onboarding?: OnboardingState;
};

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
      context?: Record<string, unknown>;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream> & {
  apiUrl: string;
};
const StreamContext = createContext<StreamContextType | undefined>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkGraphStatus(
  apiUrl: string,
  apiKey: string | null,
  authScheme?: string,
  accessToken?: string,
  requestFetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<boolean> {
  try {
    const headers = new Headers();
    if (apiKey) headers.set("X-Api-Key", apiKey);
    if (authScheme) headers.set("X-Auth-Scheme", authScheme);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const res = await requestFetch(`${apiUrl}/info`, {
      headers,
    });

    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

const StreamSession = ({
  children,
  apiKey,
  apiUrl,
  assistantId,
  authScheme,
  accessToken,
  requestFetch,
}: {
  children: ReactNode;
  apiKey: string | null;
  apiUrl: string;
  assistantId: string;
  authScheme?: string;
  accessToken: string;
  requestFetch: typeof globalThis.fetch;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();
  const streamValue = useTypedStream({
    apiUrl,
    apiKey: apiKey ?? undefined,
    assistantId,
    defaultHeaders: {
      ...(accessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
      ...(authScheme && {
        "X-Auth-Scheme": authScheme,
      }),
    },
    threadId: threadId ?? null,
    fetchStateHistory: true,
    onCustomEvent: (event, options) => {
      if (isUIMessage(event) || isRemoveUIMessage(event)) {
        options.mutate((prev) => {
          const ui = uiMessageReducer(prev.ui ?? [], event);
          return { ...prev, ui };
        });
      }
    },
    onThreadId: (id) => {
      setThreadId(id);
      // Refetch threads list when thread ID changes.
      // Wait for some seconds before fetching so we're able to get the new thread that was created.
      sleep().then(() => getThreads().then(setThreads).catch(console.error));
    },
  });

  useEffect(() => {
    checkGraphStatus(apiUrl, apiKey, authScheme, accessToken, requestFetch).then((ok) => {
      if (!ok) {
        toast.error("Failed to connect to LangGraph server", {
          description: () => (
            <p>
              Please ensure your graph is running at <code>{apiUrl}</code> and
              your API key is correctly set (if connecting to a deployed graph).
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [accessToken, apiKey, apiUrl, authScheme, requestFetch]);

  return (
    <StreamContext.Provider value={{ ...streamValue, apiUrl }}>
      {children}
    </StreamContext.Provider>
  );
};

// Default values for the form
const DEFAULT_API_URL = "http://localhost:2024";
const DEFAULT_ASSISTANT_ID = "agent";
const AGENT_BUILDER_AUTH_SCHEME = "langsmith-api-key";

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get environment variables
  const { accessToken, fetch: requestFetch } = useAuth();
  const {
    apiUrl,
    setApiUrl,
    assistantId,
    setAssistantId,
    authScheme,
    setAuthScheme,
    finalApiUrl,
    finalAssistantId,
    finalAuthScheme,
    apiKey,
  } = useLangGraphConfig();
  const [isAgentBuilder, setIsAgentBuilder] = useState(
    () => finalAuthScheme.toLowerCase() === AGENT_BUILDER_AUTH_SCHEME,
  );

  // Show the form if we: don't have an API URL, or don't have an assistant ID
  if (!finalApiUrl || !finalAssistantId) {
    return (
      <DeploymentConfigForm
        apiUrl={apiUrl || DEFAULT_API_URL}
        assistantId={assistantId || DEFAULT_ASSISTANT_ID}
        apiKey={apiKey}
        isAgentBuilder={isAgentBuilder}
        onAgentBuilderChange={setIsAgentBuilder}
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);
          const apiUrl = String(formData.get("apiUrl") ?? "");
          const assistantId = String(formData.get("assistantId") ?? "");
          const apiKey = String(formData.get("apiKey") ?? "");

          setApiUrl(apiUrl);
          storeApiKey(apiUrl, apiKey);
          setAssistantId(assistantId);
          setAuthScheme(isAgentBuilder ? AGENT_BUILDER_AUTH_SCHEME : "");

          event.currentTarget.reset();
        }}
      />
    );
  }

  return (
    <StreamSession
      apiKey={apiKey}
      apiUrl={finalApiUrl}
      assistantId={finalAssistantId}
      authScheme={finalAuthScheme || undefined}
      accessToken={accessToken ?? ""}
      requestFetch={requestFetch}
    >
      {children}
    </StreamSession>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
