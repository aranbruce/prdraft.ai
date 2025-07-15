"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MarkDownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";

export default function CompanyForm({
  saveCompanyInfo,
  initialCompanyInfo,
}: {
  saveCompanyInfo: (companyInfo: string) => void;
  initialCompanyInfo: string;
}) {
  const [companyInfo, setCompanyInfo] = useState(initialCompanyInfo);

  function handleSubmit(event: any) {
    event.preventDefault();
    try {
      saveCompanyInfo(companyInfo);
      toast.success("Information saved");
    } catch (error) {
      toast.error("Failed to save");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex h-full max-h-[800px] min-h-96 w-full max-w-4xl flex-1 flex-col gap-6"
    >
      <div className="flex min-h-0 flex-col gap-2">
        <label
          htmlFor="company-info-editor"
          className="flex min-h-0 flex-col text-xl font-semibold"
        >
          Company information
        </label>
        <p className="text-muted-foreground">
          This information will be used to generate responses in the chat. You
          can edit it at any time.
        </p>
        <MarkDownEditor
          content={companyInfo}
          onChange={(content) => setCompanyInfo(content)}
          placeholder="Enter company information in markdown format"
          className="prose prose-sm size-full min-h-0 max-w-none focus:outline-none"
          id="company-info-editor"
        />
      </div>

      <SubmitButton isSuccessful={false}>Save</SubmitButton>
    </form>
  );
}
