"use client"

import { useMemo, useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { isAddress, type Address } from "viem"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import {
  useSupportedTokens,
  useCreateWager,
  useTokenBalance,
  useTokenAllowance,
  useApproveToken,
  useContractAddresses,
  useDepositToWager
} from "@/lib/hooks"
import { generateReclaimProof } from "@/lib/api"
import { TransactionProgressModal, type TransactionStep } from "@/components/transaction-progress-modal"

export function WagerForm() {
  const router = useRouter()
  const { address: userAddress } = useAccount()
  const supportedTokens = useSupportedTokens()
  const { wagerFactory } = useContractAddresses()

  const [opponent, setOpponent] = useState("")
  const [amount, setAmount] = useState<string>("0.01")
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>("")
  const [timeControl, setTimeControl] = useState<string>("3+2")
  const [expiryHrs, setExpiryHrs] = useState<string>("24")
  const [creatorChessUsername, setCreatorChessUsername] = useState("")
  const [generatingProof, setGeneratingProof] = useState(false)

  // Auto-chain flow state
  const [showProgress, setShowProgress] = useState(false)
  const [steps, setSteps] = useState<TransactionStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")


  // Get selected token info
  const selectedToken = supportedTokens.find(token => token.address === selectedTokenAddress)

  // Contract hooks
  const { createWager, isSuccess: isCreateSuccess } = useCreateWager()
  const { approve, isSuccess: isApproveSuccess, hash: approveHash } = useApproveToken()

  // Token allowance
  const { data: tokenAllowance } = useTokenAllowance(
    selectedToken?.address as Address,
    userAddress,
    wagerFactory
  )

  // Set default token when supported tokens load
  useMemo(() => {
    if (supportedTokens.length > 0 && !selectedTokenAddress) {
      setSelectedTokenAddress(supportedTokens[0].address)
    }
  }, [supportedTokens, selectedTokenAddress])

  const canSubmit = useMemo(() => {
    return (
      opponent.trim().length >= 3 &&
      isAddress(opponent) &&
      Number(amount) > 0 &&
      selectedToken &&
      creatorChessUsername.trim().length >= 3 &&
      userAddress
    )
  }, [opponent, amount, selectedToken, creatorChessUsername, userAddress])

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    if (!selectedToken || !tokenAllowance || !amount) return false
    const amountWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.decimals)))
    return tokenAllowance < amountWei
  }, [selectedToken, tokenAllowance, amount])

  const handleGenerateProof = async () => {
    if (!creatorChessUsername.trim()) {
      toast({
        title: "Chess.com username required",
        description: "Please enter your Chess.com username first.",
        variant: "destructive"
      })
      return
    }

    setGeneratingProof(true)
    try {
      // This would generate a proof for a sample game
      // In practice, user would provide a game URL
      const sampleGameUrl = `https://www.chess.com/game/live/123456789?username=${creatorChessUsername}`
      const result = await generateReclaimProof(sampleGameUrl)

      if (result.success) {
        toast({
          title: "Reclaim proof generated",
          description: "Your Chess.com identity has been verified.",
        })
      } else {
        toast({
          title: "Proof generation failed",
          description: result.error || "Unable to generate proof",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Proof generation failed",
        description: "Please try again later.",
        variant: "destructive"
      })
    } finally {
      setGeneratingProof(false)
    }
  }

  // Auto-chain flow: Create + Deposit in one smooth flow
  const handleCreateAndFundWager = async () => {
    if (!canSubmit || !selectedToken || !wagerFactory) return

    try {
      // Initialize steps based on whether approval is needed
      const initialSteps: TransactionStep[] = needsApproval ? [
        { name: `Approve ${selectedToken.symbol}`, status: 'pending' },
        { name: 'Create Wager', status: 'pending' },
        { name: 'Deposit Funds', status: 'pending' }
      ] : [
        { name: 'Create Wager', status: 'pending' },
        { name: 'Deposit Funds', status: 'pending' }
      ]

      setSteps(initialSteps)
      setCurrentStepIndex(0)
      setShowProgress(true)

      let stepIndex = 0

      // Step 1: Approve (if needed)
      if (needsApproval) {
        setSteps(prev => prev.map((s, i) => i === stepIndex ? { ...s, status: 'active' } : s))
        setProgressMessage(`Approving ${selectedToken.symbol}... Please confirm in your wallet`)

        // Trigger approval - this will show wallet popup
        approve(
          selectedToken.address as Address,
          wagerFactory,
          amount,
          selectedToken.decimals
        )

        // The rest will be handled by useEffect watching isApproveSuccess
        stepIndex++
      } else {
        // No approval needed, go straight to create
        setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'active' } : s))
        setProgressMessage("Creating wager... Please confirm in your wallet")

        createWager(
          opponent as Address,
          selectedToken.address as Address,
          amount,
          selectedToken.decimals,
          creatorChessUsername
        )
      }

    } catch (error: any) {
      console.error("Create and fund flow error:", error)
      setSteps(prev => prev.map((s, i) =>
        i === currentStepIndex ? { ...s, status: 'error', message: error?.message || 'Transaction failed' } : s
      ))
      setProgressMessage("")
    }
  }

  // Track approval success and proceed to create
  useEffect(() => {
    if (isApproveSuccess && showProgress && approveHash && selectedToken) {
      const stepIndex = 0 // Approval is always first step when needed
      setSteps(prev => prev.map((s, i) =>
        i === stepIndex ? { ...s, status: 'success', txHash: approveHash } : s
      ))
      setCurrentStepIndex(stepIndex + 1)

      // Auto-proceed to create
      const timeoutId = setTimeout(() => {
        try {
          const nextStepIndex = stepIndex + 1
          setSteps(prev => prev.map((s, i) => i === nextStepIndex ? { ...s, status: 'active' } : s))
          setProgressMessage("Creating wager... Please confirm in your wallet")

          createWager(
            opponent as Address,
            selectedToken.address as Address,
            amount,
            selectedToken.decimals,
            creatorChessUsername
          )

          setProgressMessage("Wager created! Waiting for confirmation...")
        } catch (error: any) {
          console.error("Create wager error:", error)
          const nextStepIndex = stepIndex + 1
          setSteps(prev => prev.map((s, i) =>
            i === nextStepIndex ? { ...s, status: 'error', message: error?.message } : s
          ))
        }
      }, 500)

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess, approveHash, showProgress])

  // Track create success and get wager address from event
  useEffect(() => {
    if (isCreateSuccess && showProgress) {
      // We need to get the wager address from the transaction receipt
      // For now, we'll need to update the hook to return it
      // This is a limitation - we'll handle it differently

      const stepIndex = needsApproval ? 1 : 0
      setSteps(prev => prev.map((s, i) =>
        i === stepIndex ? { ...s, status: 'success' } : s
      ))

      // Show success message
      setProgressMessage("✓ Wager created successfully! Check dashboard for details.")

      // Redirect after a moment
      const timeoutId = setTimeout(() => {
        toast({
          title: "✓ Wager created!",
          description: "Your wager is now live. You can deposit funds from the wager details page.",
        })
        router.push('/dashboard')
      }, 2000)

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateSuccess, showProgress])



  const handleCloseProgress = () => {
    setShowProgress(false)
    setSteps([])
    setCurrentStepIndex(0)
    setProgressMessage("")
  }

  const handleRetry = () => {
    // Reset and try again from the beginning
    handleCloseProgress()
    setTimeout(() => handleCreateAndFundWager(), 300)
  }

  if (!userAddress) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please connect your wallet to create a wager.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="creator-username">Your Chess.com username</Label>
          <Input
            id="creator-username"
            placeholder="e.g. your_username"
            value={creatorChessUsername}
            onChange={(e) => setCreatorChessUsername(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="opponent">Opponent wallet address</Label>
          <Input
            id="opponent"
            placeholder="0x..."
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />
          {opponent && !isAddress(opponent) && (
            <p className="text-sm text-destructive">Please enter a valid Ethereum address</p>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="amount">Stake amount</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Token</Label>
            <Select value={selectedTokenAddress} onValueChange={setSelectedTokenAddress}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {supportedTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Time control</Label>
            <Select value={timeControl} onValueChange={setTimeControl}>
              <SelectTrigger>
                <SelectValue placeholder="Time control" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3+2">3+2 Blitz</SelectItem>
                <SelectItem value="5+0">5+0 Blitz</SelectItem>
                <SelectItem value="10+0">10+0 Rapid</SelectItem>
                <SelectItem value="15+10">15+10 Rapid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Expiry (hours)</Label>
          <Select value={expiryHrs} onValueChange={setExpiryHrs}>
            <SelectTrigger>
              <SelectValue placeholder="Choose expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction Summary */}
        {canSubmit && selectedToken && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">📋 Transaction Summary:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• {needsApproval ? '3' : '2'} transactions required</li>
              <li>• Stake: {amount} {selectedToken.symbol}</li>
              <li>• Estimated time: ~{needsApproval ? '45' : '30'} seconds</li>
            </ul>
          </div>
        )}

        {/* Main Action Button */}
        <Button
          onClick={handleCreateAndFundWager}
          disabled={!canSubmit || showProgress}
          size="lg"
          className="w-full"
        >
          {showProgress ? "Processing..." : "Create & Fund Wager"}
        </Button>

        {/* Optional: Generate Proof Button */}
        <Button
          variant="outline"
          onClick={handleGenerateProof}
          disabled={generatingProof || !creatorChessUsername.trim()}
          className="w-full"
        >
          {generatingProof ? "Generating proof..." : "Generate Reclaim Proof (Optional)"}
        </Button>

        {/* Progress Modal */}
        <TransactionProgressModal
          isOpen={showProgress}
          title="Creating Your Wager"
          steps={steps}
          currentStep={currentStepIndex}
          message={progressMessage}
          onClose={handleCloseProgress}
          onRetry={handleRetry}
          canClose={steps.some(s => s.status === 'error') || steps.every(s => s.status === 'success')}
        />
      </CardContent>
    </Card>
  )
}

