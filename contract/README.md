# ChainMate - P2P ZK Wagering Smart Contracts

Decentralized peer-to-peer wagering platform with zero-knowledge proof verification using Reclaim Protocol. Built on Base and Arbitrum Sepolia testnets.

## 🎯 Overview

ChainMate enables trustless peer-to-peer wagers with privacy-preserving proof verification. Users can create wagers, accept challenges, and verify outcomes using zero-knowledge proofs without revealing sensitive data.

### Key Features

- **Factory Pattern**: Single WagerFactory deploys individual Wager contracts on-demand
- **Multi-Token Support**: USDC and PYUSD (Arbitrum only)
- **ZK Proof Verification**: Reclaim Protocol integration for privacy-preserving verification
- **Multi-Chain**: Deployed on Base Sepolia and Arbitrum Sepolia
- **Trustless Escrow**: Funds locked in smart contracts until resolution

## 📦 Deployed Contracts

### Base Sepolia
- **WagerFactory**: [`0x93000dbeaa7d1f204239230e55fe694220a35328`](https://sepolia.basescan.org/address/0x93000dbeaa7d1f204239230e55fe694220a35328)
- **Chain ID**: 84532
- **Supported Tokens**: 
  - USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Arbitrum Sepolia
- **WagerFactory**: [`0xea778860f57f218b023be05c6013427b329d27d9`](https://sepolia.arbiscan.io/address/0xea778860f57f218b023be05c6013427b329d27d9)
- **Chain ID**: 421614
- **Supported Tokens**:
  - USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
  - PYUSD: `0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1`

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file:

```bash
# Private key for deployment (DO NOT commit your real private key!)
PRIVATE_KEY=your_private_key_here

# RPC URLs (optional - defaults provided)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# API keys for contract verification
BASESCAN_API_KEY=your_basescan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# Reclaim Protocol credentials
RECLAIM_APP_ID=0x88a06fa32b2063e0a989384EfBd956884C2F85ea
RECLAIM_APP_SECRET=0x5d9228228f6b34725ea2eb77107335ebcd85bf6ef6611e9964c61cebee7d0faf
```

## 🧪 Testing

Run all tests:

```bash
npx hardhat test
```

Run specific test suites:

```bash
# Solidity tests only
npx hardhat test solidity

# TypeScript tests only
npx hardhat test nodejs
```

## 🚢 Deployment

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy to Testnets

Deploy to Base Sepolia:

```bash
npx hardhat run scripts/deploy-viem.ts --network baseSepolia
```

Deploy to Arbitrum Sepolia:

```bash
npx hardhat run scripts/deploy-viem.ts --network arbitrumSepolia
```

## 📖 Contract Architecture

### WagerFactory

The factory contract that deploys individual Wager contracts:

- **createWager()**: Deploy a new wager contract
- **getWagersByCreator()**: Get all wagers created by an address
- **getWagersByParticipant()**: Get all wagers a user participated in
- **updateTreasury()**: Update treasury address (owner only)
- **addSupportedToken()**: Add new supported token (owner only)

### Wager

Individual wager contract with lifecycle management:

- **acceptWager()**: Accept and join a wager
- **submitProof()**: Submit ZK proof for verification
- **resolveWager()**: Resolve wager based on proofs
- **cancelWager()**: Cancel before acceptance
- **claimRefund()**: Claim refund if expired

### States

```
PENDING → ACTIVE → RESOLVED
   ↓
CANCELLED
```

## 🔐 Security Features

- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard
- **Access Control**: Ownable pattern for admin functions
- **Safe Token Transfers**: SafeERC20 for all token operations
- **Proof Verification**: Reclaim Protocol integration
- **Expiration Handling**: Time-based wager expiration

## 🛠️ Development

### Project Structure

```
contract/
├── contracts/
│   ├── WagerFactory.sol    # Factory for deploying wagers
│   └── Wager.sol           # Individual wager contract
├── scripts/
│   └── deploy-viem.ts      # Deployment script
├── test/
│   └── wager.ts            # Test suite
├── ignition/
│   └── modules/            # Hardhat Ignition modules
└── hardhat.config.ts       # Hardhat configuration
```

### Tech Stack

- **Solidity**: ^0.8.28
- **Hardhat**: 3.0.7
- **Viem**: 2.38.0
- **OpenZeppelin**: 5.4.0
- **Reclaim Protocol**: ZK proof verification

## 📝 Usage Example

### Creating a Wager

```typescript
// 1. Approve token spending
await token.approve(factoryAddress, wagerAmount);

// 2. Create wager
const tx = await factory.createWager(
  tokenAddress,
  wagerAmount,
  expirationTime,
  reclaimProofRequirements
);

// 3. Get wager address from event
const receipt = await tx.wait();
const wagerAddress = receipt.events[0].args.wagerAddress;
```

### Accepting a Wager

```typescript
// 1. Approve token spending
await token.approve(wagerAddress, wagerAmount);

// 2. Accept wager
await wager.acceptWager();
```

### Submitting Proof

```typescript
// 1. Generate proof via Reclaim Protocol
const proof = await reclaimClient.generateProof(data);

// 2. Submit to contract
await wager.submitProof(proof);
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Reclaim Protocol](https://reclaimprotocol.org/)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Hardhat Documentation](https://hardhat.org/docs)

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Join our community Discord
- Check the documentation

---

Built with ❤️ using Hardhat 3.0, Viem, and Reclaim Protocol
