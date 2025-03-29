"use client";

import { ChatRequestOptions, CreateMessage, Message } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  JSX,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useOnClickOutside } from "usehooks-ts";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sanitizeUIMessages } from "@/lib/utils";

import {
  ArrowUpIcon,
  MessageIcon,
  PenIcon,
  StopIcon,
  CodeIcon,
  PaletteIcon,
  CrossIcon,
} from "./icons";
import { Button } from "./ui/button";

type ToolProps = {
  type:
    | "request-product-manager-suggestions"
    | "request-engineer-suggestions"
    | "request-designer-suggestions";
  description: string;
  icon: JSX.Element;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
};

const Tool = ({
  type,
  description,
  icon,
  selectedTool,
  setSelectedTool,
  isToolbarVisible,
  setIsToolbarVisible,
  isAnimating,
  append,
}: ToolProps) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (selectedTool !== type) {
      setIsHovered(false);
    }
  }, [selectedTool, type]);

  const handleSelect = () => {
    if (!isToolbarVisible && setIsToolbarVisible) {
      setIsToolbarVisible(true);
      return;
    }

    if (!selectedTool) {
      setIsHovered(true);
      setSelectedTool(type);
      return;
    }

    if (selectedTool !== type) {
      setSelectedTool(type);
    } else {
      if (type === "request-product-manager-suggestions") {
        append({
          role: "user",
          content:
            "Please add product manager related suggestions you have that could improve the writing.",
        });

        setSelectedTool(null);
      }
      if (type === "request-engineer-suggestions") {
        append({
          role: "user",
          content:
            "Please add engineering related suggestions you have that could improve the writing.",
        });
      } else if (type === "request-designer-suggestions") {
        append({
          role: "user",
          content:
            "Please add design related suggestions you have that could improve the writing.",
        });

        setSelectedTool(null);
      }
    }
  };

  return (
    <Tooltip open={isHovered && !isAnimating}>
      <TooltipTrigger asChild>
        <motion.div
          className={cx("rounded-lg p-3", {
            "bg-primary text-primary-foreground!": selectedTool === type,
          })}
          onHoverStart={() => {
            setIsHovered(true);
          }}
          onHoverEnd={() => {
            if (selectedTool !== type) setIsHovered(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSelect();
            }
          }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.1 } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          exit={{
            scale: 0.9,
            opacity: 0,
            transition: { duration: 0.1 },
          }}
          onClick={() => {
            handleSelect();
          }}
        >
          {selectedTool === type ? <ArrowUpIcon /> : icon}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={16}
        className="rounded-2xl bg-foreground p-3 px-4 text-background"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
};

export const Tools = ({
  isToolbarVisible,
  selectedTool,
  setSelectedTool,
  append,
  isAnimating,
  setIsToolbarVisible,
}: {
  isToolbarVisible: boolean;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  isAnimating: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <motion.div
      className="flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <AnimatePresence>
        {isToolbarVisible && (
          <>
            <Tool
              type="request-product-manager-suggestions"
              description="Request PM suggestions"
              icon={<MessageIcon />}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />
            <Tool
              type="request-engineer-suggestions"
              description="Request engineer suggestions"
              icon={<CodeIcon />}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />
            <Tool
              type="request-designer-suggestions"
              description="Request designer suggestions"
              icon={<PaletteIcon />}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
            />
          </>
        )}
      </AnimatePresence>
      <Button
        variant="ghost"
        className="hover:bg-transparent"
        onClick={() => {
          setIsToolbarVisible(!isToolbarVisible);
          setSelectedTool(null);
        }}
      >
        {isToolbarVisible ? <CrossIcon /> : <PenIcon />}
      </Button>
    </motion.div>
  );
};

export const Toolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  append,
  isLoading,
  stop,
  setMessages,
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null!);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useOnClickOutside(toolbarRef, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedTool(null);
      setIsToolbarVisible(false);
    }, 2000);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      setIsToolbarVisible(false);
    }
  }, [isLoading, setIsToolbarVisible]);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="fixed bottom-6 right-6 flex h-fit cursor-pointer flex-col justify-end rounded-xl border border-border bg-background text-secondary-foreground shadow-xl"
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={
          isToolbarVisible
            ? {
                opacity: 1,
                y: 0,
                height: 4 * 40 + 3 * 2,
                transition: { delay: 0 },
                scale: 1,
              }
            : { opacity: 1, y: 0, height: 42, transition: { delay: 0 } }
        }
        exit={{ opacity: 0, y: -20, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onHoverStart={() => {
          if (isLoading) return;

          cancelCloseTimer();
          setIsToolbarVisible(true);
        }}
        onHoverEnd={() => {
          if (isLoading) return;

          startCloseTimer();
        }}
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
        ref={toolbarRef}
      >
        {isLoading ? (
          <motion.div
            key="stop-icon"
            initial={{ scale: 1 }}
            animate={{ scale: 1.4 }}
            exit={{ scale: 1 }}
            className="p-3"
            onClick={() => {
              stop();
              setMessages((messages) => sanitizeUIMessages(messages));
            }}
          >
            <StopIcon />
          </motion.div>
        ) : (
          <Tools
            key="tools"
            append={append}
            isAnimating={isAnimating}
            isToolbarVisible={isToolbarVisible}
            selectedTool={selectedTool}
            setIsToolbarVisible={setIsToolbarVisible}
            setSelectedTool={setSelectedTool}
          />
        )}
      </motion.div>
    </TooltipProvider>
  );
};
