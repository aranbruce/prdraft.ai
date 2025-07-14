"use client";

import { Attachment, Message } from "ai";
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
  memo,
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

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
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
  sendMessage: (message: Message, options?: any) => void;
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

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, []);

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

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
      adjustHeight();
    },
    [setInput, adjustHeight],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ name: string; contentType: string; id: string }>
  >([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Fetch templates and preferred template for the user
  useEffect(() => {
    async function fetchTemplatesAndPreferred() {
      try {
        // First fetch templates
        const templatesRes = await fetch("/api/templates");
        if (!templatesRes.ok) return;

        const data = await templatesRes.json();
        const templatesArray = (data || []) as Template[];

        if (templatesArray.length === 0) {
          setTemplates([]);
          return;
        }

        let selectedId = templatesArray[0].id; // Default fallback

        // Then try to fetch user's preferred template
        try {
          const preferredRes = await fetch("/api/user/preferred-template");
          if (preferredRes.ok) {
            const preferredData = await preferredRes.json();
            const preferredTemplateId = preferredData.preferredTemplateId;

            // Use preferred template if it exists and is valid
            if (
              preferredTemplateId &&
              templatesArray.some((t) => t.id === preferredTemplateId)
            ) {
              selectedId = preferredTemplateId;
            }
          }
        } catch (preferredError) {
          // Silently fail and use fallback
          console.warn("Failed to fetch preferred template:", preferredError);
        }

        // Set both templates and selected ID simultaneously to prevent flash
        setTemplates(templatesArray);
        setSelectedTemplateId(selectedId);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    }

    fetchTemplatesAndPreferred();
  }, []);

  // Save preferred template when selection changes
  const handleTemplateChange = useCallback(async (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Save as preferred template
    try {
      await fetch("/api/user/preferred-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
    } catch (error) {
      console.error("Failed to save preferred template:", error);
    }
  }, []);

  const submitForm = useCallback(() => {
    // Enhanced validation
    if (!input.trim() && attachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }

    if (uploadQueue.length > 0) {
      toast.error("Please wait for file uploads to complete");
      return;
    }

    if (session && status === "authenticated") {
      window.history.replaceState({}, "", `/chat/${chatId}`);
    }

    if (!session && messages.length > 2) {
      toast.error("Please login or sign up to continue.");
      return;
    }

    try {
      const message: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
        createdAt: new Date(),
        experimental_attachments:
          attachments.length > 0 ? attachments : undefined,
      };

      const options = {
        experimental_attachments: attachments,
        body: {
          templateId: currentTemplate?.id,
        },
      };

      sendMessage(message, options);

      setAttachments([]);
      setLocalStorageInput("");
      setInput(""); // Clear the parent input state

      if (width && width > 768) {
        textareaRef.current?.focus();
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  }, [
    input,
    attachments,
    uploadQueue.length,
    session,
    status,
    chatId,
    messages.length,
    sendMessage,
    currentTemplate?.id,
    setAttachments,
    setLocalStorageInput,
    setInput,
    width,
  ]);

  const uploadFile = useCallback(async (file: File) => {
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

        if (!url || !pathname) {
          throw new Error("Invalid response from upload service");
        }

        return {
          url,
          name: originalFileName || file.name,
          contentType: contentType || "application/octet-stream",
          pathname: pathname,
        };
      } else if (response.status === 401) {
        toast.error("You must be logged in to upload files.");
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Upload failed" }));
        toast.error(
          errorData.error || `Upload failed with status ${response.status}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to upload ${file.name}:`, error.message);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        console.error("Unexpected error during file upload:", error);
        toast.error("Failed to upload file, please try again!");
      }
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Validate file sizes (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = files.filter((file) => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        toast.error(
          `Files too large: ${oversizedFiles.map((f) => f.name).join(", ")}. Maximum size is 10MB.`,
        );
        return;
      }

      setUploadQueue(
        files.map((file) => ({
          name: file.name,
          contentType: file.type,
          id: `${Date.now()}-${Math.random()}`,
        })),
      );

      try {
        const uploadPromises = files.map(async (file) => {
          try {
            return await uploadFile(file);
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            return null;
          }
        });

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment): attachment is NonNullable<typeof attachment> =>
            attachment !== undefined && attachment !== null,
        );

        if (successfullyUploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...successfullyUploadedAttachments,
          ]);
        }

        if (successfullyUploadedAttachments.length < files.length) {
          const failedCount =
            files.length - successfullyUploadedAttachments.length;
          toast.error(`${failedCount} file(s) failed to upload`);
        }
      } catch (error) {
        console.error("Error uploading files!", error);
        toast.error("An unexpected error occurred during file upload");
      } finally {
        setUploadQueue([]);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [uploadFile, setAttachments],
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
        accept="image/*,application/pdf,.txt,.md,.json,.csv,.doc,.docx"
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
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();

                if (isLoading) {
                  toast.error(
                    "Please wait for the model to finish its response!",
                  );
                } else if (!input.trim() && attachments.length === 0) {
                  toast.error("Please enter a message or attach a file");
                } else if (uploadQueue.length > 0) {
                  toast.error("Please wait for file uploads to complete");
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
                aria-label="Attach files"
                title="Attach files (Max 10MB each)"
              >
                <PaperclipIcon size={14} />
              </Button>
              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className="hover:bg-secondary focus-visible:bg-secondary h-9 w-auto cursor-pointer gap-2 rounded-lg border-0 bg-transparent pr-2 pl-3 text-sm font-medium focus:ring-0 focus:ring-offset-0 focus:outline-0 focus-visible:ring-2 focus-visible:ring-offset-1">
                  <SelectValue
                    placeholder={
                      currentTemplate?.title ||
                      templates[0]?.title ||
                      "Select a template"
                    }
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
                aria-label="Stop generation"
                title="Stop message generation"
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
                disabled={
                  (!input.trim() && attachments.length === 0) ||
                  uploadQueue.length > 0
                }
                title={
                  !input.trim() && attachments.length === 0
                    ? "Enter a message or attach a file to send"
                    : uploadQueue.length > 0
                      ? "Wait for uploads to complete"
                      : "Send message"
                }
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

                    const message: Message = {
                      id: crypto.randomUUID(),
                      role: "user",
                      content: suggestedAction.action,
                      createdAt: new Date(),
                    };

                    sendMessage(message);
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

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.attachments.length !== nextProps.attachments.length)
      return false;
    return true;
  },
);
