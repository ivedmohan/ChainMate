import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, arbitrumSepolia } from 'wagmi/chains'

// Your deployed contract addresses
export const CONTRACTS = {
  WAGER_FACTORY: {
    [baseSepolia.id]: '0x8f3d2d8f8e9e9220df6558d6a866e902b437dd72' as const,
    [arbitrumSepolia.id]: '0x7a57bef7846f4c0c7dad4faa5a322ff8df4728c9' as const,
  },
  RECLAIM_VERIFIER: {
    [baseSepolia.id]: '0xe9fa676e9e3d17f686ec00d83296d2b3a5b59481' as const,
    [arbitrumSepolia.id]: '0xa8f1e4e4d04bce611f89308e27623bd15741cfe8' as const,
  },
} as const

// Supported tokens per chain
export const SUPPORTED_TOKENS = {
  [baseSepolia.id]: [
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ],
  [arbitrumSepolia.id]: [
    {
      address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as const,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1' as const,
      symbol: 'PYUSD',
      name: 'PayPal USD',
      decimals: 6,
    },
  ],
} as const

export const config = getDefaultConfig({
  appName: 'ChainMate',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [baseSepolia, arbitrumSepolia],
  ssr: true,
})

