import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

export const customModel = (apiIdentifier: string) => {
  return wrapLanguageModel({
    model: apiIdentifier.startsWith("gemini")
      ? google(apiIdentifier)
      : apiIdentifier.startsWith("claude")
        ? anthropic(apiIdentifier)
        : openai(apiIdentifier),
    middleware: customMiddleware,
  });
};
