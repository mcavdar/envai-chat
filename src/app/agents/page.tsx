"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, LoaderCircle, RefreshCw } from "lucide-react";
import type { Assistant } from "@langchain/langgraph-sdk";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/providers/Auth";
import { createClient } from "@/providers/client";
import { useLangGraphConfig } from "@/lib/use-langgraph-config";

const PAGE_SIZE = 100;
const configuredGraphIds = (process.env.NEXT_PUBLIC_GRAPH_IDS || "")
  .split(",")
  .map((graphId) => graphId.trim())
  .filter(Boolean);

function AgentDirectory() {
  const {
    finalApiUrl,
    finalAssistantId,
    finalAuthScheme,
    apiKey,
  } = useLangGraphConfig();
  const { accessToken } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const agents = new Map(
    configuredGraphIds.map((graphId) => [
      graphId,
      { id: graphId, name: graphId, description: graphId },
    ]),
  );
  for (const assistant of assistants) {
    agents.set(assistant.assistant_id, {
      id: assistant.assistant_id,
      name: assistant.name || assistant.graph_id,
      description: assistant.description || assistant.assistant_id,
    });
  }
  const agentList = Array.from(agents.values());

  useEffect(() => {
    let cancelled = false;

    async function loadAssistants() {
      setLoading(true);
      setError(null);

      if (!finalApiUrl) {
        setError("LangGraph server URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        const client = createClient(
          finalApiUrl,
          apiKey || undefined,
          finalAuthScheme || undefined,
          accessToken ?? undefined,
        );
        const results: Assistant[] = [];
        let offset = 0;

        while (true) {
          const page = await client.assistants.search({
            limit: PAGE_SIZE,
            offset,
          });
          results.push(...page);
          if (page.length < PAGE_SIZE) break;
          offset += page.length;
        }

        if (!cancelled) setAssistants(results);
      } catch {
        if (!cancelled) {
          setError("Asistanlar yüklenemedi. Sunucu bağlantınızı kontrol edin.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAssistants();

    return () => {
      cancelled = true;
    };
  }, [accessToken, apiKey, finalApiUrl, finalAuthScheme, loadAttempt]);

  function chatHref(assistantId: string) {
    const params = new URLSearchParams({ assistantId });
    if (finalAuthScheme) params.set("authScheme", finalAuthScheme);
    return `/?${params.toString()}`;
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={chatHref(finalAssistantId || "")}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          Sohbete dön
        </Link>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <p className="text-muted-foreground text-sm">LANGGRAPH SERVER</p>
            <h1 className="mt-2 text-3xl font-semibold">Ajanlar</h1>
          </div>
          {!loading && !error && (
            <p className="text-muted-foreground text-sm">
              {agentList.length} ajan
            </p>
          )}
        </header>

        {loading ? (
          <div className="text-muted-foreground flex min-h-52 items-center justify-center gap-3">
            <LoaderCircle className="size-5 animate-spin" />
            <span>Asistanlar yükleniyor...</span>
          </div>
        ) : error && agentList.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
            <p role="alert">{error}</p>
            <Button
              variant="outline"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            >
              <RefreshCw className="size-4" />
              Tekrar dene
            </Button>
          </div>
        ) : agentList.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center">
            Bu sunucuda listelenecek ajan bulunamadı.
          </p>
        ) : (
          <>
            {error && (
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm" role="status">
                <span>Sunucudaki asistan ayrıntıları yüklenemedi. Yapılandırılmış ajanlar gösteriliyor.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                >
                  <RefreshCw className="size-4" />
                  Tekrar dene
                </Button>
              </div>
            )}
            <ul className="divide-y">
            {agentList.map((agent) => {
              const selected = agent.id === finalAssistantId;
              return (
                <li key={agent.id}>
                  <Link
                    href={chatHref(agent.id)}
                    aria-current={selected ? "page" : undefined}
                    className="group flex min-h-24 items-center gap-4 py-5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center border bg-card">
                      <Bot className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">
                          {agent.name}
                        </span>
                        {selected && (
                          <span className="text-muted-foreground text-xs">
                            Şu anki asistan
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground mt-1 block break-all text-sm">
                        {agent.description}
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              );
            })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

export default function AgentsPage() {
  return (
    <>
      <Toaster />
      <AuthProvider>
        <AgentDirectory />
      </AuthProvider>
    </>
  );
}