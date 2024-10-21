import { PanelLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { auth, signOut } from "@/app/(auth)/auth";

import { AppSidebar } from "./app-sidebar";
import { MenuIcon } from "./icons";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";

const SignOutForm = () => (
  <form
    className="w-full"
    action={async () => {
      "use server";
      await signOut({ redirectTo: "/" });
    }}
  >
    <button type="submit" className="w-full px-1 py-0.5 text-left text-red-500">
      Sign out
    </button>
  </form>
);

const UserDropdown = ({ email }: { email: string }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        className="h-fit rounded-full p-3 text-xs font-bold"
        variant="secondary"
      >
        {email.slice(0, 2).toUpperCase()}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem className="z-50 p-1">
        <SignOutForm />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const Navbar = async () => {
  let session = await auth();
  console.log("session: ", session);

  return (
    <>
      {session?.user ? (
        <>
          <AppSidebar user={session?.user} />
          <nav className="fixed top-0 flex w-full flex-row items-center justify-between px-3 py-2">
            <div className="flex flex-row items-center gap-2">
              <Link href="/" className="hidden md:flex">
                <Image
                  src="/images/logo.svg"
                  alt={"PRDraft Logo"}
                  width={40}
                  height={40}
                />
              </Link>
              <SidebarTrigger className="hidden md:flex">
                <PanelLeft />
              </SidebarTrigger>
              <SidebarTrigger className="flex md:hidden [&_svg]:size-5">
                <MenuIcon size={20} />
              </SidebarTrigger>
            </div>
            {session.user.email ? (
              <UserDropdown email={session.user.email} />
            ) : null}
          </nav>
        </>
      ) : (
        <nav className="absolute left-0 top-0 z-30 flex w-dvw flex-row items-center justify-between bg-background px-3 py-2">
          <div className="flex flex-row items-center gap-3">
            <Link href="/">
              <Image
                src="/images/logo.svg"
                alt={"PRDraft Logo"}
                width={40}
                height={40}
              />
            </Link>
          </div>
          <div className="flex flex-row gap-2">
            <Button className="" asChild variant="outline">
              <Link href="/sign-up">Sign up</Link>
            </Button>
            <Button className="" asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </nav>
      )}
    </>
  );
};
