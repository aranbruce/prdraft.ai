"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquareText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SelectionContextMenuProps {
  selectedText: string;
  position: { x: number; y: number };
  selectionRange: { from: number; to: number };
  onRequestAdjustment: (
    selectedText: string,
    adjustmentRequest: string,
  ) => void;
  onClose: () => void;
  onInputStateChange?: (inputActive: boolean) => void;
  editorContainer?: HTMLDivElement | null;
}

export function SelectionContextMenu({
  selectedText,
  position,
  selectionRange,
  onRequestAdjustment,
  onClose,
  onInputStateChange,
  editorContainer,
}: SelectionContextMenuProps) {
  const isMobile = useIsMobile();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(false);
  const [adjustmentRequest, setAdjustmentRequest] = useState("");

  // Calculate position relative to the parent container
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!editorContainer) {
      // If no editor container, use position as-is
      setAdjustedPosition(position);
      return;
    }

    const containerRect = editorContainer.getBoundingClientRect();
    const menuElement = menuRef.current;
    if (!menuElement) {
      setAdjustedPosition(position);
      return;
    }

    // Get the menu dimensions
    const menuRect = menuElement.getBoundingClientRect();
    const menuWidth = menuRect.width || (isMobile ? 288 : 320);
    const menuHeight = menuRect.height || (isMobile ? 60 : 50);

    // Convert viewport coordinates to container-relative coordinates
    let x = position.x - containerRect.left;
    let y = position.y - containerRect.top;

    // Center the menu horizontally beneath the selection
    x = x - menuWidth / 2;

    // Ensure the menu stays within the container bounds
    const containerWidth = editorContainer.offsetWidth;
    const containerHeight = editorContainer.offsetHeight;

    // Adjust X position if menu would overflow right edge
    if (x + menuWidth > containerWidth) {
      x = containerWidth - menuWidth - 8;
    }

    // Ensure minimum distance from left edge
    if (x < 8) {
      x = 8;
    }

    // Position below the selection with some padding
    y = y + 4;

    // Adjust Y position if menu would overflow bottom edge
    if (y + menuHeight > containerHeight) {
      // Position above the selection instead
      y = position.y - containerRect.top - menuHeight - 8;
    }

    // Ensure minimum distance from top edge
    if (y < 8) {
      y = 8;
    }

    setAdjustedPosition({ x, y });
  }, [position, editorContainer, showInput, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // For touch events, check if it's a scroll gesture or intentional tap
        if (event.type === "touchstart") {
          const touchEvent = event as TouchEvent;
          // If multiple touches (like pinch/zoom) or if it's on the editor container,
          // it might be scrolling - don't close the menu immediately
          if (touchEvent.touches.length > 1) {
            return; // Multi-touch gesture, likely zoom/scroll
          }

          // Check if touch target is part of the editor container
          const editorElement = editorContainer;
          if (editorElement && editorElement.contains(event.target as Node)) {
            // Touch is in editor area, might be scrolling - add a delay before closing
            setTimeout(() => {
              // Check if selection is still active after delay
              const currentSelection = window.getSelection();
              if (
                !currentSelection ||
                currentSelection.toString().trim().length === 0
              ) {
                // No selection anymore, safe to close
                if (showInput) {
                  onInputStateChange?.(false);
                }
                onClose();
              }
            }, 150);
            return;
          }
        }

        // For mouse events or touches outside editor, close immediately
        if (showInput) {
          onInputStateChange?.(false);
        }
        onClose();
      }
    };

    // Add both mouse and touch event listeners for better mobile support
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose, showInput, onInputStateChange, editorContainer]);

  // Focus the input when it becomes visible
  useEffect(() => {
    if (showInput && inputRef.current) {
      // Use setTimeout to ensure the input is rendered before focusing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [showInput]);

  const handleAdjustClick = (event: React.MouseEvent | React.TouchEvent) => {
    // Prevent the click from affecting text selection
    event.preventDefault();
    event.stopPropagation();

    // Show the input instead of immediately calling the API
    setShowInput(true);

    // Notify parent that input is now active
    onInputStateChange?.(true);
  };

  const handleSubmit = (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!adjustmentRequest.trim()) {
      return;
    }

    // Notify parent that input is no longer active
    onInputStateChange?.(false);

    onRequestAdjustment(selectedText, adjustmentRequest.trim());
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      handleSubmit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      // Notify parent that input is no longer active
      onInputStateChange?.(false);

      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className={`selection-context-menu bg-background animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 border-accent absolute z-40 rounded-lg border shadow-lg transition-all duration-200 ease-out ${
        isMobile ? "p-2" : "p-1"
      }`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onMouseDown={(e) => {
        // Prevent the container from affecting text selection
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        // Prevent touch events from affecting text selection
        e.stopPropagation();
      }}
    >
      {!showInput ? (
        <Button
          size={isMobile ? "lg" : "default"}
          onClick={handleAdjustClick}
          variant="ghost"
          className={isMobile ? "h-12 px-4 text-base" : ""}
          onMouseDown={(e) => {
            // Prevent mouse down from affecting text selection
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            // Prevent touch start from affecting text selection
            e.stopPropagation();
          }}
        >
          <MessageSquareText size={isMobile ? 18 : 14} />
          <span className="ml-2">Adjust</span>
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={`relative w-full ${isMobile ? "min-w-72" : "min-w-80"}`}
        >
          <Input
            ref={inputRef}
            value={adjustmentRequest}
            onChange={(e) => setAdjustmentRequest(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to adjust..."
            className={isMobile ? "h-12 pr-20 text-base" : "h-10 pr-20"}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
          />
          {adjustmentRequest.trim() && (
            <Button
              type="submit"
              variant="default"
              size="sm"
              className={`absolute ${isMobile ? "top-1.5 right-1.5 h-9" : "top-1 right-1 h-8"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
            >
              Apply
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
