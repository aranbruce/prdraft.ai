"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWindowSize } from "usehooks-ts";

import { SidebarToggle } from "@/components/custom/sidebar-toggle";

import { Logo } from "./logo";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";

export function ChatHeader({ selectedModelId }: { selectedModelId: string }) {
  const router = useRouter();
  const { open } = useSidebar();
  const session = useSession();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center justify-between gap-2 bg-background p-2 md:bg-transparent">
      {(!open || windowWidth < 768) && (
        <div className="flex h-9 flex-row items-center gap-2">
          <Link href="/">
            <Logo size={32} />
          </Link>
          <SidebarToggle />
        </div>
      )}
      {!session?.data?.user && (
        <div className="flex w-full justify-end">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/sign-up">Sign up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
