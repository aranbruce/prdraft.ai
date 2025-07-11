import { useRef, useState, useCallback } from "react";
import { EditorView } from "prosemirror-view";
import { applyTextHighlight } from "@/lib/editor/text-highlight";

export const useTextSelection = (isMobile: boolean) => {
  const [selectionMenu, setSelectionMenu] = useState<{
    selectedText: string;
    position: { x: number; y: number };
    selectionRange: { from: number; to: number };
    inputActive: boolean;
  } | null>(null);

  const [isSelectionActive, setIsSelectionActive] = useState(false);

  // Mobile-specific refs
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const selectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectionRef = useRef<string>("");
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  const showSelectionMenu = useCallback(
    (view: EditorView) => {
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

          // Apply highlighting
          applyTextHighlight(view, selection.from, selection.to, false);
        }
      } else {
        setIsSelectionActive(false);
        setSelectionMenu(null);
      }
    },
    [isMobile],
  );

  const closeSelectionMenu = useCallback(() => {
    setIsSelectionActive(false);
    setSelectionMenu(null);
  }, []);

  // Mobile-specific functions
  const startSelectionMonitoring = useCallback(
    (view: EditorView) => {
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
    },
    [isMobile, showSelectionMenu],
  );

  const stopSelectionMonitoring = useCallback(() => {
    if (selectionCheckIntervalRef.current) {
      clearInterval(selectionCheckIntervalRef.current);
      selectionCheckIntervalRef.current = null;
    }
    lastSelectionRef.current = "";
  }, []);

  const cleanup = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    if (selectionCheckIntervalRef.current) {
      clearInterval(selectionCheckIntervalRef.current);
    }
  }, []);

  return {
    selectionMenu,
    setSelectionMenu,
    isSelectionActive,
    setIsSelectionActive,
    showSelectionMenu,
    closeSelectionMenu,
    cleanup,
    // Mobile-specific refs and functions
    touchTimeoutRef,
    lastTouchTimeRef,
    selectionCheckIntervalRef,
    lastSelectionRef,
    touchStartPositionRef,
    isScrollingRef,
    startSelectionMonitoring,
    stopSelectionMonitoring,
  };
};
