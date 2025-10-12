"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export function WagerForm() {
  const router = useRouter()
  const [opponent, setOpponent] = useState("")
  const [amount, setAmount] = useState<string>("0.01")
  const [token, setToken] = useState<string>("ETH")
  const [timeControl, setTimeControl] = useState<string>("3+2")
  const [expiryHrs, setExpiryHrs] = useState<string>("24")
  const [generatingProof, setGeneratingProof] = useState(false)

  const canSubmit = useMemo(() => {
    return opponent.trim().length >= 3 && Number(amount) > 0
  }, [opponent, amount])

  const handleGenerateProof = async () => {
    setGeneratingProof(true)
    await new Promise((res) => setTimeout(res, 900))
    setGeneratingProof(false)
    toast({
      title: "Proof ready (stub)",
      description: "Reclaim flow is simulated in this build.",
    })
  }

  const handleCreate = async () => {
    if (!canSubmit) return
    const id = Math.floor(Math.random() * 10000).toString()
    toast({
      title: "Wager created",
      description: `Wager #${id} created for ${amount} ${token}.`,
    })
    router.push(`/wagers/${id}`)
  }

  return (
    <Card>
      <CardContent className="p-6 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="opponent">Opponent (Chess.com username)</Label>
          <Input
            id="opponent"
            placeholder="e.g. hikaru"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />
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
            <Select value={token} onValueChange={setToken}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
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
              <Button variant="secondary" onClick={handleGenerateProof} disabled={generatingProof}>
                {generatingProof ? "Generating proof..." : "Generate Reclaim proof"}
              </Button>
              <Button onClick={handleCreate} disabled={!canSubmit}>
                Create wager
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
