// Simplified ABIs for the main functions we need
export const WAGER_FACTORY_ABI = [
  {
    type: 'function',
    name: 'createWager',
    inputs: [
      { name: '_opponent', type: 'address' },
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_creatorChessUsername', type: 'string' },
    ],
    outputs: [{ name: 'wagerAddress', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getUserWagers',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWagers',
    inputs: [
      { name: '_start', type: 'uint256' },
      { name: '_limit', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSupportedToken',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'WagerCreated',
    inputs: [
      { name: 'wagerAddress', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'opponent', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

export const WAGER_ABI = [
  {
    type: 'function',
    name: 'creatorDeposit',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptWager',
    inputs: [{ name: '_opponentChessUsername', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'linkGame',
    inputs: [{ name: '_gameId', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'settle',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimTimeout',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'voteToCancelMutual',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'dispute',
    inputs: [{ name: '_reason', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getWagerData',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'opponent', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'creatorChessUsername', type: 'string' },
          { name: 'opponentChessUsername', type: 'string' },
          { name: 'gameId', type: 'string' },
          { name: 'state', type: 'uint8' },
          { name: 'winner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'fundedAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'settledAt', type: 'uint256' },
          { name: 'creatorDeposited', type: 'bool' },
          { name: 'opponentDeposited', type: 'bool' },
          { name: 'platformFee', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBalance',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isExpired',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'WagerCreated',
    inputs: [
      { name: 'creator', type: 'address', indexed: true },
      { name: 'opponent', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'creatorChessUsername', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WagerFunded',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'totalPot', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GameLinked',
    inputs: [
      { name: 'gameId', type: 'string', indexed: true },
      { name: 'linkedBy', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'OutcomeVerified',
    inputs: [
      { name: 'gameId', type: 'string', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'result', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WagerSettled',
    inputs: [
      { name: 'winner', type: 'address', indexed: true },
      { name: 'winnings', type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WagerCancelled',
    inputs: [
      { name: 'cancelledBy', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeInitiated',
    inputs: [
      { name: 'initiatedBy', type: 'address', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
] as const

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

