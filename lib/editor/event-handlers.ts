import { EditorView } from "prosemirror-view";
import { Selection } from "prosemirror-state";
import { clearTextHighlight } from "./text-highlight";

interface EventHandlerDeps {
  isMobile: boolean;
  selectionMenu: any;
  containerRef: React.RefObject<HTMLDivElement>;
  editorRef: React.RefObject<EditorView | null>;
  showSelectionMenu: (view: EditorView) => void;
  handleCloseSelectionMenu: () => void;
  // Mobile-specific refs
  touchStartPositionRef: React.RefObject<{ x: number; y: number } | null>;
  isScrollingRef: React.RefObject<boolean>;
  touchTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  lastTouchTimeRef: React.RefObject<number>;
  startSelectionMonitoring: (view: EditorView) => void;
  stopSelectionMonitoring: () => void;
  checkSelectionAtIntervals: (currentTime: number, view: EditorView) => void;
  updateSelectionMenuPosition: () => void;
  scrollTimeoutRef: React.RefObject<NodeJS.Timeout | null>;
  lastTypingTimeRef: React.RefObject<number>;
}

export const createEventHandlers = (deps: EventHandlerDeps) => {
  const {
    isMobile,
    selectionMenu,
    containerRef,
    editorRef,
    showSelectionMenu,
    handleCloseSelectionMenu,
    touchStartPositionRef,
    isScrollingRef,
    touchTimeoutRef,
    lastTouchTimeRef,
    startSelectionMonitoring,
    stopSelectionMonitoring,
    checkSelectionAtIntervals,
    updateSelectionMenuPosition,
    scrollTimeoutRef,
    lastTypingTimeRef,
  } = deps;

  return {
    // Handle mouse events for desktop
    mouseup: (view: EditorView, event: MouseEvent) => {
      if (isMobile) return false;
      setTimeout(() => showSelectionMenu(view), 50);
      return false;
    },

    // Handle mouse down to clear existing selections when clicking elsewhere
    mousedown: (view: EditorView, event: MouseEvent) => {
      if (isMobile) return false;

      if (selectionMenu) {
        const target = event.target as HTMLElement;
        const editorContent =
          containerRef.current?.querySelector(".ProseMirror");

        if (editorContent && editorContent.contains(target)) {
          handleCloseSelectionMenu();
          setTimeout(() => {
            if (editorRef.current) {
              clearTextHighlight(editorRef.current);
            }
          }, 10);
        }
      }
      return false;
    },

    // Handle touch start for mobile
    touchstart: (view: EditorView, event: TouchEvent) => {
      if (!isMobile) return false;

      const touch = event.touches[0];
      touchStartPositionRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
      isScrollingRef.current = false;

      const target = event.target as HTMLElement;
      const editorContent = containerRef.current?.querySelector(".ProseMirror");

      if (editorContent && editorContent.contains(target)) {
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
        stopSelectionMonitoring();
        startSelectionMonitoring(view);
      }

      return false;
    },

    // Handle touch move to detect scrolling
    touchmove: (view: EditorView, event: TouchEvent) => {
      if (!isMobile || !touchStartPositionRef.current) return false;

      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);

      if (deltaX > 10 || deltaY > 10) {
        isScrollingRef.current = true;
      }

      return false;
    },

    // Handle touch end for mobile
    touchend: (view: EditorView, event: TouchEvent) => {
      if (!isMobile) return false;

      const currentTime = Date.now();
      lastTouchTimeRef.current = currentTime;

      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }

      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        touchStartPositionRef.current = null;
        return false;
      }

      const target = event.target as HTMLElement;
      const editorContent = containerRef.current?.querySelector(".ProseMirror");

      if (editorContent && editorContent.contains(target) && selectionMenu) {
        handleCloseSelectionMenu();

        setTimeout(() => {
          if (editorRef.current) {
            const { state } = editorRef.current;
            clearTextHighlight(editorRef.current);

            const transaction = state.tr.setSelection(
              Selection.near(state.doc.resolve(state.selection.from)),
            );
            transaction.setMeta("no-save", true);
            transaction.setMeta("no-debounce", true);
            editorRef.current.dispatch(transaction);
          }
        }, 50);
      }

      checkSelectionAtIntervals(currentTime, view);

      touchStartPositionRef.current = null;
      isScrollingRef.current = false;

      return false;
    },

    // Handle keyboard events
    keydown: (view: EditorView, event: KeyboardEvent) => {
      const typingKeys = [
        "Shift",
        "Control",
        "Meta",
        "Alt",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
        "Tab",
        "Escape",
      ];

      if (!typingKeys.includes(event.key)) {
        lastTypingTimeRef.current = Date.now();
      }

      if (
        selectionMenu &&
        !["Shift", "Control", "Meta", "Alt"].includes(event.key)
      ) {
        handleCloseSelectionMenu();

        setTimeout(() => {
          if (editorRef.current) {
            clearTextHighlight(editorRef.current);
          }
        }, 10);
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

    keyup: (view: EditorView, event: KeyboardEvent) => {
      if (isMobile) return false;
      setTimeout(() => showSelectionMenu(view), 50);
      return false;
    },

    // Handle scroll events
    scroll: (view: EditorView, event: Event) => {
      if (!selectionMenu) return false;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        updateSelectionMenuPosition();
      }, 50);

      return false;
    },

    // Additional mobile events
    selectionchange: (view: EditorView, event: Event) => {
      if (!isMobile) return false;
      setTimeout(() => showSelectionMenu(view), 150);
      return false;
    },
  };
};
