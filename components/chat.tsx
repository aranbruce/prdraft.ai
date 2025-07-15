"use client";

import { useChat } from "@ai-sdk/react";
import { Attachment, Message } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { useWindowSize } from "usehooks-ts";

import { ChatHeader } from "@/components/chat-header";
import { PreviewMessage, ThinkingMessage } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Vote } from "@/lib/db/schema";
import { fetcher, generateUUID } from "@/lib/utils";

import { Block, UIBlock } from "./block";
import { MultimodalInput } from "./multimodal-input";
import { useBlockStream } from "./use-block-stream";

export function Chat({
  id,
  initialMessages,
  selectedModelId,
  isReadonly = false,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
  isReadonly?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  // Block system for content creation and editing
  const [block, setBlock] = useState<UIBlock>({
    documentId: "",
    content: "",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 800,
      height: 600,
    },
  });

  const [input, setInput] = useState<string>("");
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  const {
    messages,
    setMessages,
    append,
    status,
    stop,
    data: streamingData,
  } = useChat({
    id,
    initialMessages,
    generateId: generateUUID,
    body: {
      id,
      modelId: selectedModelId,
    },
    onFinish: () => {
      mutate("/api/history");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error(
        error.message ||
          "An error occurred while processing your message. Please try again.",
      );
    },
  });

  // Create sendMessage function similar to reference
  const sendMessage = useCallback(
    async (message: any, options?: any) => {
      return append(message, options);
    },
    [append],
  );

  // Handle URL query parameter for initial message
  const query = searchParams.get("query");
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  // Handle query parameter from URL
  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user",
        content: query,
      });
      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  // Update block position when window resizes
  useEffect(() => {
    if (block.isVisible) {
      const blockWidth = Math.min(500, windowWidth * 0.4);
      const blockHeight = windowHeight - 100;
      const left = windowWidth - blockWidth - 20;
      const top = 50;

      setBlock((current) => ({
        ...current,
        boundingBox: {
          ...current.boundingBox,
          left,
          top,
          width: blockWidth,
          height: blockHeight,
        },
      }));
    }
  }, [windowWidth, windowHeight, block.isVisible]);

  return (
    <>
      <div
        className="bg-background flex h-dvh min-w-0 flex-col transition-all duration-300 ease-in-out"
        style={{
          marginRight: block.isVisible
            ? `${block.boundingBox.width + 40}px`
            : "0px",
        }}
      >
        <ChatHeader selectedModelId={selectedModelId} />

        {messages.length > 0 && (
          <div
            ref={messagesContainerRef}
            className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-4"
          >
            {messages.map((message, index) => (
              <PreviewMessage
                key={message.id}
                chatId={id}
                message={message}
                block={block}
                setBlock={setBlock}
                isLoading={status === "streaming" || status === "submitted"}
                vote={
                  votes
                    ? votes.find((vote) => vote.messageId === message.id)
                    : undefined
                }
              />
            ))}

            {status === "submitted" && <ThinkingMessage />}

            <div
              ref={messagesEndRef}
              className="min-h-[24px] min-w-[24px] shrink-0"
            />
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full pb-8 text-center text-2xl font-semibold text-pretty md:text-4xl"
            >
              How can I help you with your next PRD?
            </motion.h1>

            {!isReadonly && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6"
              >
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  isLoading={status === "streaming" || status === "submitted"}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  sendMessage={sendMessage}
                  className="bg-muted"
                />
              </motion.div>
            )}
          </div>
        )}

        {messages.length > 0 && !isReadonly && (
          <div className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              isLoading={status === "streaming" || status === "submitted"}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              className="bg-muted"
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {block && block.isVisible && (
          <Block
            chatId={id}
            input={input}
            setInput={setInput}
            isLoading={status === "streaming" || status === "submitted"}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            append={append}
            block={block}
            setBlock={setBlock}
            messages={messages}
            setMessages={setMessages}
            votes={votes}
            modelId={selectedModelId}
          />
        )}
      </AnimatePresence>

      {useBlockStream({
        streamingData,
        setBlock,
      })}
    </>
  );
}
