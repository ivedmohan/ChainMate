"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import { WalletButton } from "@/components/wallet-button"

export function Navbar() {
  const pathname = usePathname()
  const nav = [
    { href: "/", label: "Home" },
    { href: "/wagers/new", label: "Create" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/games/manage", label: "Manage" },
  ]

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
      <nav className="container mx-auto h-16 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-md bg-primary" aria-hidden />
          <span className="font-semibold">ChainMate</span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Button key={item.href} asChild variant={active ? "default" : "ghost"} className="px-3">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </nav>
    </header>
  )
}
