import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { ChatHeader } from "@/components/chat-header";
import CompanyForm from "@/components/company-form";
import TemplateManager from "@/components/template-manager";
import { getCompanyInfoByUserId, saveCompanyInfo } from "@/lib/db/queries";

export default async function Page(props: { params: Promise<any> }) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return notFound();
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

  const companyInfoContent = (await getCompanyInfo()) ?? "";

  const selectedModelId = ""; // Define selectedModelId with an appropriate value

  return (
    <div className="bg-background flex h-dvh min-w-0 flex-col">
      <ChatHeader selectedModelId={selectedModelId} />

      <section className="mx-auto flex h-dvh w-full min-w-0 flex-col gap-12 overflow-scroll px-4 py-12">
        <TemplateManager />
        <CompanyForm
          saveCompanyInfo={saveCompanyInfoContent}
          initialCompanyInfo={companyInfoContent}
        />
      </section>
    </div>
  );
}
