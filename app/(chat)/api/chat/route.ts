import { convertToCoreMessages, Message, StreamData, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { models } from "@/ai/models";
import { templatePrompt, systemPrompt } from "@/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  getCompanyInfoByUserId,
  getDocumentById,
  getTemplatesByUserId,
  getTemporaryDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveTemporaryDocument,
  updateChat,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

type AllowedTools = "createDocument" | "updateDocument" | "getDocument";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "getDocument",
];

const allTools: AllowedTools[] = [...blocksTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
    templateId,
    currentDocumentId,
  }: {
    id: string;
    messages: Array<Message>;
    modelId: string;
    templateId: string;
    currentDocumentId?: string | null;
  } = await request.json();

  const session = await auth();
  const streamingData = new StreamData();
  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat && session?.user?.id) {
    const title = await generateTitleFromUserMessage({
      model,
      message: userMessage,
    });
    await saveChat({ id, userId: session.user.id, title });
  }
  if (session?.user?.id) {
    await saveMessages({
      messages: [
        {
          id: generateUUID(),
          createdAt: new Date(),
          chatId: id,
          content: userMessage.content,
          role: "user",
        },
      ],
    });
  }

  const fetchedTemplates = session
    ? await getTemplatesByUserId({
        userId: session?.user?.id ?? "",
      })
    : null;
  // Select the template that matches templateId, or fallback to the first
  let fetchedTemplatePrompt = null;
  if (fetchedTemplates && fetchedTemplates.length > 0) {
    if (templateId && templateId.trim()) {
      fetchedTemplatePrompt =
        fetchedTemplates.find((t) => t.id === templateId) ||
        fetchedTemplates[0];
    } else {
      fetchedTemplatePrompt = fetchedTemplates[0];
    }
  }

  const fetchedCompanyInfo = session
    ? await getCompanyInfoByUserId({
        userId: session?.user?.id ?? "",
      })
    : null;

  // Fetch current document context if available
  let currentDocumentContext = "";
  if (currentDocumentId) {
    try {
      let currentDocument = null;

      // First try to get regular document if user is logged in
      if (session?.user?.id) {
        currentDocument = await getDocumentById({ id: currentDocumentId });
        // Check ownership for regular documents
        if (currentDocument && currentDocument.userId !== session.user.id) {
          currentDocument = null;
        }
      }

      // If not found, try temporary document
      if (!currentDocument) {
        const tempDocs = await getTemporaryDocumentById(currentDocumentId);
        if (tempDocs && tempDocs.length > 0) {
          currentDocument = tempDocs[0];
        }
      }

      if (currentDocument) {
        currentDocumentContext = `
          CURRENT DOCUMENT CONTEXT:
          You are currently working with a document titled "${currentDocument.title}" (ID: ${currentDocument.id}).
          When users reference "the document", "this document", "my document", or similar terms, they are referring to this document.
          You can use the getDocument tool to retrieve the full content of this document when needed for context.
          Current document preview: ${currentDocument.content?.substring(0, 500)}${(currentDocument.content?.length || 0) > 500 ? "..." : ""}`;
      }
    } catch (error) {
      console.error("Error fetching current document context:", error);
    }
  }

  const result = streamText({
    model: customModel(model.apiIdentifier),
    system: `${systemPrompt} ${fetchedCompanyInfo?.content ? `. Make sure to utilize the following information about the company the user works for in your responses: ${fetchedCompanyInfo.content}` : ""}
    ${fetchedTemplatePrompt?.content ? `Use the following template for the product requirements document (PRD): ${fetchedTemplatePrompt.content}` : templatePrompt}${currentDocumentContext}
    `,
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

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system: `Write a product requirement document (PRD) for the given topic. Markdown is supported. Use headings wherever appropriate. Follow the following structure of a PRD:
              ${fetchedTemplatePrompt?.content || templatePrompt}
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

          if (session?.user?.id) {
            await saveDocument({
              id,
              title,
              content: draftText,
              userId: session.user.id,
            });
          } else {
            // Save as temporary document for guest users
            await saveTemporaryDocument({
              id,
              title,
              content: draftText,
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
          "Update a product requirements document (PRD) with the given description. This should only be used if the user requests changes to an existing document. This should never be used immediately after creating a document.",
        parameters: z.object({
          id: z.string().describe("The ID of the document to update"),
          description: z
            .string()
            .describe("The description of changes that need to be made"),
        }),
        execute: async ({ id, description }) => {
          let document = null;
          let isTemporary = false;

          // First try to get regular document if user is logged in
          if (session?.user?.id) {
            document = await getDocumentById({ id });
          }

          // If not found and user is not logged in, try temporary document
          if (!document) {
            const tempDocs = await getTemporaryDocumentById(id);
            if (tempDocs && tempDocs.length > 0) {
              document = tempDocs[0];
              isTemporary = true;
            }
          }

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

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system: `You are a helpful writing assistant. Based on the description, please update the product requirement document (PRD) using the following format:
              ${JSON.stringify(fetchedTemplatePrompt?.content) || templatePrompt}
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

          if (session?.user?.id && !isTemporary) {
            await saveDocument({
              id,
              title: document.title,
              content: draftText,
              userId: session.user.id,
            });
          } else if (isTemporary) {
            // Update temporary document
            await saveTemporaryDocument({
              id,
              title: document.title,
              content: draftText,
            });
          }

          return {
            id,
            title: document.title,
            content: "The document has been updated successfully.",
          };
        },
      },
      getDocument: {
        description:
          "Retrieve the current content of a document by its ID. Use this to get context about documents the user is discussing.",
        parameters: z.object({
          id: z.string().describe("The ID of the document to retrieve"),
        }),
        execute: async ({ id }) => {
          try {
            let document = null;

            // First try to get regular document if user is logged in
            if (session?.user?.id) {
              document = await getDocumentById({ id });
            }

            // If not found and user is not logged in, try temporary document
            if (!document) {
              const tempDocs = await getTemporaryDocumentById(id);
              if (tempDocs && tempDocs.length > 0) {
                document = tempDocs[0];
              }
            }

            if (!document) {
              return {
                error: "Document not found",
              };
            }

            // Check if the user has access to this document
            // For regular documents, check userId; temporary documents are accessible to everyone
            if (session?.user?.id && 'userId' in document && document.userId !== session.user.id) {
              return {
                error: "Unauthorized access to document",
              };
            }

            return {
              id: document.id,
              title: document.title,
              content: document.content || "",
              createdAt: document.createdAt,
            };
          } catch (error) {
            console.error("Error fetching document:", error);
            return {
              error: "Failed to retrieve document",
            };
          }
        },
      },
    },

    onFinish: async ({ response }) => {
      if (session?.user?.id) {
        try {
          const responseMessagesWithoutIncompleteToolCalls =
            sanitizeResponseMessages(response.messages);
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
