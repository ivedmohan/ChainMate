"use client"

import { useParams } from "next/navigation"
import { useAccount, useChainId } from "wagmi"
import { useWagerData, useSupportedTokens, useTokenBalance, useTokenAllowance, useApproveToken, useDepositToWager, useAcceptWager, useLinkGame, useSettleWager, formatTokenAmount, useContractAddresses } from "@/lib/hooks"
import { useCrossChainAccept } from "@/hooks/use-cross-chain-accept"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { RefreshButton } from "@/components/refresh-button"
import { useState, useMemo, useEffect } from "react"
import type { Address } from "viem"
import { ClientOnly } from "@/components/client-only"
import { WagerVerificationDetails } from "@/components/wager-verification-details"
import { useTransactionPopup } from "@blockscout/app-sdk"

const STATUS_COLORS = {
  open: "bg-blue-500",
  active: "bg-green-500", 
  settled: "bg-gray-500",
  canceled: "bg-red-500",
} as const

function WagerDetailContent({ wagerAddress }: { wagerAddress: Address }) {
  const { address: userAddress } = useAccount()
  const userChainId = useChainId()
  const supportedTokens = useSupportedTokens()
  const { wagerFactory } = useContractAddresses()
  const { data: wagerData, isLoading, error } = useWagerData(wagerAddress)
  const { openPopup } = useTransactionPopup()
  
  const [opponentUsername, setOpponentUsername] = useState("")
  const [gameId, setGameId] = useState("")
  
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - BEFORE ANY RETURNS
  const { approve, isPending: isApproving, isConfirming: isConfirmingApprove, isSuccess: isApproveSuccess } = useApproveToken()
  const { deposit, isPending: isDepositing, isConfirming: isConfirmingDeposit, isSuccess: isDepositSuccess } = useDepositToWager()
  const { acceptWager, isPending: isAccepting, isConfirming: isConfirmingAccept, isSuccess: isAcceptSuccess } = useAcceptWager()
  const { linkGame, isPending: isLinking, isConfirming: isConfirmingLink, isSuccess: isLinkSuccess } = useLinkGame()
  const { settle, isPending: isSettling, isConfirming: isConfirmingSettle, isSuccess: isSettleSuccess } = useSettleWager()

  // Cross-chain accept hook
  const {
    acceptCrossChain,
    isLoading: isCrossChainLoading,
    isBridging,
    isSuccess: isCrossChainSuccess,
    needsCrossChain,
    getChainName
  } = useCrossChainAccept()

  // Token hooks - Pass undefined when wagerData is not loaded yet
  const { data: tokenBalance } = useTokenBalance(
    wagerData?.token as Address | undefined,
    userAddress
  )
  const { data: tokenAllowance } = useTokenAllowance(
    wagerData?.token as Address | undefined,
    userAddress,
    wagerAddress
  )

  // Memoized calculations - MUST be after all hooks
  const tokenInfo = useMemo(() => {
    if (!wagerData || !supportedTokens.length) return null
    return supportedTokens.find(t => t.address.toLowerCase() === wagerData.token.toLowerCase())
  }, [wagerData, supportedTokens])

  const formattedAmount = useMemo(() => {
    if (!wagerData || !tokenInfo) return "0"
    return formatTokenAmount(wagerData.amount, tokenInfo.decimals)
  }, [wagerData, tokenInfo])

  const needsApproval = useMemo(() => {
    if (!tokenAllowance || !tokenInfo || !formattedAmount) return true
    const amountWei = BigInt(Math.floor(parseFloat(formattedAmount) * Math.pow(10, tokenInfo.decimals)))
    return tokenAllowance < amountWei
  }, [tokenAllowance, formattedAmount, tokenInfo])

  // Check if user has insufficient balance on current chain
  // If they do, offer cross-chain accept option
  const hasInsufficientBalance = useMemo(() => {
    // tokenBalance can be 0 (which is falsy), so check for undefined/null explicitly
    if (tokenBalance === undefined || tokenBalance === null || !tokenInfo || !formattedAmount) {
      console.log('🔍 Balance check - missing data:', {
        tokenBalance: tokenBalance?.toString(),
        tokenInfo: !!tokenInfo,
        formattedAmount
      })
      return false
    }
    const amountWei = BigInt(Math.floor(parseFloat(formattedAmount) * Math.pow(10, tokenInfo.decimals)))
    const insufficient = tokenBalance < amountWei
    console.log('🔍 Balance check:', {
      tokenBalance: tokenBalance.toString(),
      amountWei: amountWei.toString(),
      insufficient,
      formattedAmount,
      decimals: tokenInfo.decimals
    })
    return insufficient
  }, [tokenBalance, formattedAmount, tokenInfo])

  // Wager is on current chain (since we can read it)
  // But user might have funds on another chain
  const wagerChainId = userChainId

  // Show cross-chain option if user has insufficient balance
  // This means they likely have funds on another chain
  const isCrossChainAccept = useMemo(() => {
    return hasInsufficientBalance
  }, [hasInsufficientBalance])

  // Show success toasts (cache invalidation is now handled in hooks)
  useEffect(() => {
    if (isDepositSuccess) {
      toast({
        title: "✅ Deposit successful!",
        description: "Your stake has been deposited. Waiting for opponent..."
      })
    }
  }, [isDepositSuccess])

  useEffect(() => {
    if (isAcceptSuccess) {
      toast({
        title: "✅ Wager accepted!",
        description: "You've successfully joined the wager. The game is now funded!"
      })
    }
  }, [isAcceptSuccess])

  useEffect(() => {
    if (isApproveSuccess) {
      toast({
        title: "✅ Approval successful!",
        description: "Now you can proceed with the deposit."
      })
    }
  }, [isApproveSuccess])

  useEffect(() => {
    if (isLinkSuccess) {
      toast({
        title: "✅ Game linked!",
        description: "Game has been linked to the wager. Waiting for game completion..."
      })
    }
  }, [isLinkSuccess])

  useEffect(() => {
    if (isSettleSuccess) {
      toast({
        title: "✅ Wager settled!",
        description: "Funds have been distributed. Check your wallet!"
      })
    }
  }, [isSettleSuccess])

  useEffect(() => {
    if (isCrossChainSuccess) {
      toast({
        title: "✅ Cross-chain accept successful!",
        description: "Tokens bridged and wager accepted! The game is now funded!"
      })
    }
  }, [isCrossChainSuccess])

  // Show loading state
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

  // Show error state - might be wrong chain!
  if (error) {
    // Check if error is because contract doesn't exist on this chain
    const isWrongChain = error?.message?.includes('returned no data') ||
      error?.message?.includes('does not have the function')

    if (isWrongChain) {
      // Wager is on a different chain
      const possibleChains = [
        { id: 84532, name: 'Base Sepolia' },
        { id: 421614, name: 'Arbitrum Sepolia' }
      ]

      return (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>🌉 Cross-Chain Wager Detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">This wager is on a different chain!</p>
              <p className="text-xs text-muted-foreground mb-4">
                You're currently on <strong>{getChainName(userChainId)}</strong>, but this wager was created on a different chain.
              </p>
              <p className="text-xs text-muted-foreground">
                To view or accept this wager, please switch to one of these chains:
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {possibleChains.filter(c => c.id !== userChainId).map(chain => (
                  <li key={chain.id}>• {chain.name}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              💡 Tip: Once you switch chains, you can accept this wager. If it's on a different chain than your funds, Avail Nexus will handle the cross-chain bridging automatically!
            </p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Error loading wager data</p>
          <p className="text-sm text-red-500 mt-2">{error?.message}</p>
        </CardContent>
      </Card>
    )
  }

  // Parse wager data - only if data exists
  if (!wagerData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No wager data available</p>
        </CardContent>
      </Card>
    )
  }

  const {
    creator,
    opponent,
    token,
    amount,
    creatorChessUsername,
    opponentChessUsername,
    gameId: linkedGameId,
    state,
    winner,
    createdAt,
    expiresAt,
    creatorDeposited,
    opponentDeposited
  } = wagerData
  
  // Check user role
  const isCreator = userAddress?.toLowerCase() === creator.toLowerCase()
  const isOpponent = userAddress?.toLowerCase() === opponent.toLowerCase()
  const isParticipant = isCreator || isOpponent
  const canAccept = isOpponent && state === 0 // Opponent can accept when in Created state
  const canDeposit = isCreator && state === 0 // Creator can deposit in Created state
  const canLinkGame = isParticipant && state === 1 && !linkedGameId // Can link when funded
  const canSettle = state === 3 // Can settle when completed

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

  const handleCrossChainAccept = async () => {
    if (!opponentUsername.trim()) {
      toast({ title: "Username required", description: "Please enter your Chess.com username", variant: "destructive" })
      return
    }
    if (!tokenInfo) return

    try {
      toast({
        title: "Starting cross-chain accept...",
        description: `Bridging ${formattedAmount} ${tokenInfo.symbol} and accepting wager`
      })

      await acceptCrossChain(
        wagerAddress,
        wagerChainId,
        tokenInfo.symbol as 'USDC' | 'USDT',
        formattedAmount,
        tokenInfo.decimals,
        opponentUsername
      )
    } catch (error: any) {
      toast({
        title: "Cross-chain accept failed",
        description: error?.message || "Please try again",
        variant: "destructive"
      })
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

  const handleLinkGame = async () => {
    if (!gameId.trim()) {
      toast({ title: "Game ID required", description: "Please enter the Chess.com game ID", variant: "destructive" })
      return
    }
    try {
      await linkGame(wagerAddress, gameId)
      toast({ title: "Linking game...", description: "Transaction is being processed..." })
    } catch (error: any) {
      toast({ title: "Link failed", description: error?.message, variant: "destructive" })
    }
  }

  const handleSettle = async () => {
    try {
      await settle(wagerAddress)
      toast({ title: "Settling wager...", description: "Transaction is being processed..." })
    } catch (error: any) {
      toast({ title: "Settlement failed", description: error?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wager Details</CardTitle>
            <div className="flex items-center gap-2">
              <RefreshButton scope="current" wagerAddress={wagerAddress} />
            <Badge className={statusDisplay.color}>{statusDisplay.label}</Badge>
            </div>
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

          {linkedGameId && (
            <div>
              <Label className="text-sm font-medium">Chess.com Game ID</Label>
              <p className="text-sm font-mono">{linkedGameId}</p>
              <a
                href={`https://www.chess.com/game/live/${linkedGameId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                View game on Chess.com →
              </a>
            </div>
          )}

          {winner && winner !== "0x0000000000000000000000000000000000000000" && (
            <div>
              <Label className="text-sm font-medium">Winner 🏆</Label>
              <p className="text-sm font-mono truncate" title={winner}>{winner}</p>
              {winner.toLowerCase() === userAddress?.toLowerCase() && (
                <Badge className="bg-green-500 mt-1">You won! 🎉</Badge>
              )}
            </div>
          )}

          {winner === "0x0000000000000000000000000000000000000000" && state === 3 && (
            <div>
              <Label className="text-sm font-medium">Result</Label>
              <Badge variant="outline">Draw 🤝</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History & ZK Verification */}
      <WagerVerificationDetails wagerAddress={wagerAddress} wagerData={wagerData} />

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
            {isCrossChainAccept ? (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium">
                  Cross-Chain Accept Available
                </p>
                <p className="text-xs text-muted-foreground">
                  You don't have enough {tokenInfo?.symbol} on {getChainName(userChainId)}. Using Avail Nexus, you can bridge from another chain and accept in one transaction.
                </p>
                <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground mt-2">
                  <li>Enter your Chess.com username</li>
                  <li>Click "Bridge & Accept" below</li>
                  <li>Avail Nexus will automatically find and bridge your {tokenInfo?.symbol}</li>
                  <li>Wager will be accepted in one transaction</li>
                </ol>
              </div>
            ) : (
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
            )}

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
              {isCrossChainAccept ? (
                <Button
                  onClick={handleCrossChainAccept}
                  disabled={isCrossChainLoading || !opponentUsername.trim()}
                  className="flex-1"
                >
                  {isBridging ? (
                    <>Bridging {formattedAmount} {tokenInfo?.symbol}...</>
                  ) : isCrossChainLoading ? (
                    <>Processing...</>
                  ) : (
                    <>Bridge & Accept</>
                  )}
                </Button>
              ) : (
                <>
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
                </>
              )}
            </div>

            {isCrossChainAccept && (
              <p className="text-xs text-center text-muted-foreground">
                Powered by Avail Nexus • Estimated time: 2-5 minutes
              </p>
            )}
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
              <p className="text-xs font-mono break-all">
                {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Game Section - State: Funded (1) */}
      {canLinkGame && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle>♟️ Link Your Chess.com Game</CardTitle>
            <p className="text-sm text-muted-foreground">
              Both players have deposited! Now play your game on Chess.com and link it here.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">📋 How to link your game:</p>
              <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Go to <a href="https://www.chess.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Chess.com</a></li>
                <li>Play a game between {creatorChessUsername} and {opponentChessUsername}</li>
                <li>Copy the game ID from the URL (e.g., 123456789)</li>
                <li>Paste it below and link</li>
                <li>After the game finishes, Reclaim will verify the result</li>
              </ol>
            </div>

            <div>
              <Label htmlFor="game-id">Chess.com Game ID</Label>
              <Input
                id="game-id"
                placeholder="e.g. 123456789"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find this in your Chess.com game URL: chess.com/game/live/<strong>[ID]</strong>
              </p>
            </div>

            <Button 
              onClick={handleLinkGame}
              disabled={isLinking || isConfirmingLink || !gameId.trim()}
              className="w-full"
            >
              {isLinking || isConfirmingLink ? "Linking..." : "🔗 Link Game"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Waiting for Game - State: GameLinked (2) */}
      {isParticipant && state === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>⏳ Game In Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Game has been linked! Complete your game on Chess.com. After the game finishes, Reclaim Protocol will automatically verify the result.
            </p>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">ℹ️ What happens next:</p>
              <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                <li>Finish your chess game on Chess.com</li>
                <li>Reclaim Protocol will verify the outcome</li>
                <li>Winner (or both players if draw) can settle the wager</li>
                <li>Funds will be distributed automatically</li>
              </ul>
            </div>
            {linkedGameId && (
              <a
                href={`https://www.chess.com/game/live/${linkedGameId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center"
              >
                <Button variant="outline" className="w-full">
                  View Game on Chess.com →
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settle Wager - State: Completed (3) */}
      {canSettle && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle>🎉 Game Completed - Settle Wager</CardTitle>
            <p className="text-sm text-muted-foreground">
              The game result has been verified! Click below to settle and distribute funds.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              {winner === "0x0000000000000000000000000000000000000000" ? (
                <>
                  <p className="text-sm font-medium mb-2">🤝 Draw - Refund Stakes</p>
                  <p className="text-xs text-muted-foreground">
                    Each player will receive 99% of their stake back ({(parseFloat(formattedAmount) * 0.99).toFixed(2)} {tokenInfo?.symbol}).
                    Platform fee: 1% each.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">🏆 Winner Takes All</p>
                  <p className="text-xs text-muted-foreground">
                    Winner receives: {(parseFloat(formattedAmount) * 2 * 0.98).toFixed(2)} {tokenInfo?.symbol} (98% of pot)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Platform fee: {(parseFloat(formattedAmount) * 2 * 0.02).toFixed(2)} {tokenInfo?.symbol} (2%)
                  </p>
                </>
              )}
            </div>

            <Button
              onClick={handleSettle}
              disabled={isSettling || isConfirmingSettle}
              className="w-full"
              size="lg"
            >
              {isSettling || isConfirmingSettle ? "Settling..." : "💰 Settle & Claim Funds"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Settled - State: Settled (4) */}
      {state === 4 && (
        <Card className="border-gray-500">
          <CardHeader>
            <CardTitle>✅ Wager Settled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This wager has been settled and funds have been distributed. Thank you for using P2P Chess!
            </p>
            {winner && winner !== "0x0000000000000000000000000000000000000000" && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm font-medium">🏆 Winner</p>
                <p className="text-xs font-mono mt-1">{winner}</p>
                {winner.toLowerCase() === userAddress?.toLowerCase() && (
                  <Badge className="bg-green-500 mt-2">Congratulations! 🎉</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WagerDetailPageContent() {
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

export default function WagerDetailPage() {
  return (
    <ClientOnly fallback={
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Loading wager details...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <WagerDetailPageContent />
    </ClientOnly>
  )
}
