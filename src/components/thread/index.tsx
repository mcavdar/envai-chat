import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useAuth } from "@/providers/Auth";
import { Button } from "../ui/button";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/ensure-tool-responses";
import { LangGraphLogoSVG } from "../icons/langgraph";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  Bot,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
  XIcon,
  LogOut,
  UserRound,
  ChevronDown,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useChatController } from "@/hooks/use-chat-controller";
import { GitHubSVG } from "../icons/github";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useFileUpload } from "@/hooks/use-file-upload";
import { ChatComposer } from "./ChatComposer";
import {
  useArtifactOpen,
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
} from "./artifact";

const agentStarterPrompts: Record<string, string> = {
  translation: "“Good morning, how are you?” cümlesini Türkçeye çevir.",
  "deep-research":
    "Yenilenebilir enerjideki son gelişmeleri araştır ve kaynaklarıyla özetle.",
  "minimax-chat": "Hafta sonu yapabileceğim üç yaratıcı proje fikri öner.",
  "weather-tool": "İstanbul'da bugün hava nasıl?",
  "zai-glm": "Merhaba! Bugün nasılsın?",
  "zai-free-chat": "Bugün öğrenebileceğim ilginç bir şey anlat.",
  "zai-free-vision": "Bir görsel paylaşacağım; içeriğini açıklayabilir misin?",
  "factorial-tool": "5 sayısının faktöriyelini hesapla.",
  "factorial-workflow": "3, 5 ve 7 sayılarının faktöriyellerini hesapla.",
  "math-tutor":
    "2x + 5 = 17 denklemini adım adım çözmeme yardım et; cevabı hemen söyleme.",
  "human-weather": "İstanbul için güncel hava durumunu kontrol et.",
  "gemini-live": "Yeni bir dil öğrenmek hakkında kısa bir sohbet başlatalım.",
  "gemini-chat": "Bir dil öğrenirken motivasyonumu korumam için üç öneri ver.",
  "gemini-chat-v3": "Yapay zekânın eğitimdeki en yararlı üç kullanımını açıkla.",
  "youtube-downloader":
    "Bir YouTube videosunu özetlemek istiyorum; bağlantısını paylaşınca yardımcı olur musun?",
  "gemma-chat": "Bana kısa bir bilmece sor.",
  "ollama-vision": "Paylaşacağım görselde neler olduğunu açıkla.",
  "ocr-reader": "Yükleyeceğim görseldeki metni çıkarıp düz metin olarak ver.",
  "claude-chat": "Bir konuyu net ve dikkatli biçimde düşünmeme yardım et.",
  mock: "Merhaba! Kendini tanıt ve neler yapabildiğini anlat.",
};

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="h-4 w-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

