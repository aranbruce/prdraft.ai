"use client";

import { useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "./submit-button";
import { Textarea } from "../ui/textarea";

export default function TemplateForm({
  saveTemplate,
  initialContent,
}: {
  saveTemplate: (template: { content: string }) => void;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);

  function handleSubmit(event: any) {
    event.preventDefault();
    saveTemplate({ content: content });
    toast.success("Template saved");
    toast.error("Failed to save template");
  }

  return (
    <form onSubmit={handleSubmit} className="flex size-full flex-col gap-4">
      <Textarea
        name="content"
        value={content ?? ""}
        onChange={(e) => setContent(e.target.value)}
        className="h-full resize-none bg-accent text-base outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />

      <SubmitButton isSuccessful={false}>Save</SubmitButton>
    </form>
  );
}
