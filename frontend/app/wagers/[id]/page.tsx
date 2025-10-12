"use client"

import { useParams } from "next/navigation"
import { useAccount } from "wagmi"
import { useWagerData, useSupportedTokens, useTokenBalance, useTokenAllowance, useApproveToken, useDepositToWager, useAcceptWager, formatTokenAmount, useContractAddresses } from "@/lib/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { useState, useMemo } from "react"
import type { Address } from "viem"

const STATUS_COLORS = {
  open: "bg-blue-500",
  active: "bg-green-500", 
  settled: "bg-gray-500",
  canceled: "bg-red-500",
} as const

function WagerDetailContent({ wagerAddress }: { wagerAddress: Address }) {
  const { address: userAddress } = useAccount()
  const supportedTokens = useSupportedTokens()
  const { wagerFactory } = useContractAddresses()
  const { data: wagerData, isLoading, error } = useWagerData(wagerAddress)
  
  const [opponentUsername, setOpponentUsername] = useState("")
  
  // Contract interaction hooks
  const { approve, isPending: isApproving, isConfirming: isConfirmingApprove, isSuccess: isApproveSuccess } = useApproveToken()
  const { deposit, isPending: isDepositing, isConfirming: isConfirmingDeposit, isSuccess: isDepositSuccess } = useDepositToWager()
  const { acceptWager, isPending: isAccepting, isConfirming: isConfirmingAccept, isSuccess: isAcceptSuccess } = useAcceptWager()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !wagerData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Error loading wager data</p>
          <p className="text-sm text-red-500 mt-2">{error?.message}</p>
        </CardContent>
      </Card>
    )
  }

  // Parse wager data
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
    expiresAt
  } = wagerData

  const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === token.toLowerCase())
  const formattedAmount = tokenInfo ? formatTokenAmount(amount, tokenInfo.decimals) : "0"
  
  // Check user role
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase()
  const isOpponent = userAddress?.toLowerCase() === opponent.toLowerCase()
  const canAccept = !isCreator && !isOpponent && state === 0 // Created state
  const canDeposit = isCreator && state === 0 && !isOpponent // Creator can deposit when no opponent yet
  
  // Token allowance and balance
  const { data: tokenBalance } = useTokenBalance(token as Address, userAddress)
  const { data: tokenAllowance } = useTokenAllowance(token as Address, userAddress, wagerFactory)
  
  const needsApproval = useMemo(() => {
    if (!tokenAllowance || !tokenInfo) return false
    const amountWei = BigInt(Math.floor(parseFloat(formattedAmount) * Math.pow(10, tokenInfo.decimals)))
    return tokenAllowance < amountWei
  }, [tokenAllowance, formattedAmount, tokenInfo])

  const getStatusDisplay = (state: number) => {
    const statusMap = {
      0: { label: "Open", color: "bg-blue-500" },
      1: { label: "Funded", color: "bg-green-500" },
      2: { label: "Game Linked", color: "bg-yellow-500" },
      3: { label: "Completed", color: "bg-purple-500" },
      4: { label: "Settled", color: "bg-gray-500" },
      5: { label: "Cancelled", color: "bg-red-500" },
      6: { label: "Disputed", color: "bg-orange-500" },
    }
    return statusMap[state as keyof typeof statusMap] || { label: "Unknown", color: "bg-gray-400" }
  }

  const statusDisplay = getStatusDisplay(state)

  const handleApprove = async () => {
    if (!tokenInfo || !wagerFactory) return
    try {
      await approve(token as Address, wagerFactory, formattedAmount, tokenInfo.decimals)
      toast({ title: "Approval submitted", description: "Transaction is being processed..." })
    } catch (error: any) {
      toast({ title: "Approval failed", description: error?.message, variant: "destructive" })
    }
  }

  const handleAcceptWager = async () => {
    if (!opponentUsername.trim()) {
      toast({ title: "Username required", description: "Please enter your Chess.com username", variant: "destructive" })
      return
    }
    try {
      await acceptWager(wagerAddress, opponentUsername)
      toast({ title: "Wager accepted!", description: "Transaction is being processed..." })
    } catch (error: any) {
      toast({ title: "Accept failed", description: error?.message, variant: "destructive" })
    }
  }

  const handleDeposit = async () => {
    try {
      await deposit(wagerAddress)
      toast({ title: "Deposit submitted!", description: "Transaction is being processed..." })
    } catch (error: any) {
      toast({ title: "Deposit failed", description: error?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wager Details</CardTitle>
            <Badge className={statusDisplay.color}>{statusDisplay.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Stake Amount</Label>
              <p className="text-2xl font-bold">{formattedAmount} {tokenInfo?.symbol}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Creator</Label>
              <p className="text-sm font-mono">{creator}</p>
              {creatorChessUsername && (
                <p className="text-sm text-muted-foreground">Chess.com: {creatorChessUsername}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Opponent</Label>
              {opponent === "0x0000000000000000000000000000000000000000" ? (
                <p className="text-sm text-muted-foreground">Waiting for opponent...</p>
              ) : (
                <>
                  <p className="text-sm font-mono">{opponent}</p>
                  {opponentChessUsername && (
                    <p className="text-sm text-muted-foreground">Chess.com: {opponentChessUsername}</p>
                  )}
                </>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Expires</Label>
              <p className="text-sm">{new Date(Number(expiresAt) * 1000).toLocaleString()}</p>
            </div>
          </div>

          {gameId && (
            <div>
              <Label className="text-sm font-medium">Game ID</Label>
              <p className="text-sm font-mono">{gameId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canAccept && (
        <Card>
          <CardHeader>
            <CardTitle>Accept This Wager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="opponent-username">Your Chess.com Username</Label>
              <Input
                id="opponent-username"
                placeholder="e.g. your_username"
                value={opponentUsername}
                onChange={(e) => setOpponentUsername(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              {needsApproval ? (
                <Button 
                  onClick={handleApprove}
                  disabled={isApproving || isConfirmingApprove}
                  className="flex-1"
                >
                  {isApproving || isConfirmingApprove ? "Approving..." : `Approve ${tokenInfo?.symbol}`}
                </Button>
              ) : (
                <Button 
                  onClick={handleAcceptWager}
                  disabled={isAccepting || isConfirmingAccept || !opponentUsername.trim()}
                  className="flex-1"
                >
                  {isAccepting || isConfirmingAccept ? "Accepting..." : `Accept Wager (${formattedAmount} ${tokenInfo?.symbol})`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isCreator && state === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fund Your Wager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You need to deposit your stake to activate this wager.
            </p>
            <Button 
              onClick={handleDeposit}
              disabled={isDepositing || isConfirmingDeposit}
              className="w-full"
            >
              {isDepositing || isConfirmingDeposit ? "Depositing..." : `Deposit ${formattedAmount} ${tokenInfo?.symbol}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function WagerDetailPage() {
  const params = useParams()
  const wagerAddress = params.id as string
  const { isConnected } = useAccount()

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please connect your wallet to view this wager.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!wagerAddress || !wagerAddress.startsWith('0x')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Invalid wager address.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <WagerDetailContent wagerAddress={wagerAddress as Address} />
    </div>
  )
}
