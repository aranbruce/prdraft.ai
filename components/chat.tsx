"use client";

import { Attachment, Message } from "ai";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useWindowSize } from "usehooks-ts";

import { ChatHeader } from "@/components/chat-header";
import { PreviewMessage, ThinkingMessage } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Vote } from "@/lib/db/schema";
import { fetcher } from "@/lib/utils";

import { Block, UIBlock } from "./block";
import { BlockStreamHandler } from "./block-stream-handler";
import { MultimodalInput } from "./multimodal-input";

export function Chat({
  id,
  initialMessages,
  selectedModelId,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    data: streamingData,
  } = useChat({
    body: { id, modelId: selectedModelId },
    initialMessages,
    onFinish: () => {
      mutate("/api/history");
    },
  });

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  const [block, setBlock] = useState<UIBlock>({
    documentId: "init",
    content: "",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
    <>
      <div className="absolute inset-0 flex flex-col justify-center overflow-hidden">
        <ChatHeader selectedModelId={selectedModelId} />

        {messages.length > 0 && (
          <div
            ref={messagesContainerRef}
            className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll px-2"
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

        <div className="m-auto w-full px-4 md:max-w-3xl">
          {messages.length === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full pb-8 text-center text-2xl font-semibold text-pretty md:text-4xl"
            >
              How can I help you with your next PRD?
            </motion.h1>
          )}
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-background mx-auto flex w-full gap-2 pb-2 md:pb-4"
          >
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={status === "streaming" || status === "submitted"}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              className="bg-muted"
              append={append}
            />
          </motion.form>
        </div>
      </div>

      <AnimatePresence>
        {block && block.isVisible && (
          <Block
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
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

      <BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />
    </>
  );
}
