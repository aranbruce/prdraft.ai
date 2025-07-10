import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

import {
  MoreHorizontalIcon,
  TrashIcon,
  PencilEditIcon,
} from "@/components/icons";
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
            className="focus-visible:ring-opacity/50 focus-visible:ring-primary focus-visible:ring-offset-background absolute left-0 w-full rounded-md py-1.5 pr-8 pl-2 focus:ring-2 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-hidden"
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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5 cursor-pointer"
              showOnHover={!isActive}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem
              className="text-secondary-foreground focus:bg-primary-foreground focus:text-primary dark:text-secondary-foreground cursor-pointer"
              onSelect={() => setIsEditing(true)}
            >
              <PencilEditIcon />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/15 focus:text-destructive cursor-pointer dark:text-red-500"
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
