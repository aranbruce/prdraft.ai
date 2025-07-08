"use client";

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { buildDocumentFromContent } from "@/lib/editor/functions";

type ProseMirrorPreviewProps = {
  content: string;
  className?: string;
};

export function ProseMirrorPreview({
  content,
  className,
}: ProseMirrorPreviewProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [], // No plugins needed for read-only view
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
        editable: () => false, // Make it read-only
        attributes: {
          class: cn(
            "text-sm", // Ensure text-sm is applied
            "border-0 p-0 bg-transparent focus:outline-none focus:ring-0", // Remove default ProseMirror styling
            className,
          ),
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && content) {
      const newDocument = buildDocumentFromContent(content);
      const transaction = editorRef.current.state.tr.replaceWith(
        0,
        editorRef.current.state.doc.content.size,
        newDocument.content,
      );
      editorRef.current.dispatch(transaction);
    }
  }, [content]);

  return (
    <span
      ref={containerRef}
      className={cn(
        "prosemirror-preview text-muted-foreground line-clamp-3 text-sm",
        className,
      )}
    />
  );
}
