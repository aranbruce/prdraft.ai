import { notFound } from "next/navigation";

import { templatePrompt } from "@/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import { ChatHeader } from "@/components/custom/chat-header";
import TemplateForm from "@/components/custom/template-form";
import { getTemplateByUserId, updateTemplate } from "@/db/queries";

export default async function Page(props: { params: Promise<any> }) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return notFound();
  }

  async function saveTemplate({ content }: { content: string }) {
    "use server";
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return;
    }
    await updateTemplate({
      content,
      userId: session.user.id,
    });
  }

  async function getTemplate() {
    "use server";
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return;
    }
    const template = await getTemplateByUserId({ userId: session.user.id });
    if (!template) {
      return templatePrompt;
    }
    return template.content;
  }

  const content = (await getTemplate()) ?? "";

  const selectedModelId = ""; // Define selectedModelId with an appropriate value

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader selectedModelId={selectedModelId} />

      <section className="mx-auto flex h-dvh w-full min-w-0 max-w-3xl flex-col gap-4 overflow-scroll px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <h2 className="text-xl font-bold">PRD template</h2>
        <TemplateForm saveTemplate={saveTemplate} initialContent={content} />
      </section>
    </div>
  );
}
