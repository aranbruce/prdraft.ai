"use client";

import { isAfter } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useWindowSize } from "usehooks-ts";

import { Document } from "@/lib/db/schema";
import { getDocumentTimestampByIndex } from "@/lib/utils";

import { UIBlock } from "./block";
import { LoaderIcon } from "./icons";
import { Button } from "./ui/button";

interface VersionFooterProps {
  block: UIBlock;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  documents: Array<Document> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({
  block,
  handleVersionChange,
  documents,
  currentVersionIndex,
}: VersionFooterProps) => {
  const { width } = useWindowSize();
  const isMobile = width < 768;

  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  if (!documents) return;

  return (
    <motion.div
      className="border-border bg-background absolute bottom-0 z-50 flex w-full flex-col justify-between gap-4 border-t px-4 pt-4 pb-6 lg:flex-row"
      initial={{ y: isMobile ? 200 : 77 }}
      animate={{ y: 0 }}
      exit={{ y: isMobile ? 200 : 77 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
    >
      <div>
        <div>You are viewing a previous version</div>
        <div className="text-muted-foreground text-sm">
          Restore this version to make edits
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          disabled={isMutating}
          onClick={async () => {
            setIsMutating(true);

            const response = await fetch(
              `/api/document?id=${block.documentId}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  timestamp: getDocumentTimestampByIndex(
                    documents,
                    currentVersionIndex,
                  ),
                }),
              },
            );

            if (response.ok) {
              // Revalidate the data after successful deletion
              mutate(`/api/document?id=${block.documentId}`);
            }

            setIsMutating(false);
          }}
        >
          <div>Restore this version</div>
          {isMutating && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleVersionChange("latest");
          }}
        >
          Back to latest version
        </Button>
      </div>
    </motion.div>
  );
};
