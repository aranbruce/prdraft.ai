"use client";

import { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import cx from "classnames";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import { sanitizeUIMessages } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ArrowUpIcon, PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

import { Template } from "./template-card";
import { template } from "@/lib/db/schema";

const suggestedActions = [
  {
    title: "PRD for a login page",
    action: "Write a PRD for a login page",
  },
  {
    title: "PRD for an AI chatbot",
    action: "Write a PRD for an AI chatbot",
  },
  {
    title: "Critique a PRD",
    action: "Help me critique my product requirements document",
  },
];

export function MultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [input]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    "",
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ name: string; contentType: string }>
  >([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Fetch templates for the user
  useEffect(() => {
    async function fetchTemplates() {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        const templatesArray = (data || []) as Template[];
        setTemplates(templatesArray);
        if (templatesArray.length > 0) {
          setSelectedTemplateId(templatesArray[0].id);
        }
      }
    }
    fetchTemplates();
  }, []);

  const submitForm = useCallback(() => {
    if (session && status === "authenticated") {
      window.history.replaceState({}, "", `/chat/${chatId}`);
    }

    if (!session && messages.length > 2) {
      toast.error("Please login or sign up to continue.");
      return;
    }

    handleSubmit(undefined, {
      experimental_attachments: attachments,
      body: {
        templateId: selectedTemplateId || undefined,
      },
    });

    setAttachments([]);
    setLocalStorageInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    session,
    status,
    messages.length,
    handleSubmit,
    attachments,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Fallback to file.name if originalFileName is missing (for PDFs or any file)
        const { url, pathname, contentType, originalFileName } = data;
        return {
          url,
          name: originalFileName || file.name,
          contentType: contentType,
          pathname: pathname,
        };
      } else if (response.status === 401) {
        toast.error("You must be logged in to upload files.");
      } else {
        const { error } = await response.json();
        toast.error(error);
      }
    } catch (error) {
      toast.error("Failed to upload file, please try again!");
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(
        files.map((file) => ({ name: file.name, contentType: file.type })),
      );

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  return (
    <div className="relative flex w-full flex-col gap-4">
      <input
        type="file"
        className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-row items-end gap-2 overflow-x-scroll">
          {attachments.map((attachment, idx) => (
            <PreviewAttachment
              key={attachment.url}
              attachment={attachment}
              onRemove={() => {
                setAttachments((prev) => prev.filter((a, i) => i !== idx));
              }}
            />
          ))}

          {uploadQueue.map((file) => (
            <PreviewAttachment
              key={file.name}
              attachment={{
                url: "",
                name: file.name,
                contentType: file.contentType,
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}
      <div className="-gap-2 flex flex-col">
        <div
          className={cx(
            "outline:none border-input ring-offset-background focus-within:ring-ring overflow-hidden rounded-xl border focus-within:ring-2 focus-within:outline-hidden focus:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:outline-hidden has-[button:focus]:ring-0",
            className,
          )}
        >
          <Textarea
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={handleInput}
            className="max-h-32 resize-none overflow-y-scroll rounded-none border-0 border-none bg-transparent text-base ring-0 outline-hidden focus:outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-hidden"
            rows={2}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();

                if (isLoading) {
                  toast.error(
                    "Please wait for the model to finish its response!",
                  );
                } else {
                  submitForm();
                }
              }
            }}
          />
          <div className="flex flex-row items-center justify-between gap-2 p-2">
            <div className="flex flex-1 items-center">
              <Button
                className="hover:bg-secondary focus-visible:bg-secondary h-9 rounded-lg p-2"
                onClick={(event) => {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
                variant="ghost"
                disabled={isLoading}
              >
                <PaperclipIcon size={14} />
              </Button>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger className="hover:bg-secondary focus-visible:bg-secondary h-9 w-auto cursor-pointer gap-2 rounded-lg border-0 bg-transparent pr-2 pl-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 focus:outline-0 focus-visible:ring-2 focus-visible:ring-offset-1">
                  <SelectValue
                    placeholder={templates[0]?.title || "Select a template"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.length > 0 &&
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <Button
                className="h-9 rounded-lg p-2"
                onClick={(event) => {
                  event.preventDefault();
                  stop();
                  setMessages((messages) => sanitizeUIMessages(messages));
                }}
              >
                <StopIcon size={14} />
              </Button>
            ) : (
              <Button
                className="h-8 rounded-lg p-2"
                onClick={(event) => {
                  event.preventDefault();
                  submitForm();
                }}
                disabled={input.length === 0 || uploadQueue.length > 0}
              >
                <ArrowUpIcon size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="flex w-full flex-row justify-center gap-2">
            {suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.3 + 0.05 * index }}
                key={index}
                className={index > 1 ? "hidden sm:block" : "block"}
              >
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (session && status === "authenticated") {
                      window.history.replaceState({}, "", `/chat/${chatId}`);
                    }

                    append({
                      role: "user",
                      content: suggestedAction.action,
                    });
                  }}
                  className="h-auto w-fit flex-1 items-start justify-start gap-1 rounded-full border px-2.5 py-1 text-left text-xs sm:flex-col"
                >
                  <span className="font-medium">{suggestedAction.title}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        )}
    </div>
  );
}
