"use server";

import { type CoreUserMessage, generateText } from "ai";
import { cookies } from "next/headers";

import { customModel } from "@/ai";
import { Model } from "@/ai/models";

export async function saveModelId(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("model-id", model);
}

export async function generateTitleFromUserMessage({
  message,
  model,
}: {
  message: CoreUserMessage;
  model: Model;
}) {
  const { text: title } = await generateText({
    model: customModel(model.apiIdentifier),
    system: `\n
    - you will generate a short title for a Product Requirements Doc (PRD) based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - the title should be 1-5 words long
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}
