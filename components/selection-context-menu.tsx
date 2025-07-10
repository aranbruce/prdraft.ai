"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WandIcon } from "@/components/icons";
import { MessageSquareText, Pen } from "lucide-react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(false);
  const [adjustmentRequest, setAdjustmentRequest] = useState("");

  // Calculate position relative to the parent container
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!editorContainer) return;

    const containerRect = editorContainer.getBoundingClientRect();
    const menuElement = menuRef.current;
    if (!menuElement) return;

    // Get the menu dimensions (we need to temporarily show it to measure)
    const menuRect = menuElement.getBoundingClientRect();
    const menuWidth = menuRect.width || 320; // fallback width
    const menuHeight = menuRect.height || 60; // fallback height

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
      x = containerWidth - menuWidth - 8; // 8px padding from edge
    }

    // Ensure minimum distance from left edge
    if (x < 8) {
      x = 8;
    }

    // Position below the selection with some padding
    y = y + 4; // Add some space below the selection

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
  }, [position, editorContainer, showInput]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Notify parent that input is no longer active if it was
        if (showInput) {
          onInputStateChange?.(false);
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, showInput, onInputStateChange]);

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

  const handleAdjustClick = (event: React.MouseEvent) => {
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
      className="selection-context-menu bg-background animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 border-accent absolute z-40 rounded-lg border p-1 shadow-lg transition-all duration-200 ease-out"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      onMouseDown={(e) => {
        // Prevent the container from affecting text selection
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {!showInput ? (
        <Button
          size="default"
          onClick={handleAdjustClick}
          variant="ghost"
          onMouseDown={(e) => {
            // Prevent mouse down from affecting text selection
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MessageSquareText size={14} />
          <span className="ml-1">Adjust</span>
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="relative w-full min-w-80">
          <Input
            ref={inputRef}
            value={adjustmentRequest}
            onChange={(e) => setAdjustmentRequest(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to adjust..."
            className="h-10 pr-20"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          />
          {adjustmentRequest.trim() && (
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="absolute top-1 right-1 h-8"
              onMouseDown={(e) => {
                e.preventDefault();
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
