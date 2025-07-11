"use client";

import { exampleSetup } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { Plugin, PluginKey } from "prosemirror-state";
import { EditorState, Selection, TextSelection } from "prosemirror-state";
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
  ListOperationManager,
} from "@/lib/editor/config";
import {
  buildContentFromDocument,
  buildDocumentFromContent,
} from "@/lib/editor/functions";
import { SelectionContextMenu } from "@/components/selection-context-menu";
import { useCompletion } from "@ai-sdk/react";
import { useIsMobile } from "@/hooks/use-mobile";

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
        // This is important for keeping highlights stable during scroll and other operations
        try {
          return decorationSet.map(tr.mapping, tr.doc);
        } catch (error) {
          // If mapping fails, return empty set to avoid errors
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
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const streamingPositionRef = useRef<number | null>(null);
  const lastCompletionLengthRef = useRef<number>(0);
  const originalSelectionRef = useRef<{
    from: number;
    to: number;
    text: string;
  } | null>(null);

  // Touch handling state for mobile
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const selectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectionRef = useRef<string>("");
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  
  // Create a list operation manager instance for this editor
  const listOperationManagerRef = useRef<ListOperationManager>(new ListOperationManager());

  // Track recent typing activity to prevent content updates during active editing
  const lastTypingTimeRef = useRef<number>(0);

  // Helper function to check if user was recently typing
  const wasRecentlyTyping = () => {
    return Date.now() - lastTypingTimeRef.current < 1000; // 1 second threshold
  };

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
  const [isSelectionActive, setIsSelectionActive] = useState(false);

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
    setIsSelectionActive(false);
    setSelectionMenu(null);
  };

  // Helper function to show selection menu for both desktop and mobile
  const showSelectionMenu = (view: EditorView) => {
    const selection = view.state.selection;

    if (!selection.empty) {
      const selectedText = view.state.doc.textBetween(
        selection.from,
        selection.to,
        " ",
      );

      if (selectedText.trim().length > 0) {
        setIsSelectionActive(true);

        const coords = view.coordsAtPos(selection.from);
        const endCoords = view.coordsAtPos(selection.to);

        // For mobile, add extra spacing to avoid overlap with selection handles
        const mobileOffset = isMobile ? 30 : 10;
        const selectionCenterX = (coords.left + endCoords.right) / 2;
        const selectionBottom = Math.max(coords.bottom, endCoords.bottom);

        setSelectionMenu({
          selectedText: selectedText.trim(),
          position: {
            x: selectionCenterX,
            y: selectionBottom + mobileOffset,
          },
          selectionRange: {
            from: selection.from,
            to: selection.to,
          },
          inputActive: false,
        });

        // Apply subtle highlighting to show the selected text
        applyTextHighlight(view, selection.from, selection.to, false);
      }
    } else {
      setIsSelectionActive(false);
      setSelectionMenu(null);
    }
  };

  // Mobile-specific function to continuously check for text selection
  const startSelectionMonitoring = (view: EditorView) => {
    if (!isMobile) return;

    // Clear any existing monitoring
    if (selectionCheckIntervalRef.current) {
      clearInterval(selectionCheckIntervalRef.current);
    }

    // Check for text selection every 100ms while touch is active
    selectionCheckIntervalRef.current = setInterval(() => {
      const selection = view.state.selection;
      if (!selection.empty) {
        const selectedText = view.state.doc.textBetween(
          selection.from,
          selection.to,
          " ",
        );

        const trimmedText = selectedText.trim();

        // Only show menu if we have meaningful text selection and it's different from last check
        if (
          trimmedText.length > 0 &&
          trimmedText !== lastSelectionRef.current
        ) {
          lastSelectionRef.current = trimmedText;

          // Clear the interval once we detect selection
          if (selectionCheckIntervalRef.current) {
            clearInterval(selectionCheckIntervalRef.current);
            selectionCheckIntervalRef.current = null;
          }

          // Small delay to ensure selection is stable
          setTimeout(() => {
            showSelectionMenu(view);
          }, 100);
        }
      }
    }, 100);

    // Clear monitoring after 3 seconds if no selection is made
    setTimeout(() => {
      if (selectionCheckIntervalRef.current) {
        clearInterval(selectionCheckIntervalRef.current);
        selectionCheckIntervalRef.current = null;
      }
    }, 3000);
  };

  const stopSelectionMonitoring = () => {
    if (selectionCheckIntervalRef.current) {
      clearInterval(selectionCheckIntervalRef.current);
      selectionCheckIntervalRef.current = null;
    }
    lastSelectionRef.current = "";
  };

  // Function to update selection menu position after scroll
  const updateSelectionMenuPosition = () => {
    if (!selectionMenu || !editorRef.current || !containerRef.current) return;

    const { from, to } = selectionMenu.selectionRange;
    const view = editorRef.current;

    try {
      // Get fresh coordinates from ProseMirror after scroll
      const coords = view.coordsAtPos(from);
      const endCoords = view.coordsAtPos(to);

      // These coordinates are relative to the viewport, which is what we want
      const mobileOffset = isMobile ? 30 : 10;
      const selectionCenterX = (coords.left + endCoords.right) / 2;
      const selectionBottom = Math.max(coords.bottom, endCoords.bottom);

      // Update the menu with new position coordinates
      setSelectionMenu({
        ...selectionMenu,
        position: {
          x: selectionCenterX,
          y: selectionBottom + mobileOffset,
        },
      });

      // Reapply text highlighting immediately to ensure it stays visible during scroll
      if (selectionMenu.inputActive) {
        applyTextHighlight(view, from, to, true);
      } else {
        applyTextHighlight(view, from, to, false);
      }
    } catch (error) {
      // If we can't get coordinates (text scrolled out of view), hide the menu
      console.debug("Failed to update selection menu position:", error);
      handleCloseSelectionMenu();
    }
  };

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: buildDocumentFromContent(content),
        plugins: [
          headingKeymapPlugin(), // Add keyboard shortcuts FIRST for higher priority
          listKeymapPlugin(listOperationManagerRef.current), // Handle Tab/Shift+Tab for list indentation
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
          // Handle mouse events for desktop
          mouseup: (view, event) => {
            // Skip if this is a touch device to prevent duplicate events
            if (isMobile) return false;

            // Small delay to ensure selection is finalized
            setTimeout(() => {
              showSelectionMenu(view);
            }, 50);
            return false;
          },

          // Handle touch events for mobile - start monitoring on touch start
          touchstart: (view, event) => {
            if (!isMobile) return false;

            // Record initial touch position for scroll detection
            const touch = event.touches[0];
            touchStartPositionRef.current = {
              x: touch.clientX,
              y: touch.clientY,
            };
            isScrollingRef.current = false;

            // Only clear selection menu if touch is directly on the editor content
            // Don't clear if user is scrolling or touching outside the editor
            const target = event.target as HTMLElement;
            const editorContent =
              containerRef.current?.querySelector(".ProseMirror");

            // Check if the touch is on the editor content itself
            if (editorContent && editorContent.contains(target)) {
              // Don't immediately clear - wait to see if it's a scroll gesture

              // Clear any pending timeouts and monitoring
              if (touchTimeoutRef.current) {
                clearTimeout(touchTimeoutRef.current);
                touchTimeoutRef.current = null;
              }
              stopSelectionMonitoring();

              // Start monitoring for text selection
              startSelectionMonitoring(view);
            }
            // If touch is outside editor content (like scrollbars), don't interfere

            return false;
          },

          // Handle touch move to detect scrolling
          touchmove: (view, event) => {
            if (!isMobile || !touchStartPositionRef.current) return false;

            const touch = event.touches[0];
            const deltaX = Math.abs(
              touch.clientX - touchStartPositionRef.current.x,
            );
            const deltaY = Math.abs(
              touch.clientY - touchStartPositionRef.current.y,
            );

            // If significant movement, consider it scrolling
            if (deltaX > 10 || deltaY > 10) {
              isScrollingRef.current = true;
            }

            return false;
          },

          // Handle touch end for mobile
          touchend: (view, event) => {
            if (!isMobile) return false;

            // Record touch time
            const currentTime = Date.now();
            lastTouchTimeRef.current = currentTime;

            // Clear any existing timeout
            if (touchTimeoutRef.current) {
              clearTimeout(touchTimeoutRef.current);
            }

            // If this was a scroll gesture, don't close the selection menu
            if (isScrollingRef.current) {
              isScrollingRef.current = false;
              touchStartPositionRef.current = null;
              return false;
            }

            // Check if we should close the selection menu (only for taps on editor content)
            const target = event.target as HTMLElement;
            const editorContent =
              containerRef.current?.querySelector(".ProseMirror");

            if (
              editorContent &&
              editorContent.contains(target) &&
              selectionMenu
            ) {
              // This was a tap on editor content, close the existing menu
              handleCloseSelectionMenu();
            }

            // Check for selection after touch ends with multiple timeouts for reliability
            const checkSelectionAtIntervals = () => {
              // First check after 200ms
              setTimeout(() => {
                if (lastTouchTimeRef.current === currentTime) {
                  showSelectionMenu(view);
                }
              }, 200);

              // Second check after 500ms for slower devices
              setTimeout(() => {
                if (lastTouchTimeRef.current === currentTime) {
                  const selection = view.state.selection;
                  if (!selection.empty) {
                    showSelectionMenu(view);
                  }
                }
              }, 500);

              // Final check after 800ms
              setTimeout(() => {
                if (lastTouchTimeRef.current === currentTime) {
                  const selection = view.state.selection;
                  if (!selection.empty) {
                    showSelectionMenu(view);
                  }
                  // Stop monitoring after final check
                  stopSelectionMonitoring();
                }
              }, 800);
            };

            checkSelectionAtIntervals();

            // Reset touch tracking
            touchStartPositionRef.current = null;
            isScrollingRef.current = false;

            return false;
          },

          // Additional event listener for selection changes (works on some mobile browsers)
          selectionchange: (view, event) => {
            if (!isMobile) return false;

            // Small delay to ensure selection is finalized
            setTimeout(() => {
              showSelectionMenu(view);
            }, 150);
            return false;
          },

          // Handle selection changes via keyboard (still needed for desktop)
          keyup: (view, event) => {
            if (isMobile) return false; // Skip on mobile

            setTimeout(() => {
              showSelectionMenu(view);
            }, 50);
            return false;
          },

          keydown: (view, event) => {
            // Track typing activity for content update prevention
            // Only track actual typing keys, not modifier or navigation keys
            if (!["Shift", "Control", "Meta", "Alt", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Tab", "Escape"].includes(event.key)) {
              lastTypingTimeRef.current = Date.now();
            }

            // Hide context menu on most keyboard interactions
            if (
              selectionMenu &&
              !["Shift", "Control", "Meta", "Alt"].includes(event.key)
            ) {
              handleCloseSelectionMenu();
            }

            // Show context menu on Ctrl+Shift+A (or Cmd+Shift+A on Mac) - desktop only
            if (
              !isMobile &&
              (event.ctrlKey || event.metaKey) &&
              event.shiftKey &&
              event.key === "A"
            ) {
              event.preventDefault();
              showSelectionMenu(view);
              return true;
            }

            return false;
          },

          // Handle scroll events to update menu position
          scroll: (view, event) => {
            if (!selectionMenu) return false;

            // Clear any existing scroll timeout
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }

            // Debounce scroll updates with faster response for highlighting
            scrollTimeoutRef.current = setTimeout(() => {
              updateSelectionMenuPosition();
            }, 50); // Faster response to maintain highlighting during scroll

            return false;
          },
        },
      });
    }

    return () => {
      // Clean up touch timeout and selection monitoring
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      stopSelectionMonitoring();

      // Clean up list operation manager
      listOperationManagerRef.current.cleanup();

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
          // Track typing activity when document changes occur from user input
          if (transaction.docChanged && !transaction.getMeta("no-save") && !transaction.getMeta("ai-completion")) {
            lastTypingTimeRef.current = Date.now();
          }
          
          handleTransaction({ 
            transaction, 
            editorRef, 
            saveContent, 
            listOperationManager: listOperationManagerRef.current 
          });
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

      // Don't update editor content if there was a recent list operation or recent typing
      // This prevents saved content from overriding user's active editing
      if (hasListOperationsPending(listOperationManagerRef.current) || wasRecentlyTyping()) {
        return;
      }

      if (currentContent !== content) {
        const newDocument = buildDocumentFromContent(content);

        // Store the current selection before replacing content
        const currentSelection = editorRef.current.state.selection;
        
        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        // Attempt to restore selection position if possible
        try {
          // Only restore if the new document is large enough to contain the selection
          const newDocSize = newDocument.content.size;
          const fromPos = Math.min(currentSelection.from, newDocSize);
          const toPos = Math.min(currentSelection.to, newDocSize);
          
          if (fromPos >= 0 && toPos >= 0 && fromPos <= newDocSize && toPos <= newDocSize) {
            // Create a new selection at the same positions
            if (fromPos === toPos) {
              // Cursor selection
              const newSelection = Selection.near(newDocument.resolve(fromPos));
              transaction.setSelection(newSelection);
            } else {
              // Range selection
              try {
                const newSelection = TextSelection.create(newDocument, fromPos, toPos);
                transaction.setSelection(newSelection);
              } catch {
                // Fall back to cursor at start position
                const newSelection = Selection.near(newDocument.resolve(fromPos));
                transaction.setSelection(newSelection);
              }
            }
          }
        } catch (error) {
          // If selection restoration fails, let ProseMirror handle it automatically
          console.debug("Selection restoration failed:", error);
        }

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

  // Add global selection change listener for better mobile support
  useEffect(() => {
    if (!isMobile) return;

    const handleGlobalSelectionChange = () => {
      // Only proceed if we have an active editor
      if (!editorRef.current) return;

      // Get the browser's native selection
      const browserSelection = window.getSelection();
      if (!browserSelection || browserSelection.rangeCount === 0) return;

      const range = browserSelection.getRangeAt(0);
      if (range.collapsed) return; // No text selected

      // Check if the selection is within our editor
      const editorElement = containerRef.current;
      if (
        !editorElement ||
        !editorElement.contains(range.commonAncestorContainer)
      )
        return;

      // Get selected text
      const selectedText = browserSelection.toString().trim();
      if (selectedText.length === 0) return;

      // Convert browser selection to ProseMirror positions
      try {
        const view = editorRef.current;
        const startPos = view.posAtDOM(range.startContainer, range.startOffset);
        const endPos = view.posAtDOM(range.endContainer, range.endOffset);

        if (startPos >= 0 && endPos >= 0 && startPos !== endPos) {
          // Create a small delay to avoid conflicts with touch events
          setTimeout(() => {
            const coords = view.coordsAtPos(startPos);
            const endCoords = view.coordsAtPos(endPos);

            const mobileOffset = 30;
            const selectionCenterX = (coords.left + endCoords.right) / 2;
            const selectionBottom = Math.max(coords.bottom, endCoords.bottom);

            setIsSelectionActive(true);

            setSelectionMenu({
              selectedText: selectedText,
              position: {
                x: selectionCenterX,
                y: selectionBottom + mobileOffset,
              },
              selectionRange: {
                from: startPos,
                to: endPos,
              },
              inputActive: false,
            });
          }, 100);
        }
      } catch (error) {
        // Silently ignore errors in position conversion
        console.debug("Selection position conversion failed:", error);
      }
    };

    // Add the listener
    document.addEventListener("selectionchange", handleGlobalSelectionChange);

    return () => {
      document.removeEventListener(
        "selectionchange",
        handleGlobalSelectionChange,
      );
    };
  }, [isMobile]);

  // Add scroll listener to handle menu position updates when scrolling
  useEffect(() => {
    if (!selectionMenu) return;

    const handleGlobalScroll = () => {
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll updates with faster response for highlighting
      scrollTimeoutRef.current = setTimeout(() => {
        updateSelectionMenuPosition();
      }, 50); // Faster response to maintain highlighting during scroll
    };

    // Listen for scroll events on window and document
    window.addEventListener("scroll", handleGlobalScroll, { passive: true });
    document.addEventListener("scroll", handleGlobalScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleGlobalScroll);
      document.removeEventListener("scroll", handleGlobalScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [selectionMenu]);

  // Add resize listener to handle orientation changes and viewport changes
  useEffect(() => {
    if (!selectionMenu) return;

    const handleResize = () => {
      // Update menu position after resize/orientation change
      setTimeout(() => {
        updateSelectionMenuPosition();
      }, 100); // Small delay to let the layout settle
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [selectionMenu]);

  return (
    <div className="relative">
      {/* Debug indicator for mobile selection (only show on mobile) */}
      {isMobile && isSelectionActive && !selectionMenu && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-500 px-3 py-2 text-sm text-white shadow-lg">
          Text Selected - Menu Loading...
        </div>
      )}

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
          className={`absolute z-50 rounded-lg border border-blue-200 bg-white shadow-xl transition-all duration-200 ${
            isMobile ? "max-w-80" : "max-w-md"
          }`}
          style={{
            left: Math.min(
              selectionMenu.position.x,
              isMobile ? window.innerWidth - 320 : window.innerWidth - 384,
            ),
            top: selectionMenu.position.y + (isMobile ? 50 : 40),
          }}
        >
          <div
            className={`rounded-t-lg border-b border-blue-100 bg-blue-50 ${isMobile ? "px-3 py-2.5" : "px-4 py-2"}`}
          >
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
              <span
                className={`font-medium text-blue-700 ${isMobile ? "text-sm" : "text-xs"}`}
              >
                {LOADING_UI_TEXT}
              </span>
              {cleanedCompletion && (
                <span
                  className={`text-blue-500 ${isMobile ? "text-sm" : "text-xs"}`}
                >
                  ({cleanedCompletion.length} chars)
                </span>
              )}
            </div>
          </div>
          <div className={isMobile ? "p-3" : "p-4"}>
            {cleanedCompletion ? (
              <div className="relative">
                <div
                  className={`leading-relaxed whitespace-pre-wrap text-gray-800 ${isMobile ? "text-sm" : "text-sm"}`}
                >
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
                <span
                  className={`text-gray-500 ${isMobile ? "text-sm" : "text-sm"}`}
                >
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
