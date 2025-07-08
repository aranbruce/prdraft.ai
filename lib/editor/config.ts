import { textblockTypeInputRule, InputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { MutableRefObject } from "react";

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
