"use client";
import { ChevronUp, MonitorSmartphone, MoonStar, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-10 data-[state=open]:bg-sidebar data-[state=open]:text-sidebar-accent-foreground">
              <Image
                src={`https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? "User Avatar"}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="truncate">{user?.email}</span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem asChild className="w-full cursor-pointer">
              <Link href={`/settings`} onClick={() => setOpenMobile(false)}>
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex w-full flex-row justify-between py-0.5 focus:bg-transparent">
              Theme
              <ToggleGroup type="single" size={"sm"} defaultValue={theme}>
                <ToggleGroupItem
                  value="system"
                  aria-label="System"
                  className="size-7 min-w-6"
                  onClick={() => setTheme("system")}
                >
                  <MonitorSmartphone className="size-2" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="light"
                  aria-label="Light mode"
                  className="size-7 min-w-6"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="size-2" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  aria-label="Dark mode"
                  className="size-7 min-w-6"
                  onClick={() => setTheme("dark")}
                >
                  <MoonStar className="size-2" />
                </ToggleGroupItem>
              </ToggleGroup>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button
                className="w-full cursor-pointer"
                onClick={() => {
                  signOut({
                    redirectTo: "/",
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
