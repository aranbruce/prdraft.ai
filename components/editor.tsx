"use client";

import { exampleSetup } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { Plugin, PluginKey } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import React, { memo, useEffect, useRef, useState } from "react";

import { Vote } from "@/lib/db/schema";
import {
  documentSchema,
  handleTransaction,
  headingKeymapPlugin,
  headingRule,
  listKeymapPlugin,
  hasListOperationsPending,
} from "@/lib/editor/config";
import {
  buildContentFromDocument,
  buildDocumentFromContent,
} from "@/lib/editor/functions";
import { SelectionContextMenu } from "@/components/selection-context-menu";
import { useCompletion } from "@ai-sdk/react";

// Constants for loading UI
const LOADING_UI_TEXT = "AI Adjusting Text";

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

// Plugin key for text highlighting
const textHighlightPluginKey = new PluginKey("textHighlight");

// Function to apply text highlight
const applyTextHighlight = (
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
const clearTextHighlight = (view: EditorView) => {
  const transaction = view.state.tr;
  transaction.setMeta(textHighlightPluginKey, null);
  view.dispatch(transaction);
};

// Plugin to handle text highlighting
const createTextHighlightPlugin = () => {
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

        // Map existing decorations through the transaction to maintain them
        // This is important for keeping loading animations stable
        return decorationSet.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return textHighlightPluginKey.getState(state);
      },
    },
  });
};

type EditorProps = {
  content: string;
  saveContent: (updatedContent: string, debounce: boolean) => void;
  status: "streaming" | "idle";
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  id?: string;
  documentId?: string;
  chatId?: string;
  modelId?: string;
};

