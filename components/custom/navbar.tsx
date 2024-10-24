import { PanelLeft } from "lucide-react";
import Link from "next/link";

import { auth, signOut } from "@/app/(auth)/auth";

import { MenuIcon } from "./icons";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarTrigger } from "../ui/sidebar";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

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
  const session = await auth();

  return (
    <nav className="fixed top-0 z-10 flex w-full flex-row items-center justify-between bg-gradient-to-b from-white to-transparent px-3 py-2 backdrop-blur-[1px] dark:from-zinc-950">
      <div className="flex flex-row items-center gap-2">
        <Link
          href="/"
          className={cn(`${session?.user?.email && "hidden"} md:flex`)}
        >
          <Logo />
        </Link>
        {session?.user && (
          <>
            <SidebarTrigger className="hidden md:flex">
              <PanelLeft />
            </SidebarTrigger>
            <SidebarTrigger className="flex md:hidden [&_svg]:size-5">
              <MenuIcon size={20} />
            </SidebarTrigger>
          </>
        )}
      </div>
      {session?.user?.email ? (
        <UserDropdown email={session.user.email} />
      ) : (
        <div className="flex flex-row gap-2">
          <Button className="" asChild variant="outline">
            <Link href="/sign-up">Sign up</Link>
          </Button>
          <Button className="" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      )}
    </nav>
  );
};
