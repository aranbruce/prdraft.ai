import { textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import {
  addListNodes,
  sinkListItem,
  liftListItem,
} from "prosemirror-schema-list";
import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { MutableRefObject } from "react";
import { Plugin } from "prosemirror-state";

import { buildContentFromDocument } from "./functions";

// Constants for loading text
const LOADING_TEXT = "✨ Adjusting text";

// Custom loading node specification
const loadingNodeSpec = {
  group: "inline",
  inline: true,
  atom: true,
  attrs: {
    text: { default: LOADING_TEXT },
  },
  toDOM: (node: any) =>
    [
      "span" as const,
      {
        class: "font-semibold animate-pulse",
        "data-loading": "true",
      },
      node.attrs.text,
    ] as const,
  parseDOM: [
    {
      tag: "span[data-loading]",
      getAttrs: (dom: any) => ({
        text: dom.textContent || LOADING_TEXT,
      }),
    },
  ],
};

export const documentSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block").append({
    loading_text: loadingNodeSpec,
  }),
  marks: schema.spec.marks,
});

export function headingRule(level: number) {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${level}})\\s$`),
    documentSchema.nodes.heading,
    () => ({ level }),
  );
}

// Simple markdown link rule - only converts [text](url) on space/enter
export function markdownLinkRule() {
  return new InputRule(
    /\[([^\]]+)\]\(([^)]+)\)(\s)$/,
    (state, match, start, end) => {
      const [fullMatch, text, href, space] = match;
      const { tr } = state;

      // Check if we're already inside a link mark to avoid conflicts
      const $start = state.doc.resolve(start);
      const linkMark = documentSchema.marks.link;
      if ($start.marks().some((mark) => mark.type === linkMark)) {
        return null;
      }

      if (text && href) {
        // Create the link and preserve the trailing space
        const linkNode = documentSchema.text(text, [
          documentSchema.marks.link.create({ href }),
        ]);
        const spaceNode = documentSchema.text(" ");

        tr.replaceWith(start, end, [linkNode, spaceNode]);
        return tr;
      }
      return null;
    },
  );
}

// Rule to convert heading to paragraph by typing "p " at the start
export function paragraphRule() {
  return new InputRule(/^p\s$/, (state, match, start, end) => {
    const { tr } = state;
    const $start = state.doc.resolve(start);

    // Only apply if we're in a heading
    if ($start.parent.type === documentSchema.nodes.heading) {
      tr.setBlockType(start, end, documentSchema.nodes.paragraph);
      tr.delete(start, end); // Remove the "p " text
      return tr;
    }
    return null;
  });
}

// Plugin to add keyboard shortcuts for heading conversion
export function headingKeymapPlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        // Check for heading shortcuts - support both Mac and PC combinations
        if (/^[0-6]$/.test(event.key)) {
          let shouldTrigger = false;

          // Check for any valid combination:
          // - Ctrl+Shift+Number (works reliably on Mac and PC)
          // - Meta+Shift+Number (Mac Cmd+Shift, alternative)
          shouldTrigger =
            (event.ctrlKey && event.shiftKey) ||
            (event.metaKey && event.shiftKey);

          if (shouldTrigger) {
            const { state, dispatch } = view;
            const { selection } = state;
            const level = parseInt(event.key);

            event.preventDefault();

            if (level === 0) {
              // Convert to paragraph
              const tr = state.tr.setBlockType(
                selection.from,
                selection.to,
                documentSchema.nodes.paragraph,
              );
              dispatch(tr);
            } else {
              // Convert to heading (levels 1-6)
              const tr = state.tr.setBlockType(
                selection.from,
                selection.to,
                documentSchema.nodes.heading,
                { level },
              );
              dispatch(tr);
            }
            return true; // Event handled
          }
        }

        return false; // Let other handlers process the event
      },
    },
  });
}

// Plugin to handle Tab and Shift+Tab for list indentation
export function listKeymapPlugin() {
  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.key === "Tab") {
          const { state, dispatch } = view;
          const { selection } = state;
          const { $from } = selection;

          // Check if we're inside a list item
          let inListItem = false;
          for (let i = 1; i <= $from.depth; i++) {
            if ($from.node(i).type === documentSchema.nodes.list_item) {
              inListItem = true;
              break;
            }
          }

          // Only handle Tab if we're in a list item
          if (inListItem) {
            event.preventDefault(); // Prevent default tab behavior

            // Record the time of this list operation
            lastListOperationTime = Date.now();

            if (event.shiftKey) {
              // Shift+Tab: Decrease indentation (lift list item)
              const command = liftListItem(documentSchema.nodes.list_item);
              const result = command(state, (tr) => {
                // Mark this transaction as a list operation to delay saving
                tr.setMeta("list-operation", true);
                tr.setMeta("no-save", true); // Prevent immediate save
                dispatch(tr);
              });
              return result;
            } else {
              // Tab: Increase indentation (sink list item)
              const command = sinkListItem(documentSchema.nodes.list_item);
              const result = command(state, (tr) => {
                // Mark this transaction as a list operation to delay saving
                tr.setMeta("list-operation", true);
                tr.setMeta("no-save", true); // Prevent immediate save
                dispatch(tr);
              });
              return result;
            }
          }
        }
        return false;
      },
    },
  });
}

// Debounced save for list operations
let listOperationSaveTimeout: NodeJS.Timeout | null = null;
let lastListOperationTime: number = 0;

// Function to check if list operations are pending
export function hasListOperationsPending(): boolean {
  return (
    listOperationSaveTimeout !== null ||
    Date.now() - lastListOperationTime < 1000
  );
}

export const handleTransaction = ({
  transaction,
  editorRef,
  saveContent,
}: {
  transaction: Transaction;
  editorRef: MutableRefObject<EditorView | null>;
  saveContent: (updatedContent: string, debounce: boolean) => void;
}) => {
  if (!editorRef || !editorRef.current) return;

  const newState = editorRef.current.state.apply(transaction);
  editorRef.current.updateState(newState);

  if (transaction.docChanged && !transaction.getMeta("no-save")) {
    const updatedContent = buildContentFromDocument(newState.doc);

    // Check if this is an AI completion
    const isAICompletion = transaction.getMeta("ai-completion");

    // Check if this is a list operation
    const isListOperation = transaction.getMeta("list-operation");

    // Always save AI completions immediately without debounce
    if (isAICompletion || transaction.getMeta("no-debounce")) {
      saveContent(updatedContent, false);
    } else if (isListOperation) {
      // For list operations, don't save immediately - wait for a pause
      if (listOperationSaveTimeout) {
        clearTimeout(listOperationSaveTimeout);
      }
      listOperationSaveTimeout = setTimeout(() => {
        if (editorRef.current) {
          const finalContent = buildContentFromDocument(
            editorRef.current.state.doc,
          );
          saveContent(finalContent, false);
        }
        listOperationSaveTimeout = null;
      }, 500); // Wait 500ms after last list operation
    } else {
      // For user edits, use debouncing but with shorter delay
      saveContent(updatedContent, true);
    }
  }

  // Handle delayed save for list operations marked with no-save
  if (
    transaction.docChanged &&
    transaction.getMeta("list-operation") &&
    transaction.getMeta("no-save")
  ) {
    if (listOperationSaveTimeout) {
      clearTimeout(listOperationSaveTimeout);
    }
    listOperationSaveTimeout = setTimeout(() => {
      if (editorRef.current) {
        const finalContent = buildContentFromDocument(
          editorRef.current.state.doc,
        );
        saveContent(finalContent, false);
      }
      listOperationSaveTimeout = null;
    }, 500); // Wait 500ms after last list operation before saving
  }
};
