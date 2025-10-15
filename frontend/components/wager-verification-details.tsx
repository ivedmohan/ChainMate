"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useChainId } from "wagmi"
import { useTransactionPopup } from "@blockscout/app-sdk"
import { ExternalLink, Shield, CheckCircle, Clock } from "lucide-react"
import type { Address } from "viem"

interface WagerVerificationDetailsProps {
  wagerAddress: Address
  wagerData: any
}

export function WagerVerificationDetails({ wagerAddress, wagerData }: WagerVerificationDetailsProps) {
  const chainId = useChainId()
  const { openPopup } = useTransactionPopup()

  const showTransactionHistory = () => {
    openPopup({
      chainId: chainId.toString(),
      address: wagerAddress
    })
  }

  const getExplorerUrl = (address: string) => {
    const explorers = {
      84532: 'https://base-sepolia.blockscout.com',
      421614: 'https://sepolia.arbiscan.io',
    } as const
    
    const baseUrl = explorers[chainId as keyof typeof explorers] || 'https://etherscan.io'
    return `${baseUrl}/address/${address}`
  }

  const getVerificationStatus = () => {
    if (wagerData.state === 0) return { status: 'Pending', icon: Clock, color: 'text-yellow-500' }
    if (wagerData.state === 1) return { status: 'Funded', icon: CheckCircle, color: 'text-blue-500' }
    if (wagerData.state === 2) return { status: 'Game Linked', icon: Shield, color: 'text-purple-500' }
    if (wagerData.state === 3) return { status: 'Verified', icon: CheckCircle, color: 'text-green-500' }
    if (wagerData.state === 4) return { status: 'Settled', icon: CheckCircle, color: 'text-gray-500' }
    return { status: 'Unknown', icon: Clock, color: 'text-gray-500' }
  }

  const verification = getVerificationStatus()
  const StatusIcon = verification.icon

  return (
    <div className="space-y-4">
      {/* Transaction History Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📊 Transaction History
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={showTransactionHistory}
              size="sm"
            >
              View All Transactions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            View all transactions related to this wager on Blockscout explorer. Track deposits, accepts, game links, and settlements in real-time.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Powered by Blockscout SDK
            </Badge>
            <Badge variant="outline" className="text-xs">
              Real-time Updates
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ZK Proof & Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Zero-Knowledge Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verification Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${verification.color}`} />
              <div>
                <p className="text-sm font-medium">Verification Status</p>
                <p className="text-xs text-muted-foreground">Current wager state</p>
              </div>
            </div>
            <Badge variant="outline">{verification.status}</Badge>
          </div>

          {/* Contract Addresses */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Smart Contract Details</p>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">Wager Contract:</span>
                <a 
                  href={getExplorerUrl(wagerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-500 hover:underline font-mono"
                >
                  {wagerAddress.slice(0, 6)}...{wagerAddress.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {wagerData.gameId && (
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Chess.com Game:</span>
                  <a 
                    href={`https://www.chess.com/game/live/${wagerData.gameId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    {wagerData.gameId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Verification Process */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Verification Process</p>
            <div className="space-y-2">
              <VerificationStep 
                completed={wagerData.state >= 0}
                current={wagerData.state === 0}
                title="Wager Created"
                description="Smart contract deployed and initialized"
              />
              <VerificationStep 
                completed={wagerData.state >= 1}
                current={wagerData.state === 1}
                title="Funds Deposited"
                description="Both players have deposited their stakes"
              />
              <VerificationStep 
                completed={wagerData.state >= 2}
                current={wagerData.state === 2}
                title="Game Linked"
                description="Chess.com game ID linked to wager"
              />
              <VerificationStep 
                completed={wagerData.state >= 3}
                current={wagerData.state === 3}
                title="ZK Proof Verified"
                description="Reclaim Protocol verified game outcome"
              />
              <VerificationStep 
                completed={wagerData.state >= 4}
                current={wagerData.state === 4}
                title="Settled"
                description="Funds distributed to winner"
              />
            </div>
          </div>

          {/* ZK Proof Info */}
          {wagerData.state >= 3 && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Zero-Knowledge Proof Verified ✓
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Game outcome verified using Reclaim Protocol zkTLS. The proof confirms the Chess.com game result without revealing private session data.
                  </p>
                  {wagerData.winner && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      Winner: {wagerData.winner === '0x0000000000000000000000000000000000000000' ? 'Draw' : `${wagerData.winner.slice(0, 6)}...${wagerData.winner.slice(-4)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pending Verification */}
          {wagerData.state === 2 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Awaiting Verification
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Backend service is monitoring this wager. Once the Chess.com game is complete, a zero-knowledge proof will be automatically generated and verified on-chain.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function VerificationStep({ 
  completed, 
  current, 
  title, 
  description 
}: { 
  completed: boolean
  current: boolean
  title: string
  description: string
}) {
  return (
    <div className={`flex items-start gap-3 p-2 rounded ${current ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
      <div className="mt-0.5">
        {completed ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
