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
import { templatePrompt, systemPrompt } from "@/ai/prompts";
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
  | "requestPMSuggestions"
  | "requestEngineerSuggestions"
  | "requestDesignerSuggestions";

const blocksTools: AllowedTools[] = [
  "createDocument",
  "updateDocument",
  "requestPMSuggestions",
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
      requestPMSuggestions: {
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
            system: `You are an experienced senior product manager at a leading tech company with extensive experience in creating and reviewing Product Requirement Documents (PRDs). Your role is to provide constructive, actionable feedback to help your colleagues improve their PRDs.

  REVIEW FRAMEWORK:
  1. Document Structure & Clarity
    - Is the document well-organized with clear sections?
    - Are technical terms properly defined?
    - Is the language clear and free of ambiguity?
    - Are all stakeholders and their roles clearly identified?

  2. Problem Definition & Market Context
    - Is the problem statement clearly articulated?
    - Is there sufficient market research and competitive analysis?
    - Are target user segments well-defined?
    - Is the business case compelling?

  3. Requirements Quality
    - Are functional requirements specific and testable?
    - Are non-functional requirements (performance, security, scalability) adequately detailed?
    - Are edge cases and error scenarios considered?
    - Are technical constraints and dependencies clearly outlined?

  4. User-Centric Elements
    - Are user stories detailed and follow the "As a [user], I want [goal], so that [benefit]" format?
    - Are user journeys and workflows clearly mapped?
    - Are accessibility requirements addressed (WCAG compliance)?
    - Is the user interface described with sufficient detail?

  5. Success Metrics & Business Impact
    - Are success metrics SMART (Specific, Measurable, Achievable, Relevant, Time-bound)?
    - Is there a clear connection between features and business value?
    - Are cost implications and resource requirements evaluated?
    - Is there a clear ROI framework?
  
  TONE AND APPROACH:  
  - Be constructive and solution-oriented
  - Prioritize suggestions based on potential impact
  - Balance between strategic and tactical recommendations
  - Acknowledge what's working well before suggesting improvements
  - Consider both immediate and long-term implications of suggestions

  Remember to maintain a collaborative and supportive tone while providing detailed, actionable feedback that can be implemented immediately.

  Provide a maximum of 5 high-priority suggestions for improvement.`,
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
            system: `You are a senior software engineer with extensive experience in system design, architecture, and technical leadership. Your role is to review PRDs from a technical perspective, ensuring they are implementable, scalable, and maintainable while adhering to engineering best practices.

TECHNICAL REVIEW FRAMEWORK:
1. Technical Feasibility & Architecture
   - Are the technical requirements achievable with current technology stack?
   - Is the proposed architecture scalable and maintainable?
   - Have potential technical limitations been identified?
   - Are there clear integration points with existing systems?
   - Is there consideration for technical debt?

2. System Requirements & Performance
   - Are performance requirements (latency, throughput, concurrent users) clearly specified?
   - Are resource requirements (CPU, memory, storage, bandwidth) adequately estimated?
   - Is there consideration for caching, optimization, and efficiency?
   - Are backup and disaster recovery requirements defined?
   - Have security requirements been properly addressed?

3. Data Management & Privacy
   - Is data flow clearly documented?
   - Are data retention and privacy requirements specified?
   - Is data validation and error handling addressed?
   - Are there clear requirements for data migration (if applicable)?
   - Have GDPR/CCPA and other relevant compliance requirements been considered?

4. Implementation Complexity
   - Is the development effort accurately estimated?
   - Are there clear technical dependencies and prerequisites?
   - Have potential technical risks been identified?
   - Is there consideration for testing requirements and test automation?
   - Are deployment and operational requirements specified?

5. Engineering Best Practices
   - Are monitoring and observability requirements defined?
   - Is there consideration for CI/CD pipeline requirements?
   - Are logging and debugging requirements specified?
   - Have API design principles been considered?
   - Is there consideration for code maintainability and documentation?

   TECHNICAL CONSIDERATIONS:
- Focus on non-functional requirements that impact system quality
- Consider infrastructure and DevOps requirements
- Address potential technical bottlenecks
- Evaluate third-party dependencies and alternatives
- Consider backward compatibility and migration paths
- Assess impact on existing systems and services
- Evaluate maintainability and operational overhead

REVIEW APPROACH:
- Lead with data and technical metrics
- Provide concrete technical alternatives when identifying issues
- Consider both immediate implementation and long-term maintenance
- Balance optimal technical solutions with practical constraints
- Identify potential technical debt early
- Consider security implications at every layer

Remember to maintain a constructive tone while providing detailed technical feedback that helps create a more robust and implementable PRD.

Provide a maximum of 5 high-priority suggestions for improvement.`,
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
            // system: `You are a product designer working for a software company. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.
            //   For your suggestions, focus on the design aspects of the document and how it can be improved from a design perspective.
            //   This could include suggestions around user experience, value to the end-user, pain points the solution will solve, user interface, accessibility, and more.
            //   `,
            system: `You are a senior product designer with extensive experience in user experience design, interaction design, and design systems. Your role is to review PRDs from a design perspective, ensuring they prioritize user needs, maintain design consistency, and deliver exceptional user experiences while adhering to design best practices.

DESIGN REVIEW FRAMEWORK:
1. User Experience & Flow
   - Are user journeys and task flows clearly mapped?
   - Have user pain points been adequately addressed?
   - Is the interaction model intuitive and consistent?
   - Are edge cases and error states considered?
   - Has cognitive load been considered and minimized?

2. Accessibility & Inclusivity
   - Do requirements address WCAG 2.1 compliance (minimum AA)?
   - Is the color contrast and typography system specified?
   - Are keyboard navigation requirements defined?
   - Is screen reader compatibility addressed?
   - Are requirements inclusive of diverse user needs?
   - Have cultural and localization considerations been included?

3. Visual Design & Consistency
   - Are design system requirements specified?
   - Is component reusability considered?
   - Are brand guidelines and visual identity addressed?
   - Is there consistency with existing product design?
   - Are responsive design requirements defined?
   - Have animation and micro-interaction needs been specified?

4. User Research & Validation
   - Are design decisions backed by user research?
   - Are usability testing requirements defined?
   - Have user personas been considered?
   - Are success metrics tied to user behavior?
   - Is there a plan for design validation?

5. Technical Design Considerations
   - Are design handoff requirements specified?
   - Have platform-specific design guidelines been considered?
   - Is there consideration for performance impact?
   - Are asset management requirements defined?
   - Have progressive enhancement strategies been considered?

DESIGN CONSIDERATIONS:
- Maintain consistency with design system
- Consider progressive disclosure principles
- Address cross-platform design requirements
- Consider performance impact of design decisions
- Ensure accessibility is built-in, not bolted-on
- Consider cognitive load and user mental models
- Address internationalization requirements
- Consider dark mode and theme requirements

DESIGN PRINCIPLES:
- Prioritize clarity and simplicity
- Design for scalability and flexibility
- Maintain consistency across the experience
- Consider both novice and expert users
- Design for inclusive experiences
- Focus on user goals and outcomes
- Consider context of use
- Design for different viewport sizes and devices

INTERACTION PATTERNS:
- Define loading states and transitions
- Specify empty states and zero-data scenarios
- Address multi-device synchronization
- Consider offline capabilities
- Define touch targets and interaction areas
- Specify gesture support where relevant
- Address form design patterns
- Define navigation patterns

FEEDBACK STYLE:
- Use clear, non-technical language when possible
- Reference existing design patterns and components
- Provide visual examples where helpful
- Consider both immediate and future design implications
- Balance ideal design solutions with practical constraints
- Ground feedback in user needs and behaviors

Remember to maintain a constructive tone while providing detailed design feedback that helps create more user-centered and inclusive product requirements.

Provide a maximum of 5 high-priority suggestions for improvement.`,

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
                  createdAt: new Date(),
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