function PureEditor({
  content,
  saveContent,
  status,
  id,
  documentId,
  chatId,
  modelId,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const streamingPositionRef = useRef<number | null>(null);
  const lastCompletionLengthRef = useRef<number>(0);
  const originalSelectionRef = useRef<{
    from: number;
    to: number;
    text: string;
  } | null>(null);

  const [selectionMenu, setSelectionMenu] = useState<{
    selectedText: string;
    position: { x: number; y: number };
    selectionRange: { from: number; to: number };
    inputActive: boolean;
  } | null>(null);
  const [streamingPosition, setStreamingPosition] = useState<number | null>(
    null,
  );
  const [originalSelection, setOriginalSelection] = useState<{
    from: number;
    to: number;
    text: string;
  } | null>(null);
  const [lastCompletionLength, setLastCompletionLength] = useState<number>(0);

  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/adjustment",

    onFinish: (prompt, completion) => {
      // Clean the completion text
      let cleaned = completion.trim();
      if (
        (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))
      ) {
        cleaned = cleaned.slice(1, -1);
      }

      // Finalize the completion by saving it and triggering a save
      if (
        editorRef.current &&
        streamingPositionRef.current !== null &&
        cleaned
      ) {
        const { state } = editorRef.current;
        const endPos =
          streamingPositionRef.current + lastCompletionLengthRef.current;

        // Replace with final cleaned text and trigger save
        const transaction = state.tr.replaceWith(
          streamingPositionRef.current,
          endPos,
          state.schema.text(cleaned),
        );
        // Explicitly set meta to ensure this transaction triggers a save
        transaction.setMeta("no-debounce", true); // Avoid debounce delay
        // Don't set "no-save" meta so this gets saved to the database
        editorRef.current.dispatch(transaction);

        // Reset streaming state after successful dispatch
        streamingPositionRef.current = null;
        lastCompletionLengthRef.current = 0;
        originalSelectionRef.current = null;
        setStreamingPosition(null);
        setOriginalSelection(null);
        setLastCompletionLength(0);
      }

      // Close the selection menu after adjustment is complete
      setSelectionMenu(null);
    },
    onError: (error) => {
      console.error("❌ Completion error:", error);
      setSelectionMenu(null);
    },
  });

  // Clean completion text by removing quotation marks and unwanted formatting
  const cleanedCompletion = React.useMemo(() => {
    if (!completion) return completion;

    // Remove surrounding quotation marks if they exist
    let cleaned = completion.trim();

    // Remove surrounding double quotes
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove surrounding single quotes
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove surrounding backticks
    if (cleaned.startsWith("`") && cleaned.endsWith("`")) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove common AI response prefixes
    const prefixesToRemove = [
      "Here is the adjusted text:",
      "Here's the adjusted text:",
      "Adjusted text:",
      "The adjusted text is:",
      "Here is the modified text:",
      "Here's the modified text:",
    ];

    for (const prefix of prefixesToRemove) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
        break;
      }
    }

    return cleaned;
  }, [completion]);

  // Clear highlight when loading starts and keep the original text with pulse animation
  React.useEffect(() => {
    if (
      isLoading &&
      editorRef.current &&
      originalSelection &&
      streamingPosition === null
    ) {
      clearTextHighlight(editorRef.current);

      // Keep the original text but apply pulse animation via decoration
      const { state } = editorRef.current;
      const { from, to, text } = originalSelection;

      // Apply pulse decoration to the original text
      const pulseDecoration = DecorationSet.create(state.doc, [
        Decoration.inline(from, to, {
          class:
            "animate-pulse bg-blue-200/60 border border-blue-300/40 rounded-sm px-1 py-0.5",
          style: "animation: pulse 1.5s ease-in-out infinite;",
        }),
      ]);

      const transaction = state.tr;
      transaction.setMeta(textHighlightPluginKey, {
        decorations: pulseDecoration,
      });
      transaction.setMeta("no-debounce", true);
      transaction.setMeta("no-save", true);
      editorRef.current.dispatch(transaction);

      // Set the streaming position to the start of the selection
      setStreamingPosition(from);
      streamingPositionRef.current = from;

      // Set the initial completion length to the original text length
      setLastCompletionLength(to - from);
      lastCompletionLengthRef.current = to - from;

      // Also store in ref
      originalSelectionRef.current = originalSelection;
    }
  }, [isLoading, originalSelection, streamingPosition]);

  // Stream new text into the cleared position
  React.useEffect(() => {
    // Insert streaming text at the cleared position using cleaned completion
    // Only start streaming when we have actual content (not just loading placeholder)
    if (
      cleanedCompletion &&
      cleanedCompletion.trim() &&
      editorRef.current &&
      streamingPosition !== null &&
      isLoading
    ) {
      const { state } = editorRef.current;

      // Clear the pulse decoration before replacing with new text
      clearTextHighlight(editorRef.current);

      // Replace the original text or previous completion with new text
      const endPos = streamingPosition + lastCompletionLength;

      const transaction = state.tr.replaceWith(
        streamingPosition,
        endPos,
        state.schema.text(cleanedCompletion.trim()),
      );
      transaction.setMeta("no-debounce", true);
      transaction.setMeta("no-save", true);
      editorRef.current.dispatch(transaction);

      // Update the last completion length for next iteration (both state and ref)
      setLastCompletionLength(cleanedCompletion.trim().length);
      lastCompletionLengthRef.current = cleanedCompletion.trim().length;
    }
  }, [cleanedCompletion, isLoading, streamingPosition]);

  // Handle input state changes for highlighting
  const handleInputStateChange = (inputActive: boolean) => {
    if (selectionMenu && editorRef.current) {
      const { from, to } = selectionMenu.selectionRange;

      if (inputActive) {
        // Apply highlight when input becomes active
        applyTextHighlight(editorRef.current, from, to, true);
      } else {
        // Clear highlight when input becomes inactive
        clearTextHighlight(editorRef.current);
      }

      // Update the selection menu state
      setSelectionMenu({
        ...selectionMenu,
        inputActive,
      });
    }
  };

  // Handle closing the selection menu
  const handleCloseSelectionMenu = () => {
    if (editorRef.current) {
      clearTextHighlight(editorRef.current);
    }
    setSelectionMenu(null);
  };

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          headingKeymapPlugin(), // Add keyboard shortcuts FIRST for higher priority
          listKeymapPlugin(), // Handle Tab/Shift+Tab for list indentation
          ...exampleSetup({ schema: documentSchema, menuBar: false }),
          inputRules({
            rules: [
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
            ],
          }),
          createTextHighlightPlugin(),
        ],
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
        handleDOMEvents: {
          mouseup: (view, event) => {
            // Small delay to ensure selection is finalized
            setTimeout(() => {
              const selection = view.state.selection;

              if (!selection.empty) {
                const selectedText = view.state.doc.textBetween(
                  selection.from,
                  selection.to,
                  " ",
                );

                if (selectedText.trim().length > 0) {
                  // Position button directly below the selection
                  const coords = view.coordsAtPos(selection.from);
                  const endCoords = view.coordsAtPos(selection.to);

                  // Keep coordinates as viewport-relative (ProseMirror's natural format)
                  // The context menu will handle container-relative positioning
                  const selectionCenterX = (coords.left + endCoords.right) / 2;
                  const selectionBottom = Math.max(
                    coords.bottom,
                    endCoords.bottom,
                  );

                  // Add a small delay to ensure DOM is stable
                  requestAnimationFrame(() => {
                    setSelectionMenu({
                      selectedText: selectedText.trim(),
                      position: {
                        x: selectionCenterX,
                        y: selectionBottom + 10,
                      },
                      selectionRange: {
                        from: selection.from,
                        to: selection.to,
                      },
                      inputActive: false,
                    });
                  });
                }
              } else {
                setSelectionMenu(null);
              }
            }, 50); // Reduced delay to minimize layout shift issues
            return false;
          },
          // Also trigger on selection change via keyboard
          keyup: (view, event) => {
            setTimeout(() => {
              const selection = view.state.selection;
              if (!selection.empty) {
                const selectedText = view.state.doc.textBetween(
                  selection.from,
                  selection.to,
                  " ",
                );

                if (selectedText.trim().length > 0) {
                  const coords = view.coordsAtPos(selection.from);
                  const endCoords = view.coordsAtPos(selection.to);

                  // Keep coordinates as viewport-relative
                  const selectionCenterX = (coords.left + endCoords.right) / 2;
                  const selectionBottom = Math.max(
                    coords.bottom,
                    endCoords.bottom,
                  );

                  setSelectionMenu({
                    selectedText: selectedText.trim(),
                    position: {
                      x: selectionCenterX,
                      y: selectionBottom + 10,
                    },
                    selectionRange: {
                      from: selection.from,
                      to: selection.to,
                    },
                    inputActive: false,
                  });
                }
              } else {
                setSelectionMenu(null);
              }
            }, 50);
            return false;
          },
          keydown: (view, event) => {
            // Hide context menu on most keyboard interactions
            if (
              selectionMenu &&
              !["Shift", "Control", "Meta", "Alt"].includes(event.key)
            ) {
              handleCloseSelectionMenu();
            }

            // Show context menu on Ctrl+Shift+A (or Cmd+Shift+A on Mac)
            if (
              (event.ctrlKey || event.metaKey) &&
              event.shiftKey &&
              event.key === "A"
            ) {
              event.preventDefault();
              const selection = view.state.selection;
              if (!selection.empty) {
                const selectedText = view.state.doc.textBetween(
                  selection.from,
                  selection.to,
                  " ",
                );

                if (selectedText.trim().length > 0) {
                  const coords = view.coordsAtPos(selection.from);
                  const endCoords = view.coordsAtPos(selection.to);

                  // Keep coordinates as viewport-relative
                  const selectionCenterX = (coords.left + endCoords.right) / 2;
                  const selectionBottom = Math.max(
                    coords.bottom,
                    endCoords.bottom,
                  );

                  setSelectionMenu({
                    selectedText: selectedText.trim(),
                    position: {
                      x: selectionCenterX,
                      y: selectionBottom + 10,
                    },
                    selectionRange: {
                      from: selection.from,
                      to: selection.to,
                    },
                    inputActive: false,
                  });
                }
              }
              return true;
            }

            return false;
          },
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({ transaction, editorRef, saveContent });
        },
      });
    }
  }, [saveContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = buildContentFromDocument(
        editorRef.current.state.doc,
      );

      if (status === "streaming") {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta("no-save", true);
        editorRef.current.dispatch(transaction);
        return;
      }

      // Don't update editor content if there was a recent list operation
      // This prevents saved content from overriding user's Tab operations
      if (hasListOperationsPending()) {
        return;
      }

      if (currentContent !== content) {
        const newDocument = buildDocumentFromContent(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta("no-save", true);
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  const handleRequestAdjustment = async (
    selectedText: string,
    adjustmentRequest: string,
  ) => {
    if (!documentId || !chatId || !modelId) {
      console.error("❌ Missing required props for text adjustment:", {
        documentId,
        chatId,
        modelId,
      });
      return;
    }

    // Store the original selection before it gets lost when we click the button
    if (selectionMenu) {
      setOriginalSelection({
        from: selectionMenu.selectionRange.from,
        to: selectionMenu.selectionRange.to,
        text: selectedText,
      });
    }

    try {
      // Create the prompt for text adjustment
      const prompt = `Please adjust the following text according to the user's request:

Original text: "${selectedText}"

User's adjustment request: "${adjustmentRequest}"

Please respond with only the adjusted text, no explanations or formatting.`;

      await complete(prompt, {
        body: {
          documentId,
          chatId,
          modelId,
        },
      });
    } catch (error) {
      console.error("💥 Failed to request adjustment:", error);
      // Close menu on error
      setSelectionMenu(null);
      setOriginalSelection(null);
    }
  };

  const handleCloseContextMenu = () => {
    handleCloseSelectionMenu();
  };

  return (
    <div className="relative">
      <div className="relative mx-auto" ref={containerRef} id={id} />
      {selectionMenu && !isLoading && (
        <>
          <SelectionContextMenu
            selectedText={selectionMenu.selectedText}
            position={selectionMenu.position}
            selectionRange={selectionMenu.selectionRange}
            onRequestAdjustment={handleRequestAdjustment}
            onClose={handleCloseContextMenu}
            onInputStateChange={handleInputStateChange}
            editorContainer={containerRef.current}
          />
        </>
      )}

      {/* Real-time streaming text overlay */}
      {isLoading && selectionMenu && (
        <div
          className="absolute z-50 max-w-md rounded-lg border border-blue-200 bg-white shadow-xl transition-all duration-200"
          style={{
            left: Math.min(selectionMenu.position.x, window.innerWidth - 320),
            top: selectionMenu.position.y + 40,
          }}
        >
          <div className="rounded-t-lg border-b border-blue-100 bg-blue-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500"></div>
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
              <span className="text-xs font-medium text-blue-700">
                {LOADING_UI_TEXT}
              </span>
              {cleanedCompletion && (
                <span className="text-xs text-blue-500">
                  ({cleanedCompletion.length} chars)
                </span>
              )}
            </div>
          </div>
          <div className="p-4">
            {cleanedCompletion ? (
              <div className="relative">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                  {cleanedCompletion}
                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-blue-500" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400"></div>
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">
                  Waiting for AI response...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) {
    return false;
  } else if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) {
    return false;
  } else if (prevProps.status !== nextProps.status) {
    return false;
  } else if (prevProps.content !== nextProps.content) {
    return false;
  } else if (prevProps.saveContent !== nextProps.saveContent) {
    return false;
  } else if (prevProps.documentId !== nextProps.documentId) {
    return false;
  } else if (prevProps.chatId !== nextProps.chatId) {
    return false;
  } else if (prevProps.modelId !== nextProps.modelId) {
    return false;
  } else if (prevProps.id !== nextProps.id) {
    return false;
  }

  return true;
}

export const Editor = memo(PureEditor, areEqual);
