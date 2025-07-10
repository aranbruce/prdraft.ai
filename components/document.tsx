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

const getActionText = (type: "create" | "update") => {
  switch (type) {
    case "create":
      return "Creating";
    case "update":
      return "Updating";
    default:
      return null;
  }
};

interface DocumentToolResultProps {
  type: "create" | "update";
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
      <div className="text-muted-foreground mt-1">
        {type === "create" ? (
          <FileIcon />
        ) : type === "update" ? (
          <PencilEditIcon />
        ) : null}
      </div>
      <div className="">
        {getActionText(type)} {result.title}
      </div>
    </div>
  );
}

interface DocumentToolCallProps {
  type: "create" | "update";
  args: any;
}

export function DocumentToolCall({ type, args }: DocumentToolCallProps) {
  return (
    <div className="flex w-fit flex-row items-start justify-between gap-3 rounded-xl border px-3 py-2">
      <div className="flex flex-row items-start gap-3">
        <div className="text-secondary-foreground mt-1">
          {type === "create" ? (
            <FileIcon />
          ) : type === "update" ? (
            <PencilEditIcon />
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
