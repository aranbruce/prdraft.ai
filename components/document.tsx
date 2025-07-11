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
  setBlock,
}: DocumentToolResultProps) {
  return (
    <div
      className="bg-card border-secondary flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border px-3 py-2"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        setBlock({
          documentId: result?.id || "",
          content: "",
          title: result?.title || "Untitled Document",
          isVisible: true,
          status: "idle",
          boundingBox,
        });
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
