import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

import {
  MoreHorizontalIcon,
  TrashIcon,
  PencilEditIcon,
} from "@/components/custom/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Chat } from "@/lib/db/schema";

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  setOpenMobile: (open: boolean) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isActive,
  onDelete,
  onRename,
  setOpenMobile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // autofocus on input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      console.log("isEditing: ", isEditing);
      console.log("inputRef.current?.focus():", inputRef.current);
    }
  }, [isEditing]);

  function handleRename() {
    if (newTitle !== chat.title) {
      onRename(chat.id, newTitle);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleRename();
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild={!isEditing} isActive={isActive}>
        {isEditing ? (
          <input
            type="text"
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            contentEditable={isEditing}
            className="focus-visible:ring-opacity/50 absolute left-0 w-full rounded-md py-1.5 pl-2 pr-8 focus:ring-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-offset-background"
          />
        ) : (
          <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
            <span>{chat.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
      {!isEditing && (
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="cursor-pointer text-secondary-foreground focus:bg-primary-foreground focus:text-primary dark:text-secondary-foreground"
              onSelect={() => setIsEditing(true)}
            >
              <PencilEditIcon />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
              onSelect={() => onDelete(chat.id)}
            >
              <TrashIcon />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
};

export default ChatItem;
