/**
 * Avail Nexus SDK Integration
 * 
 * This module handles cross-chain wager acceptance using Avail Nexus SDK.
 * It enables users to accept wagers from different chains without manual bridging.
 * 
 * Example: Player A creates wager on Base, Player B accepts from Arbitrum
 */

import { Address, parseUnits } from 'viem'
import { NexusSDK } from '@avail-project/nexus-core'
import type {
  BridgeAndExecuteParams,
  BridgeAndExecuteResult,
  SUPPORTED_TOKENS,
  SUPPORTED_CHAINS_IDS
} from '@avail-project/nexus-core'

export interface CrossChainAcceptParams {
  wagerAddress: Address
  wagerChainId: number
  userChainId: number
  tokenSymbol: 'USDC' | 'USDT'
  amount: string
  decimals: number
  opponentChessUsername: string
}

// Singleton SDK instance
let sdkInstance: NexusSDK | null = null

/**
 * Initialize Nexus SDK with wallet provider
 */
export async function initializeNexusSDK(provider: any): Promise<NexusSDK> {
  if (!sdkInstance) {
    // Use testnet for Base Sepolia & Arbitrum Sepolia
    sdkInstance = new NexusSDK({ network: 'testnet' })
    await sdkInstance.initialize(provider)
  }
  return sdkInstance
}

/**
 * Get or create SDK instance
 */
export function getNexusSDK(): NexusSDK | null {
  return sdkInstance
}

/**
 * Check if cross-chain acceptance is needed
 */
export function needsCrossChainBridge(
  wagerChainId: number,
  userChainId: number
): boolean {
  return wagerChainId !== userChainId
}

/**
 * Accept wager cross-chain using Avail Nexus bridgeAndExecute
 * 
 * This will:
 * 1. Bridge tokens from user's chain to user's wallet on destination chain
 * 2. Approve wager contract to spend tokens
 * 3. Execute acceptWager() on the wager contract (existing function)
 * 4. All in one atomic operation via Avail Nexus
 * 
 * NOTE: Works with existing deployed contracts - NO REDEPLOYMENT NEEDED!
 */
export async function acceptWagerCrossChain(
  params: CrossChainAcceptParams
): Promise<BridgeAndExecuteResult> {
  const sdk = getNexusSDK()
  if (!sdk) {
    throw new Error('Nexus SDK not initialized. Call initializeNexusSDK first.')
  }

  // ABI for the existing acceptWager function
  const wagerAbi = [
    {
      inputs: [
        { internalType: 'string', name: '_opponentChessUsername', type: 'string' }
      ],
      name: 'acceptWager',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function' as const,
    },
  ] as const

  // Convert amount to token units (e.g., USDC has 6 decimals)
  const amountInTokenUnits = parseUnits(params.amount, params.decimals).toString()

  const bridgeAndExecuteParams: BridgeAndExecuteParams = {
    token: params.tokenSymbol as SUPPORTED_TOKENS,
    amount: amountInTokenUnits,
    toChainId: params.wagerChainId as SUPPORTED_CHAINS_IDS,
    // Don't specify recipient - tokens go to user's wallet on destination chain
    // Don't specify sourceChains - let Avail find where user has tokens!
    // This way it will automatically use Arbitrum if that's where the USDC is
    execute: {
      contractAddress: params.wagerAddress,
      contractAbi: wagerAbi,
      functionName: 'acceptWager',
      buildFunctionParams: () => {
        // Return the function parameters for acceptWager
        return {
          functionParams: [params.opponentChessUsername],
        }
      },
      // Token approval is required since acceptWager does transferFrom
      tokenApproval: {
        token: params.tokenSymbol as SUPPORTED_TOKENS,
        amount: amountInTokenUnits,
      },
    },
    waitForReceipt: true,
    requiredConfirmations: 2,
  }

  // Execute the bridge + approve + accept in one transaction
  const result = await sdk.bridgeAndExecute(bridgeAndExecuteParams)

  return result
}

/**
 * Simulate cross-chain acceptance to preview costs
 */
export async function simulateCrossChainAccept(
  params: CrossChainAcceptParams
) {
  const sdk = getNexusSDK()
  if (!sdk) {
    throw new Error('Nexus SDK not initialized')
  }

  const wagerAbi = [
    {
      inputs: [
        { internalType: 'string', name: '_opponentChessUsername', type: 'string' }
      ],
      name: 'acceptWager',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function' as const,
    },
  ] as const

  const amountInTokenUnits = parseUnits(params.amount, params.decimals).toString()

  const bridgeAndExecuteParams: BridgeAndExecuteParams = {
    token: params.tokenSymbol as SUPPORTED_TOKENS,
    amount: amountInTokenUnits,
    toChainId: params.wagerChainId as SUPPORTED_CHAINS_IDS,
    sourceChains: [params.userChainId],
    execute: {
      contractAddress: params.wagerAddress,
      contractAbi: wagerAbi,
      functionName: 'acceptWager',
      buildFunctionParams: () => ({
        functionParams: [params.opponentChessUsername],
      }),
      tokenApproval: {
        token: params.tokenSymbol as SUPPORTED_TOKENS,
        amount: amountInTokenUnits,
      },
    },
  }

  return await sdk.simulateBridgeAndExecute(bridgeAndExecuteParams)
}

/**
 * Get supported chains for cross-chain operations
 */
export function getSupportedCrossChainRoutes() {
  return {
    // Base Sepolia <-> Arbitrum Sepolia
    routes: [
      { from: 84532, to: 421614, name: 'Base Sepolia → Arbitrum Sepolia' },
      { from: 421614, to: 84532, name: 'Arbitrum Sepolia → Base Sepolia' },
    ]
  }
}

/**
 * Estimate cross-chain transaction time
 */
export function estimateCrossChainTime(): string {
  // Avail Nexus bridge time
  return '2-5 minutes'
}

/**
 * Get chain name for display
 */
export function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    84532: 'Base Sepolia',
    421614: 'Arbitrum Sepolia',
  }
  return names[chainId] || `Chain ${chainId}`
}

/**
 * Cleanup SDK instance
 */
export async function deinitNexusSDK() {
  if (sdkInstance) {
    await sdkInstance.deinit()
    sdkInstance = null
  }
}
