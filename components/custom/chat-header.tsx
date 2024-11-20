"use client";

import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";

import { SidebarToggle } from "@/components/custom/sidebar-toggle";

import { Logo } from "./logo";
import { useSidebar } from "../ui/sidebar";

export function ChatHeader({ selectedModelId }: { selectedModelId: string }) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="fixed top-0 flex w-full items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      {(!open || windowWidth < 768) && (
        <div className="flex flex-row items-center gap-2">
          <Logo size={32} />
          <SidebarToggle />
        </div>
      )}
    </header>
  );
}
