'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { type User } from 'next-auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar
} from '@/components/ui/sidebar';
import { Chat } from '@/db/schema';
import { fetcher } from '@/lib/utils';
import ChatItem from "./chat-item";

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

// const ChatItem = ({
//   chat,
//   isActive,
//   onDelete,
//   onRename,
//   setOpenMobile,
// }: {
//   chat: Chat;
//   isActive: boolean;
//   onDelete: (chatId: string) => void;
//   onRename: (chatId: string, title: string) => void;
//   setOpenMobile: (open: boolean) => void;
// }) => {
//   const [isEditing, setIsEditing] = useState(false);
//   const [newTitle, setNewTitle] = useState(chat.title);

//   const handleRename = () => {
//     if (newTitle !== chat.title) {
//       onRename(chat.id, newTitle);
//     }
//     setIsEditing(false);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === 'Enter') {
//       handleRename();
//     }
//   };

//   return (
//     <SidebarMenuItem>
//       <SidebarMenuButton asChild isActive={isActive}>
//         <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
//           {isEditing ? (
//             <input
//               type="text"
//               value={newTitle}
//               onChange={(e) => setNewTitle(e.target.value)}
//               onBlur={handleRename}
//               onKeyDown={handleKeyDown}
//               className="w-full py-1.5 pl-2 pr-8 rounded-md bg-secondary left-0 absolute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-offset-background focus-visible:ring-opacity-50"
//             />
//           ) : (
//             <span>{chat.title}</span>
//           )}
//         </Link>
//       </SidebarMenuButton>
//       <DropdownMenu modal={true}>
//         <DropdownMenuTrigger asChild>
//           <SidebarMenuAction
//             className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
//             showOnHover={!isActive}
//           >
//             <MoreHorizontalIcon />
//             <span className="sr-only">More</span>
//           </SidebarMenuAction>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent side="bottom" align="end">
//           <DropdownMenuItem
//             className="cursor-pointer text-secondary-foreground focus:bg-primary-foreground focus:text-primary dark:text-secondary-foreground"
//             onSelect={() => setIsEditing(true)}
//           >
//             Rename
//           </DropdownMenuItem>
//           <DropdownMenuItem
//             className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
//             onSelect={() => onDelete(chat.id)}
//           >
//             <TrashIcon />
//             <span>Delete</span>
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </SidebarMenuItem>
//   );
// };

const useChatHistory = (user: User | undefined) => {
  const { id } = useParams();
  const pathname = usePathname();
  const { data: history, isLoading, mutate } = useSWR<Array<Chat>>(user ? '/api/history' : null, fetcher, { fallbackData: [] });

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
    } as GroupedChats
  );
};

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { history, isLoading, mutate, id } = useChatHistory(user);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, { method: 'DELETE' });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((history) => history?.filter((h) => h.id !== id));
        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push('/');
    }
  };

  const handleRename = async (chatId: string, title: string) => {
    const renamePromise = fetch(`/api/chat?id=${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });

    toast.promise(renamePromise, {
      loading: 'Renaming chat...',
      success: () => {
        mutate((history) => history?.map((h) => (h.id === chatId ? { ...h, title } : h)));
        return 'Chat renamed successfully';
      },
      error: 'Failed to rename chat',
    });
  };

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            <div>Login to save and revisit previous chats!</div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">Today</div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div key={item} className="rounded-md h-8 flex gap-2 px-2 items-center">
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={{ '--skeleton-width': `${item}%` } as React.CSSProperties}
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
          <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            <div>Your conversations will appear here once you start chatting!</div>
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
            {Object.entries(groupedChats).map(([key, chats]) => (
              chats.length > 0 && (
                <div key={key} className="flex flex-col gap-0.5">
                  <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6 ">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
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
              )
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}