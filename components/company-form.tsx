"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Editor } from "./editor";
import { SubmitButton } from "./submit-button";
import { Textarea } from "./ui/textarea";

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
      className="grid size-full min-h-0 grid-rows-[1fr_1fr_auto] gap-6"
    >
      <label className="flex min-h-0 flex-col text-base font-semibold">
        Company information
        <div className="border-input bg-accent mt-1 size-full min-h-0 rounded-md border px-1">
          <div className="size-full overflow-y-scroll py-2">
            <Editor
              content={companyInfo ?? ""}
              suggestions={[]}
              saveContent={setCompanyInfo}
              status="idle"
              isCurrentVersion={true}
              currentVersionIndex={0}
            />
          </div>
        </div>
      </label>

      <SubmitButton isSuccessful={false}>Save</SubmitButton>
    </form>
  );
}
