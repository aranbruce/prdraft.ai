import { notFound } from "next/navigation";

import { templatePrompt } from "@/ai/prompts";
import { auth } from "@/app/(auth)/auth";
import { ChatHeader } from "@/components/custom/chat-header";
import TemplateForm from "@/components/custom/template-form";
import {
  getCompanyInfoByUserId,
  getTemplateByUserId,
  saveTemplate,
  saveCompanyInfo,
} from "@/db/queries";

export default async function Page(props: { params: Promise<any> }) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return notFound();
  }

  async function saveTemplateContent(templateContent: string) {
    "use server";
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return;
    }
    await saveTemplate({
      templateContent,
      userId: session.user.id,
    });
  }

  async function saveCompanyInfoContent(companyInfo: string) {
    "use server";
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return;
    }
    await saveCompanyInfo({
      companyInfoContent: companyInfo,
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

  async function getCompanyInfo() {
    "use server";
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return;
    }
    const companyInfo = await getCompanyInfoByUserId({
      userId: session.user.id,
    });
    if (!companyInfo) {
      return "";
    }
    return companyInfo.content;
  }

  const templateContent = (await getTemplate()) ?? "";
  const companyInfoContent = (await getCompanyInfo()) ?? "";

  const selectedModelId = ""; // Define selectedModelId with an appropriate value

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-background">
      <ChatHeader selectedModelId={selectedModelId} />

      <section className="mx-auto flex h-dvh w-full min-w-0 max-w-3xl flex-col gap-4 overflow-scroll px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <TemplateForm
          saveTemplate={saveTemplateContent}
          initialTemplateContent={templateContent}
          saveCompanyInfo={saveCompanyInfoContent}
          initialCompanyInfo={companyInfoContent}
        />
      </section>
    </div>
  );
}
