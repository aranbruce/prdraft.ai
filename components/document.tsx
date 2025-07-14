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
      onClick={(event) => {
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

        setBlock((current) => ({
          ...current,
          documentId: result?.id || "",
          content: result?.content || "",
          title: result?.title || "Untitled Document",
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
