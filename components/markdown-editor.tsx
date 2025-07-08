"use client";
import clsx from "clsx";
import { exampleSetup } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import React, { useEffect, useRef, useCallback } from "react";

import {
  documentSchema,
  headingRule,
  markdownLinkRule,
} from "@/lib/editor/config";
import {
  buildContentFromDocument,
  buildDocumentFromContent,
} from "@/lib/editor/functions";

type SimpleMarkdownEditorProps = {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
};

export function MarkDownEditor({
  content,
  onChange,
  placeholder = "Start typing your markdown...",
  className = "",
  id,
}: SimpleMarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  const handleTransaction = useCallback(
    (transaction: any) => {
      if (!editorRef.current) return;

      const newState = editorRef.current.state.apply(transaction);
      editorRef.current.updateState(newState);

      if (transaction.docChanged) {
        const updatedContent = buildContentFromDocument(newState.doc);
        onChange?.(updatedContent);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          ...exampleSetup({
            schema: documentSchema,
            menuBar: false,
            floatingMenu: false,
          }),
          inputRules({
            rules: [
              // Heading rules
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
              // Simple markdown link rule
              markdownLinkRule(),
            ],
          }),
        ],
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
        dispatchTransaction: handleTransaction,
        attributes: {
          class: clsx(
            "prose prose-sm max-w-none border border-input p-2 rounded-md overflow-y-scroll ",
            className,
          ),
          "data-placeholder": placeholder,
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content when prop changes
  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc,
      );

      if (currentContent !== content) {
        const newDocument = buildDocumentFromContent(content);
        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content]);

  return <div className={`relative ${className}`} ref={containerRef} id={id} />;
}
