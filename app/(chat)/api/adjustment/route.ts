import { streamText } from "ai";

import { customModel } from "@/ai";
import { models } from "@/ai/models";
import { auth } from "@/app/(auth)/auth";
import { getChatById, getDocumentById } from "@/lib/db/queries";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // useCompletion sends the prompt as the main content
    const { prompt, documentId, modelId, chatId } = body;

    // Validate required fields
    if (!prompt || !documentId || !modelId || !chatId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["prompt", "documentId", "modelId", "chatId"],
        }),
        { status: 400 },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const model = models.find((m) => m.id === modelId);
    if (!model) {
      return new Response("Model not found", { status: 404 });
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    const document = await getDocumentById({ id: documentId });
    if (!document) {
      return new Response("Document not found", { status: 404 });
    }

    // Create a system prompt for text adjustment
    const systemPrompt = `You are an expert editor helping to adjust specific parts of a document. 
    
    The user has selected a specific portion of text and wants you to adjust it based on their request.
    
    Rules:
    1. Only modify the selected text, do not change anything else
    2. Maintain the same format and structure unless specifically asked to change it
    3. Keep the same tone and style as the original unless asked to change it
    4. Return only the adjusted text, nothing else
    5. Do not add explanations, comments, or surrounding context
    6. Do not wrap the response in quotation marks, backticks, or any other formatting
    7. Do not start with phrases like "Here is the adjusted text:" or similar
    8. If the original text includes markdown formatting, preserve it unless asked to change it
    9. Start your response immediately with the adjusted content`;

    const result = streamText({
      model: customModel(model.apiIdentifier),
      system: systemPrompt,
      prompt,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in adjustment API:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
