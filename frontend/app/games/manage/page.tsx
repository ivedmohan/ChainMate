"use client"

import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useUserWagers, useWagerData, useSupportedTokens, formatTokenAmount } from "@/lib/hooks"
import { Trophy, Target, TrendingUp, DollarSign, Activity } from "lucide-react"
import { useMemo } from "react"
import type { Address } from "viem"
import Link from "next/link"

export default function UserStatsPage() {
  const { address: userAddress } = useAccount()
  const { data: wagerAddresses, isLoading } = useUserWagers(userAddress)

  if (!userAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please connect your wallet to view your stats.</p>
            <p className="text-sm text-muted-foreground">Track your wagering performance, earnings, and game history</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Stats</h1>
          <p className="text-muted-foreground">Track your wagering performance and earnings</p>
        </div>
        <Link href="/wagers/new">
          <Button>Create New Wager</Button>
        </Link>
      </div>

      <UserStatsContent 
        userAddress={userAddress} 
        wagerAddresses={wagerAddresses || []} 
      />
    </div>
  )
}

function UserStatsContent({ 
  userAddress, 
  wagerAddresses 
}: { 
  userAddress: Address
  wagerAddresses: readonly Address[]
}) {
  const supportedTokens = useSupportedTokens()
  
  // Fetch all wager data
  const wagerDataArray = wagerAddresses.map(address => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useWagerData(address)
    return { address, data }
  })

  // Calculate stats
  const stats = useMemo(() => {
    let totalWagered = 0
    let totalWon = 0
    let gamesWon = 0
    let gamesLost = 0
    let gamesDrawn = 0
    let activeWagers = 0
    const activeWagersList: any[] = []
    const completedGames: any[] = []

    wagerDataArray.forEach(({ data, address }) => {
      if (!data) return

      const isCreator = userAddress.toLowerCase() === data.creator.toLowerCase()
      const isOpponent = userAddress.toLowerCase() === data.opponent.toLowerCase()
      
      if (!isCreator && !isOpponent) return

      const tokenInfo = supportedTokens.find(t => 
        t.address.toLowerCase() === data.token.toLowerCase()
      )
      
      if (!tokenInfo) return

      const amount = parseFloat(formatTokenAmount(data.amount, tokenInfo.decimals))

      // Count active wagers (not settled or cancelled)
      if (data.state < 4) {
        activeWagers++
        activeWagersList.push({
          address,
          isCreator,
          amount: amount.toFixed(2),
          token: tokenInfo.symbol,
          state: data.state
        })
      }

      // Only count settled games
      if (data.state === 4) {
        totalWagered += amount

        const winner = data.winner.toLowerCase()
        const userWon = winner === userAddress.toLowerCase()
        const isDraw = winner === '0x0000000000000000000000000000000000000000'

        if (userWon) {
          gamesWon++
          const winnings = amount * 2 * 0.98 // 2% fee
          totalWon += winnings
          completedGames.push({
            won: true,
            draw: false,
            amount: amount.toFixed(2),
            winnings: winnings.toFixed(2),
            token: tokenInfo.symbol
          })
        } else if (isDraw) {
          gamesDrawn++
          const refund = amount * 0.99 // 1% fee on draw
          totalWon += refund
          completedGames.push({
            won: false,
            draw: true,
            amount: amount.toFixed(2),
            winnings: refund.toFixed(2),
            token: tokenInfo.symbol
          })
        } else {
          gamesLost++
          completedGames.push({
            won: false,
            draw: false,
            amount: amount.toFixed(2),
            winnings: '0.00',
            token: tokenInfo.symbol
          })
        }
      }
    })

    const totalGames = gamesWon + gamesLost + gamesDrawn
    const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0
    const netProfit = totalWon - totalWagered

    return {
      totalGames,
      totalWagered,
      totalWon,
      gamesWon,
      gamesLost,
      gamesDrawn,
      winRate,
      netProfit,
      activeWagers,
      activeWagersList,
      completedGames
    }
  }, [wagerDataArray, userAddress, supportedTokens])

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Wagered */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalWagered.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalGames} game{stats.totalGames !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Total Won */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Won</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${stats.totalWon.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.gamesWon} win{stats.gamesWon !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.gamesWon}W / {stats.gamesLost}L / {stats.gamesDrawn}D
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.netProfit >= 0 ? '+' : ''}${Math.abs(stats.netProfit).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.netProfit >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Wagers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Wagers</CardTitle>
            <Badge variant="outline">
              <Activity className="h-3 w-3 mr-1" />
              {stats.activeWagers} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {stats.activeWagers === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No active wagers. Create a new wager to get started!
              </p>
              <Link href="/wagers/new">
                <Button>Create Wager</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.activeWagersList.map((wager: any) => (
                <Link key={wager.address} href={`/wagers/${wager.address}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant={wager.isCreator ? "default" : "secondary"}>
                        {wager.isCreator ? "Creator" : "Opponent"}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{wager.amount} {wager.token}</p>
                        <p className="text-xs text-muted-foreground">
                          {wager.state === 0 ? 'Pending' : wager.state === 1 ? 'Funded' : wager.state === 2 ? 'In Game' : 'Completed'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View →</Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Games */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Completed Games</CardTitle>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.completedGames.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No completed games yet. Play your first game to see results here!
              </p>
              <Link href="/dashboard">
                <Button variant="outline">View Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.completedGames.slice(0, 5).map((game: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {game.won ? (
                      <Trophy className="h-5 w-5 text-green-600" />
                    ) : game.draw ? (
                      <Target className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Activity className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {game.won ? '🏆 Victory' : game.draw ? '🤝 Draw' : '❌ Defeat'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Wagered: {game.amount} {game.token}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${game.won ? 'text-green-600' : game.draw ? 'text-yellow-600' : 'text-red-600'}`}>
                      {game.won ? `+$${game.winnings}` : game.draw ? `+$${game.winnings}` : `-$${game.amount}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{game.token}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
