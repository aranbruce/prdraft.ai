import { SetStateAction } from "react";

import { UIBlock } from "./block";
import {
  FileIcon,
  LoaderIcon,
  MessageIcon,
  PencilEditIcon,
  CodeIcon,
  PaletteIcon,
} from "./icons";

const getActionText = (
  type:
    | "create"
    | "update"
    | "request-pm-suggestions"
    | "request-engineer-suggestions"
    | "request-designer-suggestions",
) => {
  switch (type) {
    case "create":
      return "Creating";
    case "update":
      return "Updating";
    case "request-pm-suggestions":
      return "Adding PM suggestions";
    case "request-engineer-suggestions":
      return "Adding engineer suggestions";
    case "request-designer-suggestions":
      return "Adding designer suggestions";
    default:
      return null;
  }
};

interface DocumentToolResultProps {
  type:
    | "create"
    | "update"
    | "request-pm-suggestions"
    | "request-engineer-suggestions"
    | "request-designer-suggestions";
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
      className="flex w-fit cursor-pointer flex-row items-start gap-3 rounded-xl border bg-card px-3 py-2"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();

        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        setBlock({
          documentId: result.id,
          content: "",
          title: result.title,
          isVisible: true,
          status: "idle",
          boundingBox,
        });
      }}
    >
      <div className="mt-1 text-muted-foreground">
        {type === "create" ? (
          <FileIcon />
        ) : type === "update" ? (
          <PencilEditIcon />
        ) : type === "request-pm-suggestions" ? (
          <MessageIcon />
        ) : type === "request-engineer-suggestions" ? (
          <CodeIcon />
        ) : type === "request-designer-suggestions" ? (
          <PaletteIcon />
        ) : null}
      </div>
      <div className="">
        {getActionText(type)} {result.title}
      </div>
    </div>
  );
}

interface DocumentToolCallProps {
  type:
    | "create"
    | "update"
    | "request-pm-suggestions"
    | "request-engineer-suggestions"
    | "request-designer-suggestions";
  args: any;
}

export function DocumentToolCall({ type, args }: DocumentToolCallProps) {
  return (
    <div className="flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex flex-row items-start gap-3">
        <div className="mt-1 text-zinc-500">
          {type === "create" ? (
            <FileIcon />
          ) : type === "update" ? (
            <PencilEditIcon />
          ) : type === "request-pm-suggestions" ? (
            <MessageIcon />
          ) : type === "request-engineer-suggestions" ? (
            <CodeIcon />
          ) : type === "request-designer-suggestions" ? (
            <PaletteIcon />
          ) : null}
        </div>

        <div className="">
          {getActionText(type)} {args.title}
        </div>
      </div>

      <div className="mt-1 animate-spin">{<LoaderIcon />}</div>
    </div>
  );
}
