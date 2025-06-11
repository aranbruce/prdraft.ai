"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Editor } from "./editor";
import { SubmitButton } from "./submit-button";

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

        <div className="border-input bg-accent mt-1 size-full min-h-0 rounded-md border px-1">
          <div className="size-full overflow-y-scroll py-2">
            <Editor
              content={companyInfo ?? ""}
              id="company-info-editor"
              suggestions={[]}
              saveContent={setCompanyInfo}
              status="idle"
              isCurrentVersion={true}
              currentVersionIndex={0}
            />
          </div>
        </div>
      </div>

      <SubmitButton isSuccessful={false}>Save</SubmitButton>
    </form>
  );
}
