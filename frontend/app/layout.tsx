import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/navbar"
import { Web3Provider } from "@/components/web3-provider"
import { RealTimeIndicator } from "@/components/real-time-indicator"
import { VisibilityRefreshProvider } from "@/components/visibility-refresh-provider"
import { DataUpdateNotifier } from "@/components/data-update-notifier"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "ChainMate - P2P Chess Wagering",
  description: "Wager on chess games with zero-knowledge proofs",
  generator: "ChainMate",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Web3Provider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Suspense fallback={<div>Loading...</div>}>
              <VisibilityRefreshProvider>
                <Navbar />
                <RealTimeIndicator />
                <DataUpdateNotifier />
                <main className="min-h-[calc(100dvh-64px)]">{children}</main>
                <Toaster />
              </VisibilityRefreshProvider>
            </Suspense>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  )
}
