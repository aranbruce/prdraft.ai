import { auth } from "@/app/(auth)/auth";
import { AppSidebar } from "@/components/custom/app-sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <>
      {session?.user && <AppSidebar user={session?.user} />}
      {children}
    </>
  );
}
