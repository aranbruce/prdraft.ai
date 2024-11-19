import {
  convertToCoreMessages,
  Message,
  StreamData,
  streamObject,
  streamText,
} from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { models } from "@/ai/models";
import {
  templatePrompt,
  systemPrompt,
  productManagerPrompt,
  engineerPrompt,
  productDesignerPrompt,
} from "@/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  getCompanyInfoByUserId,
  getDocumentById,
  getTemplateByUserId,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
  updateChat,
} from "@/db/queries";
import { Suggestion } from "@/db/schema";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

type AllowedTools =
  | "createDocument"
  | "updateDocument"
  | "requestProductManagerSuggestions"
  | "requestEngineerSuggestions"
  | "requestDesignerSuggestions";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "requestProductManagerSuggestions",
  "requestEngineerSuggestions",
  "requestDesignerSuggestions",
];

const allTools: AllowedTools[] = [...blocksTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [
      { ...userMessage, id: generateUUID(), createdAt: new Date(), chatId: id },
    ],
  });

  const streamingData = new StreamData();

  const fetchedTemplatePrompt = await getTemplateByUserId({
    userId: session.user.id,
  });

  const fetchedCompanyInfo = await getCompanyInfoByUserId({
    userId: session.user.id,
  });

  const result = await streamText({
    model: customModel(model.apiIdentifier),
    system: `${systemPrompt} ${fetchedCompanyInfo?.content ? `. Make sure to utilize the following information about the company the user works for in your responses: ${fetchedCompanyInfo.content}` : ""}`,
    messages: coreMessages,
    maxSteps: 5,
    experimental_activeTools: allTools,
    tools: {
      createDocument: {
        description: "Create a product requirements document (PRD)",
        parameters: z.object({
          title: z.string(),
        }),
        execute: async ({ title }) => {
          const id = generateUUID();
          let draftText: string = "";

          streamingData.append({
            type: "id",
            content: id,
          });

          streamingData.append({
            type: "title",
            content: title,
          });

          streamingData.append({
            type: "clear",
            content: "",
          });

          const { fullStream } = await streamText({
            model: customModel(model.apiIdentifier),
            system: `Write a product requirement document (PRD) for the given topic. Markdown is supported. Use headings wherever appropriate. Follow the following structure of a PRD:
              ${JSON.stringify(fetchedTemplatePrompt.content) || templatePrompt}
              `,
            prompt: title,
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: "text-delta",
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: "finish", content: "" });

          if (session.user && session.user.id) {
            await saveDocument({
              id,
              title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title,
            content: `A document was created and is now visible to the user.`,
          };
        },
      },
      updateDocument: {
        description:
          "Update a product requirements document (PRD) with the given description",
        parameters: z.object({
          id: z.string().describe("The ID of the document to update"),
          description: z
            .string()
            .describe("The description of changes that need to be made"),
        }),
        execute: async ({ id, description }) => {
          const document = await getDocumentById({ id });

          if (!document) {
            return {
              error: "Document not found",
            };
          }

          const { content: currentContent } = document;
          let draftText: string = "";

          streamingData.append({
            type: "clear",
            content: document.title,
          });

          const { fullStream } = await streamText({
            model: customModel(model.apiIdentifier),
            system: `You are a helpful writing assistant. Based on the description, please update the product requirement document (PRD) using the following format:
              ${JSON.stringify(fetchedTemplatePrompt.content) || templatePrompt}
              `,
            experimental_providerMetadata: {
              openai: {
                prediction: {
                  type: "content",
                  content: currentContent,
                },
              },
            },
            messages: [
              {
                role: "user",
                content: description,
              },
              { role: "user", content: currentContent },
            ],
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === "text-delta") {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: "text-delta",
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: "finish", content: "" });

          if (session.user && session.user.id) {
            await saveDocument({
              id,
              title: document.title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title: document.title,
            content: "The document has been updated successfully.",
          };
        },
      },
      requestProductManagerSuggestions: {
        description:
          "Request suggestions for a document from a product manager",
        parameters: z.object({
          documentId: z
            .string()
            .describe("The ID of the document to request edits"),
        }),
        execute: async ({ documentId }) => {
          const document = await getDocumentById({ id: documentId });

          if (!document || !document.content) {
            return {
              error: "Document not found",
            };
          }

          let suggestions: Array<
            Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
          > = [];

          const { elementStream } = await streamObject({
            model: customModel(model.apiIdentifier),
            system: productManagerPrompt,
            prompt: document.content,
            output: "array",
            schema: z.object({
              originalSentence: z.string().describe("The original sentence"),
              suggestedSentence: z.string().describe("The suggested sentence"),
              description: z
                .string()
                .describe("The description of the suggestion"),
            }),
          });

          for await (const element of elementStream) {
            const suggestion = {
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              id: generateUUID(),
              documentId: documentId,
              isResolved: false,
            };

            streamingData.append({
              type: "suggestion",
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (session.user && session.user.id) {
            const userId = session.user.id;

            await saveSuggestions({
              suggestions: suggestions.map((suggestion) => ({
                ...suggestion,
                userId,
                createdAt: new Date(),
                documentCreatedAt: document.createdAt,
              })),
            });
          }

          return {
            id: documentId,
            title: document.title,
            message:
              "Suggestions have been added to the document by the product manager",
          };
        },
      },
      requestEngineerSuggestions: {
        description:
          "Request suggestions from a lead engineer to improve a document",
        parameters: z.object({
          documentId: z
            .string()
            .describe("The ID of the document to request edits"),
        }),
        execute: async ({ documentId }) => {
          const document = await getDocumentById({ id: documentId });

          if (!document || !document.content) {
            return {
              error: "Document not found",
            };
          }

          let suggestions: Array<
            Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
          > = [];

          const { elementStream } = await streamObject({
            model: customModel(model.apiIdentifier),
            system: engineerPrompt,
            prompt: document.content,
            output: "array",
            schema: z.object({
              originalSentence: z.string().describe("The original sentence"),
              suggestedSentence: z.string().describe("The suggested sentence"),
              description: z
                .string()
                .describe("The description of the suggestion"),
            }),
          });

          for await (const element of elementStream) {
            const suggestion = {
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              id: generateUUID(),
              documentId: documentId,
              isResolved: false,
            };

            streamingData.append({
              type: "suggestion",
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (session.user && session.user.id) {
            const userId = session.user.id;

            await saveSuggestions({
              suggestions: suggestions.map((suggestion) => ({
                ...suggestion,
                userId,
                createdAt: new Date(),
                documentCreatedAt: document.createdAt,
              })),
            });
          }

          return {
            id: documentId,
            title: document.title,
            message:
              "Suggestions have been added to the document by the lead engineer",
          };
        },
      },
      requestDesignerSuggestions: {
        description:
          "Request suggestions from a product designer to improve a document",
        parameters: z.object({
          documentId: z
            .string()
            .describe("The ID of the document to request edits"),
        }),
        execute: async ({ documentId }) => {
          const document = await getDocumentById({ id: documentId });

          if (!document || !document.content) {
            return {
              error: "Document not found",
            };
          }

          let suggestions: Array<
            Omit<Suggestion, "userId" | "createdAt" | "documentCreatedAt">
          > = [];

          const { elementStream } = await streamObject({
            model: customModel(model.apiIdentifier),
            system: productDesignerPrompt,
            prompt: document.content,
            output: "array",
            schema: z.object({
              originalSentence: z.string().describe("The original sentence"),
              suggestedSentence: z.string().describe("The suggested sentence"),
              description: z
                .string()
                .describe("The description of the suggestion"),
            }),
          });

          for await (const element of elementStream) {
            const suggestion = {
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              id: generateUUID(),
              documentId: documentId,
              isResolved: false,
            };

            streamingData.append({
              type: "suggestion",
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (session.user && session.user.id) {
            const userId = session.user.id;

            await saveSuggestions({
              suggestions: suggestions.map((suggestion) => ({
                ...suggestion,
                userId,
                createdAt: new Date(),
                documentCreatedAt: document.createdAt,
              })),
            });
          }

          return {
            id: documentId,
            title: document.title,
            message:
              "Suggestions have been added to the document by the product designer",
          };
        },
      },
    },

    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          const responseMessagesWithoutIncompleteToolCalls =
            sanitizeResponseMessages(responseMessages);

          await saveMessages({
            messages: responseMessagesWithoutIncompleteToolCalls.map(
              (message) => {
                const index =
                  responseMessagesWithoutIncompleteToolCalls.indexOf(message);
                // prevents all messages from being sent at the same time and causing issues when fetching
                const delay = index * 10;
                const messageId = generateUUID();

                if (message.role === "assistant") {
                  streamingData.appendMessageAnnotation({
                    messageIdFromServer: messageId,
                  });
                }

                return {
                  id: messageId,
                  chatId: id,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date(new Date().getTime() + delay),
                };
              },
            ),
          });
        } catch (error) {
          console.error("Failed to save messages");
          console.error(error);
        }
      }

      streamingData.close();
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const { title }: { title: string } = await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    console.log("Unauthorized");
    return new Response("Unauthorized", { status: 401 });
  }

  if (!id) {
    return new Response("id is required", { status: 400 });
  }
  if (!title) {
    return new Response("title is required", { status: 400 });
  }

  // check if chat exists for that user
  const chat = await getChatById({ id });
  if (!chat || chat.userId !== session.user.id) {
    return new Response("Chat not found", { status: 404 });
  }
  try {
    await updateChat({ id, userId: session.user.id, title });
    return new Response("Chat updated successfully", { status: 200 });
  } catch (error) {
    console.error("Failed to update chat");
    console.error(error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
