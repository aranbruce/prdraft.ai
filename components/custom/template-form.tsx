"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "./submit-button";
import { Textarea } from "../ui/textarea";

export default function TemplateForm({
  saveTemplate,
  initialTemplateContent,
  saveCompanyInfo,
  initialCompanyInfo,
}: {
  saveTemplate: (template: string) => void;
  initialTemplateContent: string;
  saveCompanyInfo: (companyInfo: string) => void;
  initialCompanyInfo: string;
}) {
  const [templateContent, setTemplateContent] = useState(
    initialTemplateContent,
  );
  const [companyInfo, setCompanyInfo] = useState(initialCompanyInfo);

  function handleSubmit(event: any) {
    event.preventDefault();
    try {
      saveTemplate(templateContent);
      saveCompanyInfo(companyInfo);
      toast.success("Information saved");
    } catch (error) {
      toast.error("Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex size-full flex-col gap-6">
      <div className="flex grow flex-col gap-1">
        <label htmlFor="templateContent" className="text-base font-semibold">
          Template
        </label>
        <Textarea
          name="templateContent"
          placeholder="Enter template for your PRDs"
          value={templateContent ?? ""}
          onChange={(e) => setTemplateContent(e.target.value)}
          className="h-full resize-none bg-accent text-base outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      <div className="flex grow flex-col gap-1">
        <label htmlFor="companyInfoContent" className="text-base font-semibold">
          Company information
        </label>
        <Textarea
          name="companyInfoContent"
          placeholder="Enter information about your company"
          value={companyInfo ?? ""}
          onChange={(e) => setCompanyInfo(e.target.value)}
          className="h-full resize-none bg-accent text-base outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <SubmitButton isSuccessful={false}>Save</SubmitButton>
    </form>
  );
}
