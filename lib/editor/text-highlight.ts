import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

// Plugin key for text highlighting
export const textHighlightPluginKey = new PluginKey("textHighlight");

// Function to create text highlight decorations (for selection highlighting only)
const createTextHighlightDecorations = (
  from: number,
  to: number,
  doc: any,
  active: boolean = false,
) => {
  const className = active
    ? "bg-blue-500/35 rounded-sm pb-1 transition-colors duration-200 ease-in-out"
    : "bg-blue-500/20 rounded-sm pb-1 transition-colors duration-200 ease-in-out";

  return DecorationSet.create(doc, [
    Decoration.inline(from, to, {
      class: className,
    }),
  ]);
};

// Function to apply text highlight
export const applyTextHighlight = (
  view: EditorView,
  from: number,
  to: number,
  active: boolean = false,
) => {
  const transaction = view.state.tr;
  const highlightRange = { from, to, active };
  transaction.setMeta(textHighlightPluginKey, highlightRange);
  view.dispatch(transaction);
};

// Function to clear text highlight
export const clearTextHighlight = (view: EditorView) => {
  const transaction = view.state.tr;
  transaction.setMeta(textHighlightPluginKey, null);
  view.dispatch(transaction);
};

// Plugin to handle text highlighting
export const createTextHighlightPlugin = () => {
  return new Plugin({
    key: textHighlightPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, decorationSet) {
        // Get highlight range from transaction meta
        const highlightRange = tr.getMeta(textHighlightPluginKey);

        if (highlightRange === null) {
          // Clear highlights
          return DecorationSet.empty;
        } else if (highlightRange) {
          // Handle pulse decorations (for loading state)
          if (highlightRange.decorations) {
            return highlightRange.decorations;
          }

          // Set new highlight - create fresh decoration set
          return createTextHighlightDecorations(
            highlightRange.from,
            highlightRange.to,
            tr.doc,
            highlightRange.active,
          );
        }

        // For transactions without highlight meta, only map decorations if they exist
        if (decorationSet === DecorationSet.empty) {
          return DecorationSet.empty;
        }

        // If this is a regular editing transaction, clear highlights to avoid persistence
        if (
          tr.docChanged &&
          !tr.getMeta("no-save") &&
          !tr.getMeta("ai-completion")
        ) {
          return DecorationSet.empty;
        }

        // Map existing decorations through the transaction to maintain them
        try {
          return decorationSet.map(tr.mapping, tr.doc);
        } catch (error) {
          console.debug("Failed to map decorations:", error);
          return DecorationSet.empty;
        }
      },
    },
    props: {
      decorations(state) {
        return textHighlightPluginKey.getState(state);
      },
    },
  });
};