function OpenGitHubRepo() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="https://github.com/langchain-ai/agent-chat-ui"
            target="_blank"
            className="flex items-center justify-center"
          >
            <GitHubSVG
              width="24"
              height="24"
            />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Open GitHub repo</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ConnectedHost({ apiUrl }: { apiUrl: string }) {
  let host: string;
  try {
    host = new URL(apiUrl).host;
  } catch {
    host = apiUrl;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground hidden max-w-40 truncate text-xs sm:inline">
            {host}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Connected to {apiUrl}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CurriculumMenu() {
  return (
    <details className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
        Dersler
        <ChevronDown className="size-4" />
        <span className="sr-only">Ders menüsünü aç</span>
      </summary>
      <div className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-1 min-w-40 rounded-md border p-1 shadow-md">
        <Link
          className="hover:bg-accent hover:text-accent-foreground block rounded-sm px-3 py-2 text-sm"
          href="https://chat.envai.tr/curriculum/07c2c96c-d271-40c8-a216-9dd9aca5a64c/9.1.1"
        >
          Matematik 9. Sınıf
        </Link>
      </div>
    </details>
  );
}

export function Thread() {
  const router = useRouter();
  const [artifactContext, setArtifactContext] = useArtifactContext();
  const [artifactOpen, closeArtifact] = useArtifactOpen();

  const [threadId, _setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );
  const [authScheme] = useQueryState("authScheme", {
    defaultValue: process.env.NEXT_PUBLIC_AUTH_SCHEME || "",
  });
  const [assistantId] = useQueryState("assistantId", {
    defaultValue: process.env.NEXT_PUBLIC_ASSISTANT_ID || "",
  });
  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    resetBlocks: _resetBlocks,
    dragOver,
    handlePaste,
  } = useFileUpload();
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const { signOut } = useAuth();
  const messages = stream.messages;
  const isLoading = stream.isLoading;
  const {
    input,
    setInput,
    firstTokenReceived,
    selectedGoalValues,
    setSelectedGoalValues,
    submitMessage,
    handleSubmit,
    handleRegenerate,
    toggleGoalChoice,
  } = useChatController({
    threadId,
    artifactContext,
    upload: { contentBlocks, setContentBlocks },
  });
  const agentName = assistantId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const starterPrompt =
    agentStarterPrompts[assistantId] ??
    "Merhaba! Kendini tanıt ve bana nasıl yardımcı olabileceğini anlat.";
  const awaitingOnboarding = stream.values.onboarding?.awaiting;

  const agentsHref = `/agents?${new URLSearchParams({
    ...(assistantId ? { assistantId } : {}),
    ...(authScheme ? { authScheme } : {}),
  }).toString()}`;

  const setThreadId = (id: string | null) => {
    _setThreadId(id);

    // close artifact and reset artifact context
    closeArtifact();
    setArtifactContext({});
  };

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAIOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const visibleMessages = messages.filter(
    (message) => !message.id?.startsWith(DO_NOT_RENDER_ID_PREFIX),
  );
  const onboardingChoices = Array.isArray(
    stream.values.onboarding?.choices,
  )
    ? stream.values.onboarding.choices.filter(
        (choice) =>
          typeof choice?.label === "string" &&
          typeof choice.value === "string",
      )
    : [];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="relative hidden lg:flex">
        <motion.div
          className="absolute z-20 h-full overflow-hidden border-r bg-white"
          style={{ width: 300 }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          initial={{ x: -300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div
            className="relative h-full"
            style={{ width: 300 }}
          >
            <ThreadHistory />
          </div>
        </motion.div>
      </div>

      <div
        className={cn(
          "grid w-full grid-cols-[1fr_0fr] transition-all duration-500",
          artifactOpen && "grid-cols-[3fr_2fr]",
        )}
      >
        <motion.div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
            !chatStarted && "grid-rows-[1fr]",
          )}
          layout={isLargeScreen}
          animate={{
            marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
            width: chatHistoryOpen
              ? isLargeScreen
                ? "calc(100% - 300px)"
                : "100%"
              : "100%",
          }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          {!chatStarted && (
            <div className="absolute top-0 left-0 z-10 flex w-full items-center justify-between gap-3 p-2 pl-4">
              <div>
                {(!chatHistoryOpen || !isLargeScreen) && (
                  <Button
                    className="hover:bg-gray-100"
                    variant="ghost"
                    onClick={() => setChatHistoryOpen((p) => !p)}
                  >
                    {chatHistoryOpen ? (
                      <PanelRightOpen className="size-5" />
                    ) : (
                      <PanelRightClose className="size-5" />
                    )}
                  </Button>
                )}
              </div>
              <div className="absolute top-2 right-4 flex items-center gap-2">
                <CurriculumMenu />
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Asistanlar"
                  variant="ghost"
                  onClick={() => router.push(agentsHref)}
                >
                  <Bot className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Profil"
                  variant="ghost"
                  onClick={() => router.push("/profile")}
                >
                  <UserRound className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Sign out"
                  variant="ghost"
                  onClick={() => void signOut()}
                >
                  <LogOut className="size-5" />
                </TooltipIconButton>
              </div>
            </div>
          )}
          {chatStarted && (
            <div className="relative z-10 flex items-center justify-between gap-3 p-2">
              <div className="relative flex items-center justify-start gap-2">
                <div className="absolute left-0 z-10">
                  {(!chatHistoryOpen || !isLargeScreen) && (
                    <Button
                      className="hover:bg-gray-100"
                      variant="ghost"
                      onClick={() => setChatHistoryOpen((p) => !p)}
                    >
                      {chatHistoryOpen ? (
                        <PanelRightOpen className="size-5" />
                      ) : (
                        <PanelRightClose className="size-5" />
                      )}
                    </Button>
                  )}
                </div>
                <motion.button
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() => setThreadId(null)}
                  animate={{
                    marginLeft: !chatHistoryOpen ? 48 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <LangGraphLogoSVG
                    width={32}
                    height={32}
                  />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-xl font-semibold tracking-tight">
                      Mento Chat
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {agentName || "Agent"}
                    </span>
                  </span>
                </motion.button>
                <ConnectedHost apiUrl={stream.apiUrl} />
              </div>

              <div className="flex items-center gap-4">
                <CurriculumMenu />
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Asistanlar"
                  variant="ghost"
                  onClick={() => router.push(agentsHref)}
                >
                  <Bot className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Profil"
                  variant="ghost"
                  onClick={() => router.push("/profile")}
                >
                  <UserRound className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Sign out"
                  variant="ghost"
                  onClick={() => void signOut()}
                >
                  <LogOut className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Yeni Konuşma"
                  variant="ghost"
                  onClick={() => setThreadId(null)}
                >
                  <SquarePen className="size-5" />
                </TooltipIconButton>
              </div>

              <div className="from-background to-background/0 absolute inset-x-0 top-full h-5 bg-gradient-to-b" />
            </div>
          )}

          <StickToBottom className="relative flex-1 overflow-hidden">
            <StickyToBottomContent
              className={cn(
                "absolute inset-0 overflow-y-scroll px-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
                !chatStarted && "mt-[25vh] flex flex-col items-stretch",
                chatStarted && "grid grid-rows-[1fr_auto]",
              )}
              contentClassName="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full"
              content={
                <>
                  {visibleMessages.map((message, index) =>
                    message.type === "human" ? (
                      <HumanMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                      />
                    ) : (
                      <AssistantMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                        handleRegenerate={handleRegenerate}
                      />
                    ),
                  )}
                  {onboardingChoices.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-3 pl-10">
                      {onboardingChoices.map((choice) => (
                        <Button
                          key={choice.value}
                          type="button"
                          variant={
                            awaitingOnboarding === "goals" &&
                            selectedGoalValues.includes(choice.value)
                              ? "default"
                              : "outline"
                          }
                          aria-pressed={
                            awaitingOnboarding === "goals"
                              ? selectedGoalValues.includes(choice.value)
                              : undefined
                          }
                          onClick={() =>
                            awaitingOnboarding === "goals"
                              ? toggleGoalChoice(choice.value)
                              : submitMessage(choice.value)
                          }
                        >
                          {choice.label}
                        </Button>
                      ))}
                      {awaitingOnboarding === "goals" && (
                        <Button
                          type="button"
                          disabled={selectedGoalValues.length === 0}
                          onClick={() => {
                            submitMessage(selectedGoalValues.join(", "));
                            setSelectedGoalValues([]);
                          }}
                        >
                          Tamamla
                        </Button>
                      )}
                    </div>
                  )}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                    We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <AssistantMessage
                      key="interrupt-msg"
                      message={undefined}
                      isLoading={isLoading}
                      handleRegenerate={handleRegenerate}
                    />
                  )}
                  {isLoading && !firstTokenReceived && (
                    <AssistantMessageLoading />
                  )}
                </>
              }
              footer={
                <div className="sticky bottom-0 flex flex-col items-center gap-8 bg-white">
                  {!chatStarted && (
                    <div className="flex items-center gap-3">
                      <LangGraphLogoSVG className="h-8 flex-shrink-0" />
                      <div className="flex flex-col items-start leading-tight">
                        <h1 className="text-2xl font-semibold tracking-tight">
                          Mento Chat
                        </h1>
                        <span className="text-muted-foreground text-xs">
                          {agentName || "Agent"}
                        </span>
                      </div>
                    </div>
                  )}

                  <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 mb-4 -translate-x-1/2" />

                  <ChatComposer
                    input={input}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                    onStop={() => stream.stop()}
                    onStarterPrompt={() => submitMessage(starterPrompt)}
                    isLoading={isLoading}
                    chatStarted={chatStarted}
                    starterPrompt={starterPrompt}
                    upload={{
                      contentBlocks,
                      removeBlock,
                      handleFileUpload,
                      dropRef,
                      dragOver,
                      handlePaste,
                    }}
                  />
                </div>
              }
            />
          </StickToBottom>
        </motion.div>
        <div className="relative flex flex-col border-l">
          <div className="absolute inset-0 flex min-w-[30vw] flex-col">
            <div className="grid grid-cols-[1fr_auto] border-b p-4">
              <ArtifactTitle className="truncate overflow-hidden" />
              <button
                onClick={closeArtifact}
                className="cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <ArtifactContent className="relative flex-grow" />
          </div>
        </div>
      </div>
    </div>
  );
}
