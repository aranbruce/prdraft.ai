import { Message } from "ai";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";

import { Vote } from "@/lib/db/schema";
import { getMessageIdFromAnnotations } from "@/lib/utils";

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function MessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === "user") return null;

  // Check if there are tool invocations using the parts approach
  const hasToolInvocations = message.parts
    ? message.parts.some((part) => part.type === "tool-invocation")
    : false;

  if (hasToolInvocations) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-muted-foreground h-fit px-2 py-1"
              variant="outline"
              onClick={async () => {
                await copyToClipboard(message.content as string);
                toast.success("Copied to clipboard!");
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-muted-foreground pointer-events-auto! h-fit px-2 py-1"
              disabled={vote && vote.isUpvoted}
              variant="outline"
              onClick={async () => {
                const messageId = getMessageIdFromAnnotations(message);

                const upvote = fetch("/api/vote", {
                  method: "PATCH",
                  body: JSON.stringify({
                    chatId,
                    messageId,
                    type: "up",
                  }),
                });

                toast.promise(upvote, {
                  loading: "Upvoting Response...",
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return "Upvoted Response!";
                  },
                  error: "Failed to upvote response.",
                });
              }}
            >
              <ThumbUpIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-muted-foreground pointer-events-auto! h-fit px-2 py-1"
              variant="outline"
              disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const messageId = getMessageIdFromAnnotations(message);

                const downvote = fetch("/api/vote", {
                  method: "PATCH",
                  body: JSON.stringify({
                    chatId,
                    messageId,
                    type: "down",
                  }),
                });

                toast.promise(downvote, {
                  loading: "Downvoting Response...",
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return "Downvoted Response!";
                  },
                  error: "Failed to downvote response.",
                });
              }}
            >
              <ThumbDownIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
