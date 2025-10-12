"use client"

import { useMemo, useState } from "react"
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
  useContractAddresses 
} from "@/lib/hooks"
import { generateReclaimProof } from "@/lib/api"

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

  // Get selected token info
  const selectedToken = supportedTokens.find(token => token.address === selectedTokenAddress)
  
  // Contract hooks
  const { createWager, isPending: isCreating, isConfirming: isConfirmingCreate, isSuccess: isCreateSuccess, error: createError } = useCreateWager()
  const { approve, isPending: isApproving, isConfirming: isConfirmingApprove, isSuccess: isApproveSuccess } = useApproveToken()
  
  // Token balance and allowance
  const { data: tokenBalance } = useTokenBalance(
    selectedToken?.address as Address, 
    userAddress
  )
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

  const handleApprove = async () => {
    if (!selectedToken || !wagerFactory) return
    
    try {
      await approve(
        selectedToken.address as Address,
        wagerFactory,
        amount,
        selectedToken.decimals
      )
    } catch (error) {
      toast({
        title: "Approval failed",
        description: "Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleCreate = async () => {
    if (!canSubmit || !selectedToken) return
    
    try {
      await createWager(
        opponent as Address,
        selectedToken.address as Address,
        amount,
        selectedToken.decimals,
        creatorChessUsername
      )
      
      toast({
        title: "Wager created!",
        description: `Wager created for ${amount} ${selectedToken.symbol}. Transaction confirming...`,
      })
    } catch (error: any) {
      toast({
        title: "Wager creation failed",
        description: error?.message || "Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle successful wager creation
  useMemo(() => {
    if (isCreateSuccess) {
      toast({
        title: "Wager confirmed!",
        description: "Your wager has been created on-chain. Redirecting to dashboard...",
      })
      // Redirect immediately when transaction is confirmed
      router.push('/dashboard')
    }
  }, [isCreateSuccess, router])

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

        <div className="grid gap-2 md:grid-cols-2">
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
          <div className="grid gap-2">
            <Label className="sr-only">Actions</Label>
            <div className="flex items-end gap-2">
              <Button 
                variant="secondary" 
                onClick={handleGenerateProof} 
                disabled={generatingProof || !creatorChessUsername.trim()}
              >
                {generatingProof ? "Generating proof..." : "Generate Reclaim proof"}
              </Button>
              
              {needsApproval ? (
                <Button 
                  onClick={handleApprove} 
                  disabled={isApproving || isConfirmingApprove || !selectedToken}
                >
                  {isApproving || isConfirmingApprove ? "Approving..." : `Approve ${selectedToken?.symbol}`}
                </Button>
              ) : (
                <Button 
                  onClick={handleCreate} 
                  disabled={!canSubmit || isCreating || isConfirmingCreate}
                >
                  {isCreating || isConfirmingCreate ? "Creating..." : "Create wager"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {createError && (
          <div className="text-sm text-destructive">
            Error: {createError.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

