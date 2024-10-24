"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { cx } from "class-variance-authority";
import {
  InfoIcon,
  MoreHorizontalIcon,
  PanelLeft,
  TrashIcon,
  X,
} from "lucide-react";
import { User } from "next-auth";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import useSWR from "swr";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Chat } from "@/db/schema";
import { fetcher } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Logo } from "./logo";

export function AppSidebar({ user }: { user: User | undefined }) {
  const { id } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const { state, setOpenMobile } = useSidebar();

  const {
    data: chats,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? "/api/chats" : null, fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  const handleDelete = async (deleteId: string) => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((chats) => {
          if (chats) {
            return chats.filter((chat) => chat.id !== id);
          }
        });
        console.log(pathname);
        if (pathname === `/chat/${deleteId}`) {
          router.push("/");
        }
        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });
  };

  function handleNewChat() {
    setOpenMobile(false);
    router.push("/");
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex flex-row items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <SidebarTrigger className="flex md:hidden">
          <X size={24} />
        </SidebarTrigger>

        {state === "expanded" && (
          <SidebarTrigger className="hidden md:flex">
            <PanelLeft />
          </SidebarTrigger>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleNewChat()}
            >
              New chat
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isLoading && history?.length === 0 && user ? (
                <div className="mt-4 flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-zinc-200/80 py-8 text-sm text-zinc-500">
                  <InfoIcon />
                  <div>No chats found</div>
                </div>
              ) : null}

              {isLoading && user ? (
                <div className="flex flex-col">
                  {[44, 32, 28, 52].map((item) => (
                    <div key={item} className="my-[2px] p-2">
                      <div
                        className={`w-${item} h-[20px] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-600`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {chats &&
                chats.map((chat, index) => (
                  <SidebarMenuItem
                    key={chat.id}
                    tabIndex={index}
                    className={cx(
                      "flex flex-row items-center gap-2 rounded-md",
                      { "bg-zinc-200/80 dark:bg-zinc-800": chat.id === id },
                    )}
                  >
                    <SidebarMenuButton
                      asChild
                      className={cx(
                        "line-clamp-1 items-center justify-between gap-2 overflow-hidden text-ellipsis p-0 text-sm font-normal transition",
                      )}
                    >
                      <Link
                        href={`/chat/${chat.id}`}
                        onClick={() => setOpenMobile(false)}
                        className="flex flex-row gap-2 overflow-hidden text-ellipsis rounded-lg py-2 pl-2 text-left capitalize"
                      >
                        {chat.title || "Untitled"}
                        <DropdownMenu modal={true}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              className="mr-2 h-fit p-1 font-normal text-zinc-500 transition-none hover:bg-zinc-200"
                              variant="ghost"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            className="z-50 -mt-3 ml-3 flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-1 font-normal shadow-md dark:border-zinc-700 dark:bg-zinc-800"
                          >
                            <DropdownMenuItem asChild>
                              <AlertDialog>
                                <AlertDialogTrigger className="relative flex h-fit w-full flex-row items-center justify-start gap-2 p-1.5 text-red-600 outline-none">
                                  <TrashIcon size={16} />
                                  Delete
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete your account and remove
                                      your data from our servers.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        handleDelete(chat.id);
                                      }}
                                    >
                                      <TrashIcon />
                                      Confirm deletion
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem asChild>
                            <Button
                              className="relative flex h-fit w-full flex-row items-center justify-start gap-2 p-1.5"
                              variant="ghost"
                            >
                              <Shuffle />
                              Rename
                            </Button>
                          </DropdownMenuItem> */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
