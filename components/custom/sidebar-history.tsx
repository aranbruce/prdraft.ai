"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type User } from "next-auth";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Chat } from "@/db/schema";
import { fetcher } from "@/lib/utils";

import ChatItem from "./chat-item";

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

const useChatHistory = (user: User | undefined) => {
  const { id } = useParams();
  const pathname = usePathname();
  const {
    data: history,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? "/api/history" : null, fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  return { history, isLoading, mutate, id };
};

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { history, isLoading, mutate, id } = useChatHistory(user);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((history) => history?.filter((h) => h.id !== id));
        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push("/");
    }
  };

  const handleRename = async (chatId: string, title: string) => {
    const renamePromise = fetch(`/api/chat?id=${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });

    toast.promise(renamePromise, {
      loading: "Renaming chat...",
      success: () => {
        mutate((history) =>
          history?.map((h) => (h.id === chatId ? { ...h, title } : h)),
        );
        return "Chat renamed successfully";
      },
      error: "Failed to rename chat",
    });
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 text-sm text-zinc-500">
            <div>Login to save and revisit previous chats!</div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="flex h-8 items-center gap-2 rounded-md px-2"
              >
                <div
                  className="h-4 max-w-[--skeleton-width] flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={
                    { "--skeleton-width": `${item}%` } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (history?.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 text-sm text-zinc-500">
            <div>
              Your conversations will appear here once you start chatting!
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const groupedChats = groupChatsByDate(history ?? []);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {Object.entries(groupedChats).map(
              ([key, chats]) =>
                chats.length > 0 && (
                  <div key={key} className="flex flex-col gap-0.5">
                    <div className="mt-6 px-2 py-1 text-xs text-sidebar-foreground/50">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                    {chats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={chat.id === id}
                        onRename={handleRename}
                        onDelete={(chatId) => {
                          setDeleteId(chatId);
                          setShowDeleteDialog(true);
                        }}
                        setOpenMobile={setOpenMobile}
                      />
                    ))}
                  </div>
                ),
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
