"use client";

import { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { motion } from "framer-motion";
import { useState } from "react";

import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";

import { MultimodalInput } from "./multimodal-input";

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<Message>;
}) {
  const { messages, handleSubmit, input, setInput, append, isLoading, stop } =
    useChat({
      body: { id },
      initialMessages,
      onFinish: () => {
        window.history.replaceState({}, "", `/chat/${id}`);
      },
    });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
    <main className="bg-background flex h-dvh w-full flex-row justify-center overflow-hidden">
      <div className="relative flex w-full flex-col items-center justify-center gap-4">
        {messages.length > 0 && (
          <div
            ref={messagesContainerRef}
            className="flex size-full flex-col items-center gap-8 overflow-y-scroll px-6 pb-32 md:px-12"
          >
            {messages.map((message) => (
              <PreviewMessage
                key={message.id}
                role={message.role}
                content={message.content}
                attachments={message.experimental_attachments}
                toolInvocations={message.toolInvocations}
              />
            ))}

            <div
              ref={messagesEndRef}
              className="min-h-[24px] min-w-[24px] shrink-0"
            />
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0 }}
          className={`${messages.length > 0 && "absolute bottom-0"} w-full bg-white px-6 pb-4 md:px-12 dark:bg-zinc-950`}
        >
          <form className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
            {messages.length === 0 && (
              <h1 className="w-full text-pretty text-center text-2xl font-semibold md:text-4xl">
                How can I help you with your next PRD?
              </h1>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              className=""
            >
              <MultimodalInput
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                append={append}
              />
            </motion.div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
