"use client";

import type { FormEvent } from "react";
import { Plus, LoaderCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useFileUpload } from "@/hooks/use-file-upload";
import { ContentBlocksPreview } from "./ContentBlocksPreview";

type UploadState = Pick<
  ReturnType<typeof useFileUpload>,
  | "contentBlocks"
  | "removeBlock"
  | "handleFileUpload"
  | "dropRef"
  | "dragOver"
  | "handlePaste"
>;

type ChatComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  onStarterPrompt: () => void;
  isLoading: boolean;
  chatStarted: boolean;
  starterPrompt: string;
  upload: UploadState;
};

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  onStarterPrompt,
  isLoading,
  chatStarted,
  starterPrompt,
  upload,
}: ChatComposerProps) {
  return (
    <>
      <div
        ref={upload.dropRef}
        className={`bg-muted relative z-10 mx-auto mb-8 w-full max-w-3xl rounded-2xl shadow-xs transition-all ${
          upload.dragOver
            ? "border-primary border-2 border-dotted"
            : "border border-solid"
        }`}
      >
        <form
          onSubmit={onSubmit}
          className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2"
        >
          <ContentBlocksPreview
            blocks={upload.contentBlocks}
            onRemove={upload.removeBlock}
          />
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onPaste={upload.handlePaste}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.metaKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                const element = event.target as HTMLElement | undefined;
                const form = element?.closest("form");
                form?.requestSubmit();
              }
            }}
            placeholder="Mesajınızı yazın..."
            className="field-sizing-content resize-none border-none bg-transparent p-3.5 pb-0 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none"
          />

          <div className="flex items-center gap-6 p-2 pt-4">
            <Label
              htmlFor="file-input"
              className="flex cursor-pointer items-center gap-2"
            >
              <Plus className="size-5 text-gray-600" />
              <span className="text-sm text-gray-600">Dosya Yükle</span>
            </Label>
            <input
              id="file-input"
              type="file"
              onChange={upload.handleFileUpload}
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              className="hidden"
            />
            {isLoading ? (
              <Button
                key="stop"
                onClick={onStop}
                className="ml-auto"
              >
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Cancel
              </Button>
            ) : (
              <Button
                type="submit"
                className="ml-auto shadow-md transition-all"
                disabled={isLoading || (!input.trim() && upload.contentBlocks.length === 0)}
              >
                Gönder
              </Button>
            )}
          </div>
        </form>
      </div>
      {!chatStarted && (
        <div className="mx-auto -mt-4 mb-8 w-full max-w-3xl px-4">
          <Button
            type="button"
            variant="outline"
            className="h-auto max-w-full justify-start whitespace-normal text-left"
            onClick={onStarterPrompt}
          >
            {starterPrompt}
          </Button>
        </div>
      )}
    </>
  );
}