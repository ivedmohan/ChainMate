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
import { BlockscoutProvider } from "@/components/blockscout-provider"

export const metadata: Metadata = {
  title: "ChainMate - Play Proof Win",
  description: "Chess wagering with zero-knowledge proofs. Play, prove your wins, and claim rewards trustlessly.",
  generator: "ChainMate",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <BlockscoutProvider>
          <Web3Provider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <Suspense fallback={<div>Loading...</div>}>
                <VisibilityRefreshProvider>
                  <Navbar />
                  <RealTimeIndicator />
                  <DataUpdateNotifier />
                  <main className="min-h-[calc(100dvh-64px)]" suppressHydrationWarning>
                    {children}
                  </main>
                  <Toaster />
                </VisibilityRefreshProvider>
              </Suspense>
            </ThemeProvider>
          </Web3Provider>
        </BlockscoutProvider>
      </body>
    </html>
  )
}
