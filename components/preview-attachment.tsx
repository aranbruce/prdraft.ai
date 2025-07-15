import { Attachment } from "ai";
import Image from "next/image";
import React, { useState } from "react";

import { CloseIcon, LoaderIcon } from "./icons";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePreviewClick = () => {
    if (
      url &&
      (contentType?.startsWith("image") || contentType === "application/pdf")
    ) {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(false);
  };

  const renderPreview = () => {
    if (isUploading) {
      return (
        <div className="flex h-full w-full animate-spin items-center justify-center">
          <LoaderIcon />
        </div>
      );
    }
    if (!contentType || typeof url !== "string" || !url) {
      return (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
          No preview
        </div>
      );
    }
    if (contentType.startsWith("image")) {
      return (
        <Image
          key={url}
          src={url}
          alt={name ?? "An image attachment"}
          className="size-full cursor-pointer rounded-md object-cover"
          width={400}
          height={300}
          onClick={handlePreviewClick}
        />
      );
    }
    if (contentType === "application/pdf") {
      return (
        <div
          className="bg-accent border-secondary flex size-full cursor-pointer flex-col items-center justify-center rounded-md border object-cover p-2 break-all"
          onClick={handlePreviewClick}
          role="button"
          tabIndex={0}
          aria-label="Preview PDF"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handlePreviewClick();
          }}
        >
          {/* Static PDF preview image */}
          <h3 className="text-muted-foreground mb-1 text-xs">{name}</h3>
          <p
            className="text-muted-foreground w-full truncate px-1 text-center text-[10px]"
            title={name}
          >
            PDF Preview
          </p>
        </div>
      );
    }
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
        No preview
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="bg-muted relative flex aspect-video w-20 flex-col items-center justify-center rounded-md">
          {onRemove && !isUploading && (
            <button
              type="button"
              className="focus:ring-primary-500 focus-visible:ring-muted-foreground bg-background text-secondary-foreground absolute top-0.5 right-0.5 z-10 cursor-pointer rounded-full p-1 shadow-sm focus:outline-0 focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={onRemove}
              aria-label="Remove attachment"
            >
              <span className="sr-only">Remove</span>
              <CloseIcon size={14} />
            </button>
          )}
          {renderPreview()}
        </div>
      </div>
      {isModalOpen && url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleModalClose}
        >
          <div
            className="relative max-h-full max-w-full overflow-hidden rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="focus:ring-primary-500 focus-visible:ring-muted-foreground bg-background text-secondary-foreground absolute top-2 right-2 z-10 cursor-pointer rounded-full p-2 shadow-sm focus:outline-0 focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={handleModalClose}
              aria-label="Close preview"
            >
              <CloseIcon size={16} />
            </button>
            {contentType?.startsWith("image") ? (
              <Image
                src={url}
                alt={name ?? "Preview"}
                className="max-h-[80vh] max-w-[80vw] object-contain"
                width={800}
                height={600}
              />
            ) : contentType === "application/pdf" ? (
              <embed
                src={url}
                type="application/pdf"
                className="h-[80vh] max-h-[80vh] w-[80vw] max-w-[80vw]"
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};
