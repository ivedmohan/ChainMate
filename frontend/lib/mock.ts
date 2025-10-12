import type { Wager } from "./types"

export const mockWagers: Wager[] = [
  {
    id: "1024",
    creator: "0x8f...eA9C",
    opponentHandle: "queencrusher",
    amount: 0.02,
    tokenSymbol: "ETH",
    timeControl: "3+2",
    status: "open",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiry: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "1025",
    creator: "0x77...cD21",
    opponentHandle: "rapidhawk",
    amount: 10,
    tokenSymbol: "USDC",
    timeControl: "10+0",
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    expiry: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "1026",
    creator: "0x12...99BA",
    opponentHandle: "blitzmaster",
    amount: 5,
    tokenSymbol: "DAI",
    timeControl: "5+0",
    status: "settled",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    expiry: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
]
