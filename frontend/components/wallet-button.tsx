"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function WalletButton() {
  const [connected, setConnected] = useState(false)

  return connected ? (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
      <span className="text-sm">0x1234...ABCD</span>
      <Button variant="secondary" size="sm" onClick={() => setConnected(false)}>
        Disconnect
      </Button>
    </div>
  ) : (
    <Button size="sm" onClick={() => setConnected(true)}>
      Connect wallet
    </Button>
  )
}
