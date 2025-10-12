export type WagerStatus = "open" | "active" | "settled" | "canceled"

export type Wager = {
  id: string
  creator: string
  opponentHandle: string // chess.com username
  amount: number
  tokenSymbol: "ETH" | "USDC" | "DAI"
  timeControl: "3+2" | "5+0" | "10+0" | "15+10"
  status: WagerStatus
  createdAt: string // ISO date
  expiry: string // ISO date
}
