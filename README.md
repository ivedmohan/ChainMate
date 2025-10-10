# ChainMate

A decentralized peer-to-peer wagering platform for chess games using zero-knowledge proofs for outcome verification.

## 🎯 Built For ETH Global Online 2025

ChainMate leverages cutting-edge technologies to create a trustless cross-chain wagering experience:

- **Avail Nexus SDK** - Seamless cross-chain wagering with Bridge & Execute
- **Blockscout SDK** - Real-time transaction tracking and explorer integration  
- **Hardhat 3** - Comprehensive testing and multi-chain deployment
- **Reclaim Protocol** - Zero-knowledge proof verification of Chess.com games

## 🏗️ Architecture

### Tech Stack

- **Smart Contracts:** Solidity 0.8.28 with OpenZeppelin
- **Development:** Hardhat 3 with TypeScript
- **ZK Verification:** Reclaim Protocol (zkTLS)
- **Cross-Chain:** Avail Nexus SDK
- **Frontend:** React + Viem + Wagmi
- **Explorer:** Blockscout SDK

### Supported Chains

- **Base Sepolia** - Fast, low-cost L2 with official USDC and PYUSD testnet tokens
- **Arbitrum Sepolia** - Popular L2 with official USDC and PYUSD testnet tokens

### Supported Tokens

- **USDC** - Official testnet USDC on both Base and Arbitrum
- **PYUSD** - PayPal USD stablecoin on both Base and Arbitrum

## 🚀 Getting Started

### Prerequisites

- Node.js v22 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd chainmate

# Install contract dependencies
cd contract
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Configuration

1. Copy `.env.example` to `.env` in the `contract/` directory
2. Add your private key and RPC URLs (optional - defaults provided)

```bash
cd contract
cp .env.example .env
# Edit .env with your values
```

### Compile Contracts

```bash
cd contract
npx hardhat build
```

### Run Tests

```bash
# Run all tests (Solidity + TypeScript)
npx hardhat test

# Run only Solidity tests
npx hardhat test solidity

# Run only TypeScript tests
npx hardhat test nodejs
```

## 📋 Project Structure

```
.
├── contract/          # Smart contracts (Hardhat 3)
│   ├── contracts/     # Solidity contracts
│   ├── test/          # Tests (Solidity + TypeScript)
│   ├── ignition/      # Deployment modules
│   └── scripts/       # Utility scripts
├── frontend/          # React frontend
├── backend/           # Backend services (Reclaim proof generation)
└── .kiro/specs/       # Project specifications
```

## 🎮 How It Works

### 1. Create Wager
- Player A creates a wager with amount and token (USDC or PYUSD)
- Specifies opponent's address and Chess.com username
- Deposits tokens into escrow

### 2. Accept Wager (Cross-Chain)
- Player B accepts from any supported chain
- Avail Nexus bridges tokens automatically using "Bridge & Execute"
- Both deposits locked in smart contract

### 3. Play Chess
- Players compete on Chess.com
- Link game ID to wager contract

### 4. ZK Proof Verification
- Reclaim Protocol generates zkTLS proof of game outcome
- Proof submitted on-chain for verification
- No need to reveal full game data

### 5. Settlement
- Winner receives 98% of pot (2% platform fee)
- Automatic payout after verification
- Can bridge winnings back to preferred chain

## 🔗 Cross-Chain Flow

**Example: Player A (Arbitrum) vs Player B (Base)**

1. Player A creates wager: 10 USDC on Arbitrum
2. Player B accepts from Base: Avail Nexus bridges 10 USDC from Base → Arbitrum
3. Both deposits locked on Arbitrum
4. Play chess, submit proof
5. Winner gets 19.6 USDC on Arbitrum (or bridge back)

## 🧪 Testing

### Solidity Tests
Fast, EVM-native unit tests with fuzz testing support.

```bash
npx hardhat test solidity
```

### TypeScript Tests
Integration tests with realistic blockchain simulation.

```bash
npx hardhat test nodejs
```

### Gas Optimization
Profile and optimize gas costs.

```bash
npx hardhat test --profile
```

## 🚢 Deployment

### Deploy to Testnet

```bash
npx hardhat ignition deploy ignition/modules/WagerFactory.ts --network baseSepolia
```

### Verify Contracts

```bash
npx hardhat verify --network baseSepolia <contract-address>
```

## 📚 Documentation

- [Requirements](/.kiro/specs/p2p-zk-wagering/requirements.md)
- [Design](/.kiro/specs/p2p-zk-wagering/design.md)
- [Tasks](/.kiro/specs/p2p-zk-wagering/tasks.md)

## 🛠️ Technology Integration

### Avail Nexus SDK
Cross-chain wager acceptance using Bridge & Execute for seamless UX across Base and Arbitrum.

### Blockscout SDK  
Real-time transaction tracking and wager history with integrated explorer functionality.

### Hardhat 3
Comprehensive test suite with both Solidity and TypeScript tests, multi-chain deployment support.

## 🤝 Contributing

This is a hackathon project built for ETH Global Online 2025.

## 📄 License

MIT

## 🔗 Links

- [ETH Global Submission](#)
- [Demo Video](#)
- [Live App](#)
- [GitHub](#)

---

Built with ❤️ for ETH Global Online 2025
