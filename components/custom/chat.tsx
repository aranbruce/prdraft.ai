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
    <main className="flex h-dvh w-full flex-row justify-center bg-background px-6 pb-2 md:px-12 md:pb-4">
      <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-4">
        {messages.length > 0 && (
          <div
            ref={messagesContainerRef}
            className="flex size-full flex-col items-center gap-4 overflow-y-scroll"
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
          className="w-full"
        >
          <form className="relative flex w-full flex-col gap-6">
            {messages.length === 0 && (
              <h1 className="w-full text-pretty text-center text-2xl font-semibold text-black dark:text-zinc-400 md:text-4xl">
                How can I help you with your next PRD?
              </h1>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
              className="w-full"
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
