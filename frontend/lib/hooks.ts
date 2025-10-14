import React from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId, useAccount } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { useQueryClient } from '@tanstack/react-query'
import { CONTRACTS, SUPPORTED_TOKENS } from './wagmi'
import { WAGER_FACTORY_ABI, WAGER_ABI, ERC20_ABI } from './abis'
import { useNotification } from '@blockscout/app-sdk'

// Hook to get supported tokens for current chain
export function useSupportedTokens() {
  const chainId = useChainId()
  return SUPPORTED_TOKENS[chainId as keyof typeof SUPPORTED_TOKENS] || []
}

// Hook to get contract addresses for current chain
export function useContractAddresses() {
  const chainId = useChainId()
  return {
    wagerFactory: CONTRACTS.WAGER_FACTORY[chainId as keyof typeof CONTRACTS.WAGER_FACTORY],
    reclaimVerifier: CONTRACTS.RECLAIM_VERIFIER[chainId as keyof typeof CONTRACTS.RECLAIM_VERIFIER],
  }
}

// Hook to check if a token is supported
export function useIsSupportedToken(tokenAddress: Address) {
  const { wagerFactory } = useContractAddresses()

  return useReadContract({
    address: wagerFactory,
    abi: WAGER_FACTORY_ABI,
    functionName: 'isSupportedToken',
    args: [tokenAddress],
  })
}

// Hook to get user's wagers
export function useUserWagers(userAddress?: Address) {
  const { wagerFactory } = useContractAddresses()

  return useReadContract({
    address: wagerFactory,
    abi: WAGER_FACTORY_ABI,
    functionName: 'getUserWagers',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!wagerFactory,
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 15000, // Refetch every 15 seconds
      refetchOnWindowFocus: true,
    },
  })
}

// Hook to get all wagers (paginated)
export function useAllWagers(start: number = 0, limit: number = 50) {
  const { wagerFactory } = useContractAddresses()

  return useReadContract({
    address: wagerFactory,
    abi: WAGER_FACTORY_ABI,
    functionName: 'getWagers',
    args: [BigInt(start), BigInt(limit)],
    query: {
      enabled: !!wagerFactory,
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 20000, // Refetch every 20 seconds
      refetchOnWindowFocus: true,
    },
  })
}

// Hook to get wager data
export function useWagerData(wagerAddress?: Address) {
  return useReadContract({
    address: wagerAddress,
    abi: WAGER_ABI,
    functionName: 'getWagerData',
    query: {
      enabled: !!wagerAddress,
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 3000, // Auto-refetch every 3 seconds for more responsive updates
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: true, // Continue refetching when tab is not active
    },
  })
}

// Hook to get token balance
export function useTokenBalance(tokenAddress?: Address, userAddress?: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!(tokenAddress && userAddress),
      refetchInterval: 10000, // Refetch every 10 seconds
      refetchOnWindowFocus: true,
    },
  })
}

// Hook to get token allowance
export function useTokenAllowance(tokenAddress?: Address, ownerAddress?: Address, spenderAddress?: Address) {
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!(tokenAddress && ownerAddress && spenderAddress),
      refetchInterval: 8000, // Refetch every 8 seconds
      refetchOnWindowFocus: true,
    },
  })
}

