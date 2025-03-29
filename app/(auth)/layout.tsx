import Link from "next/link";
import React from "react";

import { Logo } from "../../components/logo";
import { Button } from "../../components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col">
      <header className="fixed flex w-full flex-row justify-between gap-2 p-2">
        <Link href="/">
          <Logo size={32} />
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </header>
      <section>{children}</section>
    </main>
  );
}
