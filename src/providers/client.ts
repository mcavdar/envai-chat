import { Client } from "@langchain/langgraph-sdk";

export function createClient(
  apiUrl: string,
  apiKey: string | undefined,
  authScheme: string | undefined,
  accessToken: string | undefined,
) {
  return new Client({
    apiKey,
    apiUrl,
    defaultHeaders: {
      ...(accessToken && {
        Authorization: `Bearer ${accessToken}`,
      }),
      ...(authScheme && {
        "X-Auth-Scheme": authScheme,
      }),
    },
  });
}
