import { textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { MutableRefObject } from "react";
import { Plugin } from "prosemirror-state";

import { buildContentFromDocument } from "./functions";

export const documentSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
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

    if (transaction.getMeta("no-debounce")) {
      saveContent(updatedContent, false);
    } else {
      saveContent(updatedContent, true);
    }
  }
};
