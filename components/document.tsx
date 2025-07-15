import { SetStateAction } from "react";

import { UIBlock } from "./block";
import { FileIcon, LoaderIcon, PencilEditIcon, SearchIcon } from "./icons";

const getActionText = (type: "create" | "update" | "view") => {
  switch (type) {
    case "create":
      return "Creating";
    case "update":
      return "Updating";
    case "view":
      return "Viewing";
    default:
      return null;
  }
};

interface DocumentToolResultProps {
  type: "create" | "update" | "view";
  result: any;
  block: UIBlock;
  setBlock: (value: SetStateAction<UIBlock>) => void;
}

export function DocumentToolResult({
  type,
  result,
  block,
  setBlock,
}: DocumentToolResultProps) {
  return (
    <div
      className="bg-card border-secondary flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border px-3 py-2"
      onClick={async () => {
        // Calculate positioning for side-by-side layout
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const blockWidth = Math.min(500, viewportWidth * 0.4); // 40% of screen width, max 500px
        const blockHeight = viewportHeight - 100; // Full height minus some padding

        // Position block on the right side
        const left = viewportWidth - blockWidth - 20; // 20px margin from right edge
        const top = 50; // Top padding

        const boundingBox = {
          top,
          left,
          width: blockWidth,
          height: blockHeight,
        };

        // Fetch the actual document content
        let actualContent = result?.content || "";
        let actualTitle = result?.title || "Untitled Document";

        // If this is a document creation result, we need to fetch the actual content
        if (
          result?.id &&
          (type === "create" ||
            actualContent ===
              "A document was created and is now visible to the user.")
        ) {
          try {
            // Fetch document content using the unified document API
            const response = await fetch(`/api/document?id=${result.id}`);

            if (response.ok) {
              const documents = await response.json();
              if (Array.isArray(documents) && documents.length > 0) {
                const document = documents[0];
                actualContent = document.content;
                actualTitle = document.title;
              }
            }
          } catch (error) {
            console.error("Failed to fetch document content:", error);
            // Fall back to the original content if fetching fails
          }
        }

        setBlock((current) => ({
          ...current,
          documentId: result?.id || "",
          content: actualContent,
          title: actualTitle,
          isVisible: true,
          status: "idle" as const,
          boundingBox,
        }));
      }}
    >
      <div className="text-muted-foreground mt-1">
        {type === "create" ? (
          <FileIcon />
        ) : type === "update" ? (
          <PencilEditIcon />
        ) : type === "view" ? (
          <SearchIcon />
        ) : null}
      </div>
      <div className="">
        {type === "view"
          ? `Fetched "${result?.title || "document"}"`
          : `${getActionText(type)} ${result?.title || "document"}`}
      </div>
    </div>
  );
}

interface DocumentToolCallProps {
  type: "create" | "update" | "view";
  args: any;
}

export function DocumentToolCall({ type, args }: DocumentToolCallProps) {
  return (
    <div className="bg-card flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex flex-row items-start gap-3">
        <div className="text-secondary-foreground mt-1">
          {type === "create" ? (
            <FileIcon />
          ) : type === "update" ? (
            <PencilEditIcon />
          ) : type === "view" ? (
            <SearchIcon />
          ) : null}
        </div>

        <div className="">
          {type === "view"
            ? `Fetching document ${args?.title || "document"}...`
            : `${getActionText(type)} ${args?.title || "document"}`}
        </div>
      </div>

      <div className="mt-1 animate-spin">{<LoaderIcon />}</div>
    </div>
  );
}
