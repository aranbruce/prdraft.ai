import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { auth } from "../(auth)/auth";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  return (
    <SessionProvider session={session}>
      <SidebarProvider
        defaultOpen={!isCollapsed}
        className="h-dvh min-h-0 w-full"
      >
        <AppSidebar user={session?.user} />
        <SidebarInset className="relative w-full">{children}</SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
