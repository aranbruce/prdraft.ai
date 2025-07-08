import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import React from "react";
import { ProseMirrorPreview } from "./prosemirror-preview";

import Template from "./template-manager";

export interface Template {
  id: string;
  title: string | null;
  content: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string | null;
}

export interface TemplateCardProps {
  template: Template;
  onClick: (template: Template) => void;
  onDelete: (template: Template) => void;
}

export function TemplateCard({
  template,
  onClick,
  onDelete,
}: TemplateCardProps) {
  return (
    <Card className="flex flex-col justify-between transition-shadow hover:shadow-lg">
      <div
        className="flex-grow cursor-pointer"
        onClick={() => onClick(template)}
      >
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-md truncate">{template.title}</CardTitle>
          <CardDescription className="text-muted-foreground line-clamp-3">
            <ProseMirrorPreview
              content={template.content || ""}
              className="text-sm"
            />
          </CardDescription>
        </CardHeader>
      </div>
      <CardFooter className="flex justify-between border-t p-1 pr-2 pl-4">
        <CardDescription>
          Updated:{" "}
          {template.updatedAt
            ? new Date(template.updatedAt).toLocaleDateString()
            : "Unknown"}
        </CardDescription>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
