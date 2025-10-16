"use client"

import React, { useState } from "react"
import { useAccount } from "wagmi"
import { useUserWagers, useAllWagers, useWagerData, useSupportedTokens, useInvalidateWagerQueries } from "@/lib/hooks"
import { WagerCard } from "@/components/wager-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshButton } from "@/components/refresh-button"
import { formatTokenAmount } from "@/lib/hooks"
import { RefreshCw } from "lucide-react"
import { ClientOnly } from "@/components/client-only"
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
  const getStatus = (state: number, winner: Address): "open" | "active" | "settled" | "canceled" => {
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
  const [displayCount, setDisplayCount] = useState(6)
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

  // Reverse to show newest first
  const reversedWagers = [...wagerAddresses].reverse()
  const displayedWagers = reversedWagers.slice(0, displayCount)
  const hasMore = reversedWagers.length > displayCount

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {displayedWagers.map((wagerAddress: Address) => (
          <WagerDataCard 
            key={wagerAddress} 
            wagerAddress={wagerAddress} 
            supportedTokens={supportedTokens}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setDisplayCount(prev => prev + 6)}
            className="px-6 py-2 text-sm font-medium border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Load More ({wagerAddresses.length - displayCount} remaining)
          </button>
        </div>
      )}
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

function AvailableWagersList({ userAddress }: { userAddress: Address }) {
  const [displayCount, setDisplayCount] = useState(6)
  const [filteredWagers, setFilteredWagers] = useState<Address[]>([])
  const [processedWagers, setProcessedWagers] = useState<Set<Address>>(new Set())
  const supportedTokens = useSupportedTokens()
  const { data: allWagerAddresses, isLoading: isLoadingAll, error: allError } = useAllWagers(0, 50)

  if (isLoadingAll) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
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

  if (allError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Error loading available wagers: {allError.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (!allWagerAddresses || allWagerAddresses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No wagers available to accept at the moment.</p>
        </CardContent>
      </Card>
    )
  }

  // Check if all wagers have been processed
  const allProcessed = allWagerAddresses.every(w => processedWagers.has(w))
  const hasAvailableWagers = filteredWagers.length > 0

  return (
    <div className="space-y-4">
      {/* Show available wagers */}
      {hasAvailableWagers && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWagers.slice(0, displayCount).map((wagerAddress: Address) => (
            <AvailableWagerCard 
              key={wagerAddress} 
              wagerAddress={wagerAddress} 
              supportedTokens={supportedTokens}
              userAddress={userAddress}
            />
          ))}
        </div>
      )}

      {/* Hidden rendering of all wagers to trigger filtering */}
      <div style={{ display: 'none' }}>
        {allWagerAddresses.map((wagerAddress: Address) => (
          <AvailableWagerCard 
            key={wagerAddress} 
            wagerAddress={wagerAddress} 
            supportedTokens={supportedTokens}
            userAddress={userAddress}
            onFilterResult={(isAvailable) => {
              // Mark this wager as processed
              setProcessedWagers(prev => new Set(prev).add(wagerAddress))
              
              // Track which wagers are actually available
              setFilteredWagers(prev => {
                if (isAvailable && !prev.includes(wagerAddress)) {
                  return [...prev, wagerAddress].reverse() // Newest first
                } else if (!isAvailable && prev.includes(wagerAddress)) {
                  return prev.filter(w => w !== wagerAddress)
                }
                return prev
              })
            }}
          />
        ))}
      </div>
      
      {/* Loading state while processing */}
      {!allProcessed && (
        <div className="flex justify-center pt-2">
          <p className="text-sm text-muted-foreground">Checking available wagers...</p>
        </div>
      )}
      
      {/* Show "Load More" button if there are more filtered wagers */}
      {hasAvailableWagers && filteredWagers.length > displayCount && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setDisplayCount(prev => prev + 6)}
            className="px-6 py-2 text-sm font-medium border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Load More ({filteredWagers.length - displayCount} remaining)
          </button>
        </div>
      )}
      
      {/* Show message if no available wagers after all are processed */}
      {allProcessed && !hasAvailableWagers && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No wagers available to accept at the moment.</p>
            <p className="text-xs text-muted-foreground mt-2">Wagers need to be funded by their creators before they can be accepted.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AvailableWagerCard({ 
  wagerAddress, 
  supportedTokens, 
  userAddress,
  onFilterResult
}: { 
  wagerAddress: Address
  supportedTokens: any[]
  userAddress: Address
  onFilterResult?: (isAvailable: boolean) => void
}) {
  const { data: wagerData, isLoading, error } = useWagerData(wagerAddress)

  React.useEffect(() => {
    if (!isLoading && onFilterResult) {
      if (wagerData) {
        const {
          creator,
          opponent,
          state,
          creatorDeposited
        } = wagerData

        // Only show wagers that:
        // 1. Are in "Created" state (0) OR "Funded" state (1) if creator deposited
        // 2. Were NOT created by current user
        // 3. Don't have an opponent yet (opponent is zero address OR opponent is current user but not accepted)
        // 4. Creator has deposited (creatorDeposited === true)
        const isCreatedByUser = creator.toLowerCase() === userAddress.toLowerCase()
        const isOpen = state === 0 || state === 1
        const hasNoOpponent = opponent === "0x0000000000000000000000000000000000000000"
        const creatorFunded = creatorDeposited === true

        const isAvailable = !isCreatedByUser && isOpen && hasNoOpponent && creatorFunded
        
        onFilterResult(isAvailable)
      } else {
        // If no data, not available
        onFilterResult(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, wagerData, userAddress, wagerAddress])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !wagerData) {
    return null // Don't show error cards in available wagers list
  }

  const {
    creator,
    opponent,
    state,
    creatorDeposited
  } = wagerData

  // Only show wagers that:
  // 1. Are in "Created" state (0) OR "Funded" state (1)
  // 2. Were NOT created by current user
  // 3. Don't have an opponent yet (opponent is zero address)
  // 4. Creator has deposited (creatorDeposited === true)
  const isCreatedByUser = creator.toLowerCase() === userAddress.toLowerCase()
  const isOpen = state === 0 || state === 1
  const hasNoOpponent = opponent === "0x0000000000000000000000000000000000000000"
  const creatorFunded = creatorDeposited === true

  if (isCreatedByUser || !isOpen || !hasNoOpponent || !creatorFunded) {
    return null // Hide this wager
  }

  const formattedWager = formatWagerData(wagerAddress, wagerData, supportedTokens)
  
  if (!formattedWager) {
    return null
  }

  // Modify the wager card data to show "Accept" action
  const availableWager = {
    ...formattedWager,
    opponentHandle: "🎯 Available to Accept"
  }

  return <WagerCard wager={availableWager} />
}

function DashboardContent() {
  const { address: userAddress, isConnected } = useAccount()
  const { invalidateUserWagers, invalidateAllWagers } = useInvalidateWagerQueries()
  
  // Auto-refresh when page becomes visible
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userAddress) {
        // Refresh wager data when user returns to the page
        invalidateUserWagers()
        invalidateAllWagers()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userAddress, invalidateUserWagers, invalidateAllWagers])
  
  // Manual refresh function
  const handleManualRefresh = () => {
    if (userAddress) {
      invalidateUserWagers()
      invalidateAllWagers()
    }
  }

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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your wagers and find new opponents.</p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>
      
      <div className="space-y-8">
        {/* Available Wagers to Accept - Show first for better UX */}
        <section>
          <h2 className="text-xl font-semibold mb-4">🎯 Available Wagers</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Open wagers from other players that you can accept
          </p>
          <AvailableWagersList userAddress={userAddress} />
        </section>

        {/* Your Wagers */}
        <section>
          <h2 className="text-xl font-semibold mb-4">📋 My Wagers</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wagers you've created or accepted
          </p>
          <WagersList userAddress={userAddress} />
        </section>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ClientOnly fallback={
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading dashboard...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <DashboardContent />
    </ClientOnly>
  )
}
