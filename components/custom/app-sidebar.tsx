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
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { User } from "next-auth";
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
import { fetcher, getTitleFromChat } from "@/lib/utils";

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

export function AppSidebar({ user }: { user: User | undefined }) {
  const { id } = useParams();
  const pathname = usePathname();

  const { state, setOpenMobile } = useSidebar();

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

  const handleDelete = async (deleteId: string) => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });
    console.log("deleteId", deleteId);

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => h.id !== deleteId);
          }
        });
        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });
  };

  useEffect(() => {
    console.log("history", history);
  }, [history]);

  useEffect(() => {
    console.log("user", user);
  }, [user]);

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="flex flex-row items-center justify-between">
          <Link href="/">
            <Image
              src="/images/logo.svg"
              alt={"PRDraft Logo"}
              width={40}
              height={40}
            />
          </Link>
          <SidebarTrigger className="flex md:hidden">
            <X size={16} />
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
              <Link href="/">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setOpenMobile(false)}
                >
                  New chat
                </Button>
              </Link>
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
                {history &&
                  history.map((chat) => (
                    <SidebarMenuItem
                      key={chat.id}
                      className={cx(
                        "flex flex-row items-center gap-6 rounded-md pr-2 hover:bg-zinc-200",
                        { "bg-zinc-200/80": chat.id === id },
                      )}
                    >
                      <SidebarMenuButton
                        asChild
                        // variant="ghost"
                        className={cx(
                          "line-clamp-1 items-center justify-between gap-2 overflow-hidden text-ellipsis p-0 text-sm font-normal transition-none hover:bg-zinc-200",
                        )}
                      >
                        <Link
                          href={`/chat/${chat.id}`}
                          className="overflow-hidden text-ellipsis rounded-lg py-2 pl-2 text-left capitalize"
                        >
                          {chat.title || "Untitled"}
                        </Link>
                      </SidebarMenuButton>

                      <DropdownMenu modal={true}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            className="h-fit p-0 font-normal text-zinc-500 shadow-sm transition-none hover:bg-zinc-200"
                            variant="ghost"
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="left" className="z-50">
                          <DropdownMenuItem asChild>
                            <AlertDialog>
                              <AlertDialogTrigger className="mr-2">
                                <Button
                                  className="relative mr-2 flex h-fit w-full flex-row items-center justify-start gap-2 rounded-sm bg-white p-1.5 font-normal text-red-600 shadow-md"
                                  variant="ghost"
                                >
                                  <TrashIcon />
                                  Delete
                                </Button>
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
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 active:bg-red-800"
                                    onClick={() => {
                                      console.log("delete", chat.id);
                                      handleDelete(chat.id);
                                    }}
                                  >
                                    <TrashIcon />
                                    Confirm deletion
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            {/* <Button
                              className="mr-2 flex h-fit w-full flex-row items-center justify-start gap-2 rounded-sm bg-white p-1.5 font-normal shadow-md"
                              variant="ghost"
                              onClick={() => {
                                console.log("delete", chat.id);
                                handleDelete(chat.id);
                              }}
                            >
                              <TrashIcon />
                              Delete
                            </Button> */}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
