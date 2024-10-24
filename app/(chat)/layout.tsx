import { auth } from "@/app/(auth)/auth";
import { AppSidebar } from "@/components/custom/app-sidebar";

export default async function ChatLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <>
      {session?.user && (
        <>
          Session
          <AppSidebar user={session?.user} />
        </>
      )}
      {children}
    </>
  );
}
