import { useRef, useState, useCallback } from "react";

export const useTextHighlight = () => {
  const streamingPositionRef = useRef<number | null>(null);
  const lastCompletionLengthRef = useRef<number>(0);
  const originalSelectionRef = useRef<{
    from: number;
    to: number;
    text: string;
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

  const resetStreamingState = useCallback(() => {
    streamingPositionRef.current = null;
    lastCompletionLengthRef.current = 0;
    originalSelectionRef.current = null;
    setStreamingPosition(null);
    setOriginalSelection(null);
    setLastCompletionLength(0);
  }, []);

  return {
    // State
    streamingPosition,
    setStreamingPosition,
    originalSelection,
    setOriginalSelection,
    lastCompletionLength,
    setLastCompletionLength,

    // Refs
    streamingPositionRef,
    lastCompletionLengthRef,
    originalSelectionRef,

    // Methods
    resetStreamingState,
  };
};
