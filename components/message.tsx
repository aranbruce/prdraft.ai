"use client";

import { Message } from "ai";
import cx from "classnames";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction } from "react";

import { Vote } from "@/lib/db/schema";

import { UIBlock } from "./block";
import { DocumentToolCall, DocumentToolResult } from "./document";
import { Logo } from "./logo";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";

export const PreviewMessage = ({
  chatId,
  message,
  block,
  setBlock,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  vote: Vote | undefined;
  isLoading: boolean;
}) => {
  return (
    <motion.div
      className="group/message mx-auto w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cx(
          "group-data-[role=user]/message:bg-card group-data-[role=user]/message:text-secondary-foreground group-data-[role=user]/message:border-secondary flex w-full gap-4 rounded-xl px-3 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-[calc(100%-48px)] group-data-[role=user]/message:border group-data-[role=user]/message:py-2",
        )}
      >
        {message.role === "assistant" && <Logo size={32} />}

        <div className="flex w-full flex-col gap-2">
          {message.content && (
            <div className="flex flex-col gap-4">
              <Markdown>{message.content as string}</Markdown>
            </div>
          )}

          {(() => {
            // Filter parts to only include tool invocations that will render content
            const toolInvocationParts = message.parts?.filter((part) => {
              if (part.type === "tool-invocation") {
                const { toolName } = part.toolInvocation;
                return [
                  "createDocument",
                  "updateDocument",
                  "getDocument",
                ].includes(toolName);
              }
              return false;
            }) as Array<{ type: "tool-invocation"; toolInvocation: any }>;

            // Only render the container if there are valid tool invocations
            if (!toolInvocationParts || toolInvocationParts.length === 0) {
              return null;
            }

            return (
              <div className="flex flex-col gap-4">
                {toolInvocationParts.map((part, index) => {
                  const { toolInvocation } = part;
                  const { toolName, toolCallId, state, args } = toolInvocation;

                  if (state === "result") {
                    const { result } = toolInvocation;

                    return (
                      <div key={`${toolCallId}-${index}`}>
                        {toolName === "createDocument" ? (
                          <DocumentToolResult
                            type="create"
                            result={result}
                            block={block}
                            setBlock={setBlock}
                          />
                        ) : toolName === "updateDocument" ? (
                          <DocumentToolResult
                            type="update"
                            result={result}
                            block={block}
                            setBlock={setBlock}
                          />
                        ) : toolName === "getDocument" ? (
                          <DocumentToolResult
                            type="view"
                            result={result}
                            block={block}
                            setBlock={setBlock}
                          />
                        ) : (
                          <pre>{JSON.stringify(result, null, 2)}</pre>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`${toolCallId}-${index}`}>
                        {toolName === "createDocument" ? (
                          <DocumentToolCall type="create" args={args} />
                        ) : toolName === "updateDocument" ? (
                          <DocumentToolCall type="update" args={args} />
                        ) : toolName === "getDocument" ? (
                          <DocumentToolCall type="view" args={args} />
                        ) : null}
                      </div>
                    );
                  }
                })}
              </div>
            );
          })()}

          {message.experimental_attachments && (
            <div className="flex flex-row gap-2">
              {message.experimental_attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}

          <MessageActions
            key={`action-${message.id}`}
            chatId={chatId}
            message={message}
            vote={vote}
            isLoading={isLoading}
          />
        </div>
      </div>
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      className="group/message mx-auto w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex w-full gap-4 rounded-xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2",
          {
            "group-data-[role=user]/message:bg-muted": true,
          },
        )}
      >
        <Logo size={32} />
        <div className="flex w-full flex-col gap-2 pt-1">
          <div className="text-muted-foreground flex animate-pulse flex-col gap-4">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
