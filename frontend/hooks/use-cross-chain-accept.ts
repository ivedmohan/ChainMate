/**
 * React hook for cross-chain wager acceptance using Avail Nexus
 */

import { useState, useCallback, useEffect } from 'react'
import { useChainId, useAccount } from 'wagmi'
import { Address } from 'viem'
import { 
  needsCrossChainBridge,
  acceptWagerCrossChain,
  simulateCrossChainAccept,
  estimateCrossChainTime,
  initializeNexusSDK,
  getNexusSDK,
  getChainName,
  type CrossChainAcceptParams
} from '@/lib/avail-nexus'
import type { BridgeAndExecuteResult } from '@avail-project/nexus-core'

export interface CrossChainAcceptState {
  isLoading: boolean
  isBridging: boolean
  isExecuting: boolean
  isSuccess: boolean
  error: Error | null
  txHash?: string
  explorerUrl?: string
  estimatedTime?: string
  bridgeSkipped?: boolean
}

export function useCrossChainAccept() {
  const userChainId = useChainId()
  const { connector } = useAccount()
  
  const [state, setState] = useState<CrossChainAcceptState>({
    isLoading: false,
    isBridging: false,
    isExecuting: false,
    isSuccess: false,
    error: null,
  })

  // Initialize Nexus SDK when connector is available
  useEffect(() => {
    const initSDK = async () => {
      if (connector && !getNexusSDK()) {
        try {
          const provider = await connector.getProvider()
          if (provider) {
            await initializeNexusSDK(provider)
            console.log('✅ Nexus SDK initialized')
          }
        } catch (error) {
          console.error('Failed to initialize Nexus SDK:', error)
        }
      }
    }
    initSDK()
  }, [connector])

  const acceptCrossChain = useCallback(async (
    wagerAddress: Address,
    wagerChainId: number,
    tokenSymbol: 'USDC' | 'USDT',
    amount: string,
    decimals: number,
    opponentChessUsername: string
  ): Promise<BridgeAndExecuteResult> => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        isBridging: true,
        error: null,
        estimatedTime: estimateCrossChainTime()
      }))

      console.log(`🌉 Starting cross-chain accept from ${getChainName(userChainId)} to ${getChainName(wagerChainId)}`)

      // Execute bridge + accept via Avail Nexus
      const result = await acceptWagerCrossChain({
        wagerAddress,
        wagerChainId,
        userChainId,
        tokenSymbol,
        amount,
        decimals,
        opponentChessUsername,
      })

      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isBridging: false,
          isExecuting: false,
          isSuccess: true,
          txHash: result.executeTransactionHash,
          explorerUrl: result.executeExplorerUrl,
          bridgeSkipped: result.bridgeSkipped,
        }))

        console.log('✅ Cross-chain accept successful!')
        if (result.executeExplorerUrl) {
          console.log('View transaction:', result.executeExplorerUrl)
        }
      } else {
        throw new Error(result.error || 'Cross-chain accept failed')
      }

      return result

    } catch (error) {
      console.error('❌ Cross-chain accept failed:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        isBridging: false,
        isExecuting: false,
        isSuccess: false,
        error: error as Error,
      }))
      throw error
    }
  }, [userChainId])

  const simulate = useCallback(async (
    wagerAddress: Address,
    wagerChainId: number,
    tokenSymbol: 'USDC' | 'USDT',
    amount: string,
    decimals: number,
    opponentChessUsername: string
  ) => {
    try {
      return await simulateCrossChainAccept({
        wagerAddress,
        wagerChainId,
        userChainId,
        tokenSymbol,
        amount,
        decimals,
        opponentChessUsername,
      })
    } catch (error) {
      console.error('Simulation failed:', error)
      throw error
    }
  }, [userChainId])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isBridging: false,
      isExecuting: false,
      isSuccess: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    acceptCrossChain,
    simulate,
    reset,
    needsCrossChain: (wagerChainId: number) => needsCrossChainBridge(wagerChainId, userChainId),
    userChainId,
    getChainName,
  }
}