// Hook for creating wagers
export function useCreateWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { wagerFactory } = useContractAddresses()
  const { invalidateUserWagers, invalidateAllWagers } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  // Invalidate queries when transaction succeeds
  React.useEffect(() => {
    if (isSuccess) {
      // Invalidate immediately and then again after a short delay to ensure fresh data
      invalidateUserWagers()
      invalidateAllWagers()

      // Also invalidate after a short delay to catch any blockchain delays
      setTimeout(() => {
        invalidateUserWagers()
        invalidateAllWagers()
      }, 1000)
    }
  }, [isSuccess, invalidateUserWagers, invalidateAllWagers])

  const createWager = async (
    opponent: Address,
    token: Address,
    amount: string,
    decimals: number,
    creatorChessUsername: string
  ) => {
    const amountWei = parseUnits(amount, decimals)

    writeContract({
      address: wagerFactory,
      abi: WAGER_FACTORY_ABI,
      functionName: 'createWager',
      args: [opponent, token, amountWei, creatorChessUsername],
    })
  }

  return {
    createWager,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for approving tokens
export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { invalidateTokenData } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Track the token address for invalidation
  const [lastTokenAddress, setLastTokenAddress] = React.useState<Address>()

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  React.useEffect(() => {
    if (isSuccess && lastTokenAddress) {
      setTimeout(() => {
        invalidateTokenData(lastTokenAddress)
      }, 1000)
    }
  }, [isSuccess, lastTokenAddress, invalidateTokenData])

  const approve = async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
    const amountWei = parseUnits(amount, decimals)
    setLastTokenAddress(tokenAddress)

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amountWei],
    })
  }

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for depositing to wager
export function useDepositToWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { invalidateWagerData, invalidateUserWagers, invalidateAllWagers } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [lastWagerAddress, setLastWagerAddress] = React.useState<Address>()

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  React.useEffect(() => {
    if (isSuccess && lastWagerAddress) {
      setTimeout(() => {
        invalidateWagerData(lastWagerAddress)
        invalidateUserWagers()
        invalidateAllWagers()
      }, 2000)
    }
  }, [isSuccess, lastWagerAddress, invalidateWagerData, invalidateUserWagers, invalidateAllWagers])

  const deposit = async (wagerAddress: Address) => {
    setLastWagerAddress(wagerAddress)
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'creatorDeposit',
    })
  }

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for accepting wager
export function useAcceptWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { invalidateWagerData, invalidateUserWagers, invalidateAllWagers } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [lastWagerAddress, setLastWagerAddress] = React.useState<Address>()

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  React.useEffect(() => {
    if (isSuccess && lastWagerAddress) {
      setTimeout(() => {
        invalidateWagerData(lastWagerAddress)
        invalidateUserWagers()
        invalidateAllWagers()
      }, 2000)
    }
  }, [isSuccess, lastWagerAddress, invalidateWagerData, invalidateUserWagers, invalidateAllWagers])

  const acceptWager = async (wagerAddress: Address, opponentChessUsername: string) => {
    setLastWagerAddress(wagerAddress)
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'acceptWager',
      args: [opponentChessUsername],
    })
  }

  return {
    acceptWager,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for linking game
export function useLinkGame() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { invalidateWagerData, invalidateUserWagers } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [lastWagerAddress, setLastWagerAddress] = React.useState<Address>()

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  React.useEffect(() => {
    if (isSuccess && lastWagerAddress) {
      setTimeout(() => {
        invalidateWagerData(lastWagerAddress)
        invalidateUserWagers()
      }, 2000)
    }
  }, [isSuccess, lastWagerAddress, invalidateWagerData, invalidateUserWagers])

  const linkGame = async (wagerAddress: Address, gameId: string) => {
    setLastWagerAddress(wagerAddress)
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'linkGame',
      args: [gameId],
    })
  }

  return {
    linkGame,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for settling wager
export function useSettleWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { invalidateWagerData, invalidateUserWagers, invalidateAllWagers } = useInvalidateWagerQueries()
  const { openTxToast } = useNotification()
  const chainId = useChainId()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const [lastWagerAddress, setLastWagerAddress] = React.useState<Address>()

  // Show Blockscout toast when transaction is submitted
  React.useEffect(() => {
    if (hash) {
      openTxToast(chainId.toString(), hash)
    }
  }, [hash, chainId, openTxToast])

  React.useEffect(() => {
    if (isSuccess && lastWagerAddress) {
      setTimeout(() => {
        invalidateWagerData(lastWagerAddress)
        invalidateUserWagers()
        invalidateAllWagers()
      }, 2000)
    }
  }, [isSuccess, lastWagerAddress, invalidateWagerData, invalidateUserWagers, invalidateAllWagers])

  const settle = async (wagerAddress: Address) => {
    setLastWagerAddress(wagerAddress)
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'settle',
    })
  }

  return {
    settle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for cancelling wager
export function useCancelWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const cancel = async (wagerAddress: Address) => {
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'cancel',
    })
  }

  return {
    cancel,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for mutual cancellation
export function useVoteToCancelMutual() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const voteToCancelMutual = async (wagerAddress: Address) => {
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'voteToCancelMutual',
    })
  }

  return {
    voteToCancelMutual,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for claiming timeout
export function useClaimTimeout() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claimTimeout = async (wagerAddress: Address) => {
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'claimTimeout',
    })
  }

  return {
    claimTimeout,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Hook for disputing wager
export function useDisputeWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const dispute = async (wagerAddress: Address, reason: string) => {
    writeContract({
      address: wagerAddress,
      abi: WAGER_ABI,
      functionName: 'dispute',
      args: [reason],
    })
  }

  return {
    dispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

// Helper function to format token amounts
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals)
}

// Helper function to parse token amounts
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals)
}

// Utility function to invalidate related queries after transactions
export function useInvalidateWagerQueries() {
  const queryClient = useQueryClient()
  const { address: userAddress } = useAccount()

  const invalidateAll = () => {
    // Invalidate all wager-related queries
    queryClient.invalidateQueries({ queryKey: ['readContract'] })
  }

  const invalidateUserWagers = () => {
    if (userAddress) {
      // Invalidate and refetch user wagers
      queryClient.invalidateQueries({
        queryKey: ['readContract', {
          functionName: 'getUserWagers',
          args: [userAddress]
        }]
      })
      // Also force refetch
      queryClient.refetchQueries({
        queryKey: ['readContract', {
          functionName: 'getUserWagers',
          args: [userAddress]
        }]
      })
    }
  }

  const invalidateAllWagers = () => {
    // Invalidate and refetch all wagers
    queryClient.invalidateQueries({
      queryKey: ['readContract', {
        functionName: 'getWagers'
      }]
    })
    // Also force refetch
    queryClient.refetchQueries({
      queryKey: ['readContract', {
        functionName: 'getWagers'
      }]
    })
  }

  const invalidateWagerData = (wagerAddress: Address) => {
    queryClient.invalidateQueries({
      queryKey: ['readContract', {
        address: wagerAddress,
        functionName: 'getWagerData'
      }]
    })
  }

  const invalidateTokenData = (tokenAddress: Address) => {
    queryClient.invalidateQueries({
      queryKey: ['readContract', {
        address: tokenAddress
      }]
    })
  }

  return {
    invalidateAll,
    invalidateUserWagers,
    invalidateAllWagers,
    invalidateWagerData,
    invalidateTokenData,
  }
}
