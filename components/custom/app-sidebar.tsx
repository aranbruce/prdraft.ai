"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type User } from "next-auth";

import { PlusIcon } from "@/components/custom/icons";
import { SidebarHistory } from "@/components/custom/sidebar-history";
import { SidebarUserNav } from "@/components/custom/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { BetterTooltip } from "@/components/ui/tooltip";

import { Logo } from "./logo";
import { SidebarToggle } from "./sidebar-toggle";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="h-dvh group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-col items-stretch gap-4">
            <div
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row items-center gap-3"
            >
              <div className="flex w-full flex-row items-center justify-between">
                <Link href="/">
                  <Logo size={32} />
                </Link>
                <SidebarToggle />
              </div>
            </div>
            <BetterTooltip content="New Chat" align="start">
              <Button
                variant="outline"
                className="h-fit p-2"
                onClick={() => {
                  setOpenMobile(false);
                  router.push("/");
                  router.refresh();
                }}
              >
                <PlusIcon /> New Chat
              </Button>
            </BetterTooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarHistory user={user} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-0">
        {user && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarUserNav user={user} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
