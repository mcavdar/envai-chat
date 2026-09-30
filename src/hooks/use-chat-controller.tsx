import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { fetchOnboardingProfile } from "@/lib/onboarding-api";
import { useAuth } from "@/providers/Auth";
import { useStreamContext } from "@/providers/Stream";
import { useArtifactContext } from "@/components/thread/artifact";
import { useFileUpload } from "@/hooks/use-file-upload";

type UseChatControllerOptions = {
  threadId: string | null;
  artifactContext: ReturnType<typeof useArtifactContext>[0];
  upload: Pick<
    ReturnType<typeof useFileUpload>,
    "contentBlocks" | "setContentBlocks"
  >;
};

export function useChatController({
  threadId,
  artifactContext,
  upload,
}: UseChatControllerOptions) {
  const stream = useStreamContext();
  const { fetch: authenticatedFetch } = useAuth();
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const [selectedGoalValues, setSelectedGoalValues] = useState<string[]>([]);
  const [outcomeCode, setOutcomeCode] = useQueryState("outcomeCode");
  const [outcomeAction, setOutcomeAction] = useQueryState("outcomeAction");
  const awaitingOnboarding = stream.values.onboarding?.awaiting;

  const lastError = useRef<string | undefined>(undefined);
  const onboardingKickoffStarted = useRef(false);
  const hasOutcomeCode = useRef(outcomeCode !== null);
  const outcomeCodeSubmitted = useRef(false);
  const prevMessageLength = useRef(0);

  useEffect(() => {
    setSelectedGoalValues([]);
  }, [awaitingOnboarding, threadId]);

  useEffect(() => {
    if (
      threadId ||
      stream.messages.length > 0 ||
      stream.isLoading ||
      hasOutcomeCode.current ||
      onboardingKickoffStarted.current
    ) {
      return;
    }

    let cancelled = false;

    async function startOnboardingIfNeeded() {
      try {
        const profile = await fetchOnboardingProfile(authenticatedFetch);
        if (cancelled || profile !== null) return;

        onboardingKickoffStarted.current = true;
        const kickoffMessage: Message = {
          id: `${DO_NOT_RENDER_ID_PREFIX}${uuidv4()}`,
          type: "human",
          content: [
            {
              type: "text",
              text: "Start the first-time onboarding conversation in Turkish. Briefly welcome the student, then ask one question at a time to learn whether they are in grade 9 or 10 and which math goals matter to them: improve grades, fill learning gaps, prepare for an exam, or improve generally. Do not assume answers or ask for information already provided. Guide the conversation naturally and do not begin tutoring until onboarding is complete.",
            },
          ],
        };
        const context = { onboarding: true };

        stream.submit(
          { messages: [kickoffMessage], context },
          {
            streamMode: ["values"],
            streamSubgraphs: true,
            streamResumable: true,
            optimisticValues: (previous) => ({
              ...previous,
              context,
              messages: [...(previous.messages ?? []), kickoffMessage],
            }),
          },
        );
      } catch {
        if (!cancelled) {
          toast.error("Onboarding durumu kontrol edilemedi.");
        }
      }
    }

    void startOnboardingIfNeeded();

    return () => {
      cancelled = true;
    };
  }, [
    authenticatedFetch,
    stream.isLoading,
    stream.messages.length,
    stream.submit,
    threadId,
  ]);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }

    const message = (stream.error as Error).message;
    if (!message || lastError.current === message) return;

    lastError.current = message;
    toast.error("An error occurred. Please try again.", {
      description: (
        <p>
          <strong>Error:</strong> <code>{message}</code>
        </p>
      ),
      richColors: true,
      closeButton: true,
    });
  }, [stream.error]);

  useEffect(() => {
    if (
      stream.messages.length !== prevMessageLength.current &&
      stream.messages.length > 0 &&
      stream.messages[stream.messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = stream.messages.length;
  }, [stream.messages]);

  const submitMessage = useCallback(
    (text: string) => {
      if (
        (text.trim().length === 0 && upload.contentBlocks.length === 0) ||
        stream.isLoading
      ) {
        return;
      }

      setFirstTokenReceived(false);

      const newHumanMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: [
          ...(text.trim().length > 0 ? [{ type: "text", text }] : []),
          ...upload.contentBlocks,
        ] as Message["content"],
      };

      const toolMessages = ensureToolCallsHaveResponses(stream.messages);
      const context =
        Object.keys(artifactContext).length > 0 ? artifactContext : undefined;

      stream.submit(
        { messages: [...toolMessages, newHumanMessage], context },
        {
          streamMode: ["values"],
          streamSubgraphs: true,
          streamResumable: true,
          optimisticValues: (previous) => ({
            ...previous,
            context,
            messages: [
              ...(previous.messages ?? []),
              ...toolMessages,
              newHumanMessage,
            ],
          }),
        },
      );

      setInput("");
      upload.setContentBlocks([]);
    },
    [artifactContext, stream, upload],
  );

  useEffect(() => {
    if (
      !outcomeCode ||
      threadId ||
      stream.messages.length > 0 ||
      stream.isLoading ||
      outcomeCodeSubmitted.current
    ) {
      return;
    }

    outcomeCodeSubmitted.current = true;
    const command =
      outcomeAction === "soru" || outcomeAction === "test"
        ? outcomeAction
        : "anlat";
    submitMessage(`/${command} ${outcomeCode}`);
    void setOutcomeCode(null, { history: "replace" });
    void setOutcomeAction(null, { history: "replace" });
  }, [
    outcomeAction,
    outcomeCode,
    setOutcomeAction,
    setOutcomeCode,
    stream.isLoading,
    stream.messages.length,
    submitMessage,
    threadId,
  ]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitMessage(input);
    },
    [input, submitMessage],
  );

  const handleRegenerate = useCallback(
    (parentCheckpoint: Checkpoint | null | undefined) => {
      prevMessageLength.current -= 1;
      setFirstTokenReceived(false);
      stream.submit(undefined, {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
        streamSubgraphs: true,
        streamResumable: true,
      });
    },
    [stream.submit],
  );

  const toggleGoalChoice = (value: string) => {
    setSelectedGoalValues((current) =>
      current.includes(value)
        ? current.filter((selected) => selected !== value)
        : [...current, value],
    );
  };

  return {
    input,
    setInput,
    firstTokenReceived,
    selectedGoalValues,
    setSelectedGoalValues,
    submitMessage,
    handleSubmit,
    handleRegenerate,
    toggleGoalChoice,
  };
}