"use client"

import { useAccount } from "wagmi"
import { useUserWagers, useWagerData, useSupportedTokens } from "@/lib/hooks"
import { WagerCard } from "@/components/wager-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatTokenAmount } from "@/lib/hooks"
import type { Address } from "viem"

// Convert contract wager data to our frontend format
function formatWagerData(wagerAddress: Address, wagerData: any, supportedTokens: any[]) {
  if (!wagerData) return null

  console.log('Raw wager data:', wagerData)

  // wagerData is now a struct object, not an array
  const {
    creator,
    opponent,
    token,
    amount,
    creatorChessUsername,
    opponentChessUsername,
    gameId,
    state,
    winner,
    createdAt,
    fundedAt,
    expiresAt
  } = wagerData

  // Find token info
  const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === token.toLowerCase())
  
  // Map contract state to our frontend status
  const getStatus = (state: number, winner: Address) => {
    switch(state) {
      case 0: return "open"      // Created
      case 1: return "active"    // Funded  
      case 2: return "active"    // GameLinked
      case 3: return "active"    // Completed
      case 4: return "settled"   // Settled
      case 5: return "canceled"  // Cancelled
      case 6: return "active"    // Disputed
      default: return "open"
    }
  }

  return {
    id: wagerAddress,
    creator: creator,
    opponentHandle: opponentChessUsername || "Pending...",
    amount: tokenInfo ? parseFloat(formatTokenAmount(amount, tokenInfo.decimals)) : 0,
    tokenSymbol: tokenInfo?.symbol || "Unknown",
    timeControl: "3+2" as const, // Default for now
    status: getStatus(state, winner),
    createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    expiry: new Date(Number(expiresAt) * 1000).toISOString(),
    // Additional contract data
    contractAddress: wagerAddress,
    gameId: gameId || "",
    winner: winner,
    creatorChessUsername: creatorChessUsername || "",
    fundedAt: fundedAt ? new Date(Number(fundedAt) * 1000).toISOString() : null,
  }
}

function WagersList({ userAddress }: { userAddress: Address }) {
  const supportedTokens = useSupportedTokens()
  const { data: wagerAddresses, isLoading: isLoadingAddresses, error: addressError } = useUserWagers(userAddress)

  if (isLoadingAddresses) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (addressError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Error loading wagers: {addressError.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!wagerAddresses || wagerAddresses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No wagers found. Create your first wager to get started!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {wagerAddresses.map((wagerAddress: Address) => (
        <WagerDataCard 
          key={wagerAddress} 
          wagerAddress={wagerAddress} 
          supportedTokens={supportedTokens}
        />
      ))}
    </div>
  )
}

function WagerDataCard({ wagerAddress, supportedTokens }: { wagerAddress: Address, supportedTokens: any[] }) {
  const { data: wagerData, isLoading, error } = useWagerData(wagerAddress)

  console.log('WagerDataCard Debug:', {
    wagerAddress,
    wagerData,
    isLoading,
    error: error?.message,
    supportedTokens: supportedTokens.length
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-8 w-full" />
          <p className="text-xs text-muted-foreground mt-2">Loading {wagerAddress}...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !wagerData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Error loading wager data</p>
          <p className="text-xs text-muted-foreground mt-1">{wagerAddress}</p>
          {error && (
            <p className="text-xs text-red-500 mt-1">Error: {error.message}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const formattedWager = formatWagerData(wagerAddress, wagerData, supportedTokens)
  
  if (!formattedWager) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Unable to format wager data</p>
          <p className="text-xs text-muted-foreground mt-1">Raw data: {JSON.stringify(wagerData)}</p>
        </CardContent>
      </Card>
    )
  }

  return <WagerCard wager={formattedWager} />
}

export default function DashboardPage() {
  const { address: userAddress, isConnected } = useAccount()

  if (!isConnected || !userAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-balance">Your wagers</h1>
          <p className="text-sm text-muted-foreground mt-1">Track open, active, and settled wagers.</p>
        </header>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please connect your wallet to view your wagers.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-balance">Your wagers</h1>
        <p className="text-sm text-muted-foreground mt-1">Track open, active, and settled wagers.</p>
      </header>
      <WagersList userAddress={userAddress} />
    </div>
  )
}
