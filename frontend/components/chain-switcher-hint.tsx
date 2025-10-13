"use client"

import { useChainId, useSwitchChain } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ChainSwitcherHintProps {
  targetChainId: number
  targetChainName: string
  message?: string
}

export function ChainSwitcherHint({ 
  targetChainId, 
  targetChainName,
  message = "This wager is on a different chain"
}: ChainSwitcherHintProps) {
  const currentChainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (currentChainId === targetChainId) {
    return null
  }

  return (
    <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          🔄 Switch Chain Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">{message}</p>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">Current: Chain {currentChainId}</Badge>
            <span>→</span>
            <Badge className="bg-blue-600">Required: {targetChainName}</Badge>
          </div>
        </div>
        
        <Button 
          onClick={() => switchChain({ chainId: targetChainId })}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Switching..." : `Switch to ${targetChainName}`}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          💡 After switching, if you have funds on another chain, Avail Nexus will help you bridge them automatically!
        </p>
      </CardContent>
    </Card>
  )
}
