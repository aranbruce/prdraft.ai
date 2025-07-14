import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  Message,
  ToolInvocation,
} from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Message as DBMessage, Document } from "@/lib/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  const result = await res.json();

  // Handle new API response format with { data, success } structure
  if (
    result &&
    typeof result === "object" &&
    "success" in result &&
    "data" in result
  ) {
    if (!result.success) {
      const error = new Error(
        result.error || "API request failed",
      ) as ApplicationError;
      error.status = res.status;
      throw error;
    }
    return result.data;
  }

  // Fallback for old API responses that return data directly
  return result;
};

export const fetchWithErrorHandlers = async (
  url: string,
  options?: RequestInit,
) => {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const error = new Error(
        "An error occurred while fetching the data.",
      ) as ApplicationError;

      try {
        const errorData = await res.json();
        error.info = errorData;
        error.message = errorData.message || errorData.error || error.message;
      } catch {
        // If we can't parse the error response, use the status text
        error.message = res.statusText || error.message;
      }

      error.status = res.status;
      throw error;
    }

    const result = await res.json();

    // Handle new API response format with { data, success } structure
    if (
      result &&
      typeof result === "object" &&
      "success" in result &&
      "data" in result
    ) {
      if (!result.success) {
        const error = new Error(
          result.error || "API request failed",
        ) as ApplicationError;
        error.status = res.status;
        throw error;
      }
      return result.data;
    }

    // Fallback for old API responses that return data directly
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    if (message.parts) {
      return {
        ...message,
        parts: message.parts.map((part) => {
          if (part.type === "tool-invocation") {
            const toolResult = toolMessage.content.find(
              (tool) => tool.toolCallId === part.toolInvocation.toolCallId,
            );

            if (toolResult) {
              return {
                ...part,
                toolInvocation: {
                  ...part.toolInvocation,
                  state: "result",
                  result: toolResult.result,
                },
              };
            }
          }

          return part;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<DBMessage>,
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    let parts: Array<any> = [];
    let attachments: Array<any> = [];

    if (typeof message.content === "string") {
      textContent = message.content;
      if (textContent) {
        parts.push({ type: "text", text: textContent });
      }
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === "text") {
          textContent += content.text;
          parts.push({ type: "text", text: content.text });
        } else if (content.type === "tool-call") {
          parts.push({
            type: "tool-invocation",
            toolInvocation: {
              state: "call",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args,
            },
          });
        } else if (content.type === "file") {
          attachments.push(content);
        } else if (content.type === "image" && content.image) {
          attachments.push({
            data: content.image,
            mimeType: "image/jpeg", // or detect from URL if needed
          });
        }
      }
    }

    // Transform files to new attachment shape
    const experimental_attachments =
      attachments.length > 0
        ? attachments.map((file: any) => ({
            url: file.data,
            contentType: file.mimeType,
            pathname: file.data ? file.data.split("/").pop() : undefined,
          }))
        : undefined;

    chatMessages.push({
      id: message.id,
      role: message.role as Message["role"],
      content: textContent,
      parts: parts.length > 0 ? parts : undefined,
      experimental_attachments,
    });

    return chatMessages;
  }, []);
}

export function sanitizeResponseMessages(
  messages: Array<CoreToolMessage | CoreAssistantMessage>,
): Array<CoreToolMessage | CoreAssistantMessage> {
  let toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === "tool") {
      for (const content of message.content) {
        if (content.type === "tool-result") {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== "assistant") return message;

    if (typeof message.content === "string") return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === "tool-call"
        ? toolResultIds.includes(content.toolCallId)
        : content.type === "text"
          ? content.text.length > 0
          : true,
    );

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function sanitizeUIMessages(messages: Array<Message>): Array<Message> {
  const messagesBySanitizedParts = messages.map((message) => {
    if (message.role !== "assistant") return message;

    // Handle modern parts approach
    if (message.parts) {
      let toolResultIds: Array<string> = [];

      // First pass: collect all tool result IDs from parts
      for (const part of message.parts) {
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation.state === "result"
        ) {
          toolResultIds.push(part.toolInvocation.toolCallId);
        }
      }

      // Filter parts to only include tool invocations that have results or are referenced
      const sanitizedParts = message.parts.filter((part) => {
        if (part.type !== "tool-invocation") return true;

        const toolInvocation = part.toolInvocation;
        return (
          toolInvocation.state === "result" ||
          toolResultIds.includes(toolInvocation.toolCallId)
        );
      });

      return {
        ...message,
        parts: sanitizedParts,
      };
    }

    return message;
  });

  return messagesBySanitizedParts.filter((message) => {
    const hasContent = message.content.length > 0;
    const hasToolParts =
      message.parts &&
      message.parts.some((part) => part.type === "tool-invocation");

    return hasContent || hasToolParts;
  });
}

export function getMostRecentUserMessage(messages: Array<CoreMessage>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getMessageIdFromAnnotations(message: Message) {
  if (!message.annotations) return message.id;

  const [annotation] = message.annotations;
  if (!annotation) return message.id;

  // @ts-expect-error messageIdFromServer is not defined in MessageAnnotation
  return annotation.messageIdFromServer;
}
