import { Attachment } from "ai";

import { LoaderIcon } from "./icons";

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

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-muted relative flex aspect-video w-20 flex-col items-center justify-center rounded-md">
        {onRemove && !isUploading && (
          <button
            type="button"
            className="border-muted-foreground focus:ring-primary-500 focus-visible:ring-muted-foreground absolute top-1 right-1 z-10 cursor-pointer rounded-full border bg-white/80 p-0.5 shadow-sm hover:bg-white focus:outline-0 focus-visible:ring-2 focus-visible:ring-offset-2"
            onClick={onRemove}
            aria-label="Remove attachment"
          >
            <span className="sr-only">Remove</span>
            {/* X icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-primary-foreground h-4 w-4"
            >
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        {isUploading ? (
          <div className="flex h-full w-full animate-spin items-center justify-center">
            <LoaderIcon />
          </div>
        ) : contentType && typeof url === "string" && url ? (
          contentType.startsWith("image") ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? "An image attachment"}
              className="size-full rounded-md object-cover"
            />
          ) : contentType === "application/pdf" ? (
            <embed
              key={url}
              src={url}
              type="application/pdf"
              className="size-full rounded-md object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
              No preview
            </div>
          )
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
            No preview
          </div>
        )}
      </div>
      <div className="text-secondary-foreground max-w-16 truncate text-center text-xs">
        {name}
      </div>
    </div>
  );
};
