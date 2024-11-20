"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useWindowSize } from "usehooks-ts";

import { UISuggestion } from "@/lib/editor/suggestions";

import { CrossIcon, MessageIcon } from "./icons";
import { Button } from "../ui/button";

export const Suggestion = ({
  suggestion,
  onApply,
}: {
  suggestion: UISuggestion;
  onApply: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { width: windowWidth } = useWindowSize();

  return (
    <AnimatePresence>
      {!isExpanded ? (
        <motion.div
          className="absolute -right-12 cursor-pointer p-1 text-muted-foreground md:-right-6"
          onClick={() => {
            setIsExpanded(true);
          }}
          whileHover={{ scale: 1.1 }}
        >
          <MessageIcon size={windowWidth && windowWidth < 768 ? 16 : 14} />
        </motion.div>
      ) : (
        <motion.div
          key={suggestion.id}
          className="absolute -right-14 z-50 flex w-64 flex-col gap-3 rounded-2xl border bg-background p-3 text-sm shadow-xl md:-right-6"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: -20 }}
          exit={{ opacity: 0, y: -10 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <div className="font-semibold">Assistant</div>
            </div>
            <div
              className="cursor-pointer text-xs text-secondary-foreground"
              onClick={() => {
                setIsExpanded(false);
              }}
            >
              <CrossIcon size={12} />
            </div>
          </div>
          <div className="border-l-2 border-secondary pl-2 italic text-secondary-foreground">
            {suggestion.suggestedText}
          </div>
          <div>{suggestion.description}</div>
          <Button
            variant="outline"
            className="w-fit rounded-full px-3 py-1.5"
            onClick={onApply}
          >
            Apply
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
