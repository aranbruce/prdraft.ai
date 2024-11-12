import Link from 'next/link'
import React from "react"
import { Logo } from "../../components/custom/logo"
import { Button } from "../../components/ui/button"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex flex-row p-2 gap-2 justify-between"> 
        <Logo size={32} />
        <div className="grid grid-cols-2 gap-2">
        <Button asChild>
          <Link href="/login">Login</Link></Button>
        <Button variant="outline" asChild><Link href="/register">Register</Link></Button>
        </div>
      </header>
      {children}
    </section>
  )
}
