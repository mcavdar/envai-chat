import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { type MouseEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { LoaderCircle, PanelRightOpen, PanelRightClose, Trash2 } from "lucide-react";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/ensure-tool-responses";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");

  const { deleteThread } = useThreads();
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  const handleDelete = async (
    event: MouseEvent<HTMLButtonElement>,
    threadToDelete: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      deletingThreadId ||
      !window.confirm(
        "Silmek istediğinize emin misiniz?",
      )
    ) {
      return;
    }

    setDeletingThreadId(threadToDelete);
    try {
      await deleteThread(threadToDelete);
      if (threadToDelete === threadId) {
        await setThreadId(null);
      }
      toast.success("Konuşma silinmiştir.");
    } catch (error) {
      console.error("Konuşma silinemedi.", error);
      toast.error("Konuşma silinemedi.", {
        description: "Hata oluştu. Lütfen sistem yöneticisine bilgi veriniz.",
      });
    } finally {
      setDeletingThreadId(null);
    }
  };


  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
      {threads.map((t) => {
        let itemText = t.thread_id;
        if (
          typeof t.values === "object" &&
          t.values &&
          "messages" in t.values &&
          Array.isArray(t.values.messages) &&
          t.values.messages?.length > 0
        ) {
          const firstVisibleMessage = t.values.messages.find(
            (message) =>
              typeof message === "object" &&
              message !== null &&
              (!("id" in message) ||
                typeof message.id !== "string" ||
                !message.id.startsWith(DO_NOT_RENDER_ID_PREFIX)),
          );
          if (firstVisibleMessage) {
            itemText = getContentString(firstVisibleMessage.content);
          }
        }
        return (
          <div
            key={t.thread_id}
            className="flex w-full items-center gap-1 px-1"
          >
            <Button
              variant="ghost"
              className="min-w-0 flex-1 items-start justify-start text-left font-normal"
              onClick={(e) => {
                e.preventDefault();
                onThreadClick?.(t.thread_id);
                if (t.thread_id === threadId) return;
                setThreadId(t.thread_id);
              }}
            >
              <p className="truncate text-ellipsis">{itemText}</p>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Konuşma sil ${itemText}`}
              title="Konuşma sil"
              disabled={deletingThreadId !== null}
              onClick={(event) => handleDelete(event, t.thread_id)}
            >
              {deletingThreadId === t.thread_id ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-[280px]"
        />
      ))}
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
  }, []);

  return (
    <>
      <div className="shadow-inner-right hidden h-screen w-[300px] shrink-0 flex-col items-start justify-start gap-6 border-r-[1px] border-slate-300 lg:flex">
        <div className="flex w-full items-center justify-between px-4 pt-1.5">
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
          <h1 className="text-xl font-semibold tracking-tight">
            Konuşma Geçmişi
          </h1>
        </div>
        {threadsLoading ? (
          <ThreadHistoryLoading />
        ) : (
          <ThreadList threads={threads} />
        )}
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex lg:hidden"
          >
            <SheetHeader>
              <SheetTitle>Konuşma Geçmişi</SheetTitle>
            </SheetHeader>
            <ThreadList
              threads={threads}
              onThreadClick={() => setChatHistoryOpen((o) => !o)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
