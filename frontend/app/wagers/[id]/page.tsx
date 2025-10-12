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
    expiresAt,
    creatorDeposited,
    opponentDeposited
  } = wagerData

  const tokenInfo = supportedTokens.find(t => t.address.toLowerCase() === token.toLowerCase())
  const formattedAmount = tokenInfo ? formatTokenAmount(amount, tokenInfo.decimals) : "0"
  
  // Check user role
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase()
  const isOpponent = userAddress?.toLowerCase() === opponent.toLowerCase()
  const canAccept = isOpponent && state === 0 // Opponent can accept when in Created state
  const canDeposit = isCreator && state === 0 // Creator can deposit in Created state
  
  // Token allowance and balance
  const { data: tokenBalance } = useTokenBalance(token as Address, userAddress)
  
  // For creator deposit approval, check allowance against wager contract
  // For opponent accept, also check allowance against wager contract (acceptWager deposits directly)
  const { data: tokenAllowance } = useTokenAllowance(token as Address, userAddress, wagerAddress)
  
  const needsApproval = useMemo(() => {
    if (!tokenAllowance || !tokenInfo) return true // Default to needs approval if we can't check
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
    if (!tokenInfo) return
    try {
      // Approve the wager contract to spend tokens (for both creator deposit and opponent accept)
      await approve(token as Address, wagerAddress, formattedAmount, tokenInfo.decimals)
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
              <p className="text-xs text-muted-foreground mt-1">Each player stakes this amount</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Total Prize Pool</Label>
              <p className="text-2xl font-bold">{(parseFloat(formattedAmount) * 2).toFixed(2)} {tokenInfo?.symbol}</p>
              <p className="text-xs text-muted-foreground mt-1">Winner takes all (minus 2% fee)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Creator</Label>
              <p className="text-sm font-mono truncate" title={creator}>{creator}</p>
              {creatorChessUsername && (
                <p className="text-sm text-muted-foreground">Chess.com: {creatorChessUsername}</p>
              )}
              {state === 0 && (
                <Badge variant={creatorDeposited ? "default" : "outline"} className="mt-1">
                  {creatorDeposited ? "✓ Deposited" : "⏳ Pending Deposit"}
                </Badge>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Opponent</Label>
              <p className="text-sm font-mono truncate" title={opponent}>{opponent}</p>
              {opponentChessUsername && (
                <p className="text-sm text-muted-foreground">Chess.com: {opponentChessUsername}</p>
              )}
              {state === 0 && (
                <Badge variant={opponentDeposited ? "default" : "outline"} className="mt-1">
                  {opponentDeposited ? "✓ Deposited" : "⏳ Pending Deposit"}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm">{new Date(Number(createdAt) * 1000).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Expires</Label>
              <p className="text-sm">{new Date(Number(expiresAt) * 1000).toLocaleString()}</p>
            </div>
          </div>

          {gameId && (
            <div>
              <Label className="text-sm font-medium">Chess.com Game ID</Label>
              <p className="text-sm font-mono">{gameId}</p>
              <a 
                href={`https://www.chess.com/game/live/${gameId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                View game on Chess.com →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {canAccept && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle>🎯 Accept This Wager</CardTitle>
            <p className="text-sm text-muted-foreground">
              You've been challenged! Enter your Chess.com username and deposit {formattedAmount} {tokenInfo?.symbol} to accept.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">📋 What happens next:</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Enter your Chess.com username</li>
                <li>Approve {tokenInfo?.symbol} tokens (one-time)</li>
                <li>Deposit your stake ({formattedAmount} {tokenInfo?.symbol})</li>
                <li>Play the game on Chess.com</li>
                <li>Winner gets {(parseFloat(formattedAmount) * 2 * 0.98).toFixed(2)} {tokenInfo?.symbol}</li>
              </ol>
            </div>
            
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
                  {isApproving || isConfirmingApprove ? "Approving..." : `Step 1: Approve ${tokenInfo?.symbol}`}
                </Button>
              ) : (
                <Button 
                  onClick={handleAcceptWager}
                  disabled={isAccepting || isConfirmingAccept || !opponentUsername.trim()}
                  className="flex-1"
                >
                  {isAccepting || isConfirmingAccept ? "Accepting..." : `Step 2: Accept & Deposit ${formattedAmount} ${tokenInfo?.symbol}`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isCreator && state === 0 && !creatorDeposited && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle>💰 Fund Your Wager</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deposit your stake to activate this wager. The opponent can only accept after you deposit.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">ℹ️ Important:</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                <li>You must deposit first before opponent can accept</li>
                <li>Wager expires in 24 hours if not fully funded</li>
                <li>You can cancel and get refund if opponent doesn't accept</li>
              </ul>
            </div>
            
            {needsApproval ? (
              <Button 
                onClick={handleApprove}
                disabled={isApproving || isConfirmingApprove}
                className="w-full"
              >
                {isApproving || isConfirmingApprove ? "Approving..." : `Step 1: Approve ${tokenInfo?.symbol}`}
              </Button>
            ) : (
              <Button 
                onClick={handleDeposit}
                disabled={isDepositing || isConfirmingDeposit}
                className="w-full"
              >
                {isDepositing || isConfirmingDeposit ? "Depositing..." : `Step 2: Deposit ${formattedAmount} ${tokenInfo?.symbol}`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {isCreator && state === 0 && creatorDeposited && !opponentDeposited && (
        <Card>
          <CardHeader>
            <CardTitle>⏳ Waiting for Opponent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You've deposited your stake. Share this page URL with your opponent so they can accept the wager!
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-mono break-all">{window.location.href}</p>
            </div>
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
