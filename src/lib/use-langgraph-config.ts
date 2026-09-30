"use client";

import { useMemo } from "react";
import { useQueryState } from "nuqs";
import { getApiKey } from "@/lib/api-key";
import { resolveApiUrl } from "@/lib/resolve-api-url";

export function useLangGraphConfig() {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId = process.env.NEXT_PUBLIC_ASSISTANT_ID;
  const envAuthScheme = process.env.NEXT_PUBLIC_AUTH_SCHEME;

  const [apiUrl, setApiUrl] = useQueryState("apiUrl", {
    defaultValue: envApiUrl || "",
  });
  const [assistantId, setAssistantId] = useQueryState("assistantId", {
    defaultValue: envAssistantId || "",
  });
  const [authScheme, setAuthScheme] = useQueryState("authScheme", {
    defaultValue: envAuthScheme || "",
  });

  const finalApiUrl = resolveApiUrl(apiUrl, envApiUrl);
  const finalAssistantId = assistantId || envAssistantId;
  const finalAuthScheme = authScheme || envAuthScheme || "";
  const apiKey = useMemo(() => getApiKey(finalApiUrl) || "", [finalApiUrl]);

  return {
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
  };
}