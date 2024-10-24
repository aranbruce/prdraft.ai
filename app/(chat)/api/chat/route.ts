import { convertToCoreMessages, Message, streamText } from "ai";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import { getTitleFromChat } from "@/lib/utils";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  // if (!session) {
  //   return new Response("Unauthorized", { status: 401 });
  // }

  const coreMessages = convertToCoreMessages(messages);

  // const developerThoughts = await generateText({
  //   model: customModel,
  //   system: `You are a full stack developer reviewing a product requirement document (PRD) for a new feature.
  //   It is your job to help the product manager create the PRD by providing feedback on the content and structure.
  //   `,
  //   prompt: `Here is the conversation so far:
  //   ${JSON.stringify(messages)}
  //   `,
  // });

  // console.log("Developer Thoughts", developerThoughts);

  // const productDesignerThoughts = await generateText({
  //   model: customModel,
  //   system: `You are a product designer reviewing a product requirement document (PRD) for a new feature.
  //   It is your job to help the product manager create the PRD by providing feedback on the content and structure.
  //   `,
  //   prompt: `Here is the conversation so far:
  //   ${JSON.stringify(messages)}
  //   `,
  // });

  // console.log("Product Design Thoughts", productDesignerThoughts);

  const result = await streamText({
    model: customModel,
    system: `
      You are an assistant that helps product managers create product requirement docs (PRDs).
      You can help with:
      - Creating a new PRD
      - Editing an existing PRD
      - Reviewing a PRD
      When creating a new PRD, you should format your PRD in the following way:
      # 1. Project overview
        Designs: {Link to the designs if relevant}
        Stakeholders: {List of stakeholders}
        Objective: {Objective of the project}
        Key Results: {Key results of the project}
      # 2. Problem statement
        Problem: {Problem statement}
        Impact: {Impact of the problem}
        Solution: {Proposed solution}
      # 3. Context
      - Describe the current process and experience
      - Talk about the challenges faced by users, stakeholders and the business
      - Include any data or research that supports the need for this project
      - Talk through the designs for the new proposed solution and explain how it solves the problem
      # 4. User stories
      Create relevant user stories for the project in the following format:
      As a {type of user}, I want {objective of the user} so that {reason for the objective}
      If relevant include acceptance criteria for each user story in the following format:
      Given {context}, when {action}, then {outcome}. If there are multiple scenarios, list them out and give each one a descriptive title.
      # 5. Non-functional requirements
      Include any non-functional requirements that are relevant to the project. These can include performance, security, accessibility, event tracking etc.
      # 6. Dependencies
      List out any dependencies that the project has on other teams or projects.
      # 7. Success metrics
      Define the success metrics that will be used to measure the success of the project.
      
      Make sure to ask the user for any missing information and provide guidance on how to structure the PRD.

    `,
    messages: coreMessages,
    maxSteps: 5,

    onFinish: async ({ responseMessages }) => {
      if (!session) {
        return;
      }
      if (session.user && session.user.id) {
        const coreMessagesForTitle = convertToCoreMessages(messages);
        const title = await getTitleFromChat(coreMessagesForTitle);
        try {
          await saveChat({
            id,
            title: title,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat", error);
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
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
    console.error("An error occurred while processing your request", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
