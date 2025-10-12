import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId, useAccount } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { CONTRACTS, SUPPORTED_TOKENS } from './wagmi'
import { WAGER_FACTORY_ABI, WAGER_ABI, ERC20_ABI } from './abis'

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
      enabled: !!userAddress,
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
    },
  })
}

// Hook for creating wagers
export function useCreateWager() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { wagerFactory } = useContractAddresses()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

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
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = async (tokenAddress: Address, spenderAddress: Address, amount: string, decimals: number) => {
    const amountWei = parseUnits(amount, decimals)
    
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
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (wagerAddress: Address) => {
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
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const acceptWager = async (wagerAddress: Address, opponentChessUsername: string) => {
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
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const linkGame = async (wagerAddress: Address, gameId: string) => {
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
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const settle = async (wagerAddress: Address) => {
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

// Helper function to format token amounts
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals)
}

// Helper function to parse token amounts
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals)
}
