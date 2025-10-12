// Contract ABIs for backend integration
export const WAGER_FACTORY_ABI = [
  {
    "type": "function",
    "name": "getTotalWagers",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allWagers",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  }
] as const;

export const WAGER_ABI = [
  {
    "type": "function",
    "name": "getWagerData",
    "inputs": [],
    "outputs": [
      {
        "type": "tuple",
        "components": [
          { "name": "creator", "type": "address" },
          { "name": "opponent", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "creatorChessUsername", "type": "string" },
          { "name": "opponentChessUsername", "type": "string" },
          { "name": "gameId", "type": "string" },
          { "name": "state", "type": "uint8" },
          { "name": "winner", "type": "address" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "fundedAt", "type": "uint256" },
          { "name": "expiresAt", "type": "uint256" },
          { "name": "settledAt", "type": "uint256" },
          { "name": "creatorDeposited", "type": "bool" },
          { "name": "opponentDeposited", "type": "bool" },
          { "name": "platformFee", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  }
] as const;

export const RECLAIM_VERIFIER_ABI = [
  {
    "type": "function",
    "name": "verifyChessGameProof",
    "inputs": [
      { "name": "encodedProof", "type": "bytes" },
      { "name": "wagerContract", "type": "address" },
      { "name": "whitePlayerAddress", "type": "address" },
      { "name": "blackPlayerAddress", "type": "address" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "validateProof",
    "inputs": [
      { "name": "encodedProof", "type": "bytes" },
      { "name": "whitePlayerAddress", "type": "address" },
      { "name": "blackPlayerAddress", "type": "address" }
    ],
    "outputs": [
      { "name": "isValid", "type": "bool" },
      {
        "name": "gameData",
        "type": "tuple",
        "components": [
          { "name": "gameId", "type": "string" },
          { "name": "winner", "type": "address" },
          { "name": "result", "type": "string" },
          { "name": "timestamp", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ProofVerified",
    "inputs": [
      { "name": "wager", "type": "address", "indexed": true },
      { "name": "winner", "type": "address", "indexed": true },
      { "name": "gameId", "type": "string", "indexed": false },
      { "name": "proofHash", "type": "bytes32", "indexed": false }
    ]
  }
] as const;

