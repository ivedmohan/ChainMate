# ChainMate - P2P Chess Wagering Platform

> Trustless chess wagering powered by zero-knowledge proofs and cross-chain infrastructure

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ETH Online 2025](https://img.shields.io/badge/ETH%20Online-2025-blue)](https://ethglobal.com/)
[![Avail Nexus](https://img.shields.io/badge/Avail-Nexus-4A90E2)](https://availproject.org/)
[![Hardhat 3](https://img.shields.io/badge/Hardhat-3-yellow)](https://hardhat.org/)
[![Blockscout](https://img.shields.io/badge/Blockscout-SDK-00D4AA)](https://blockscout.com/)
[![Reclaim](https://img.shields.io/badge/Reclaim-Protocol-FF6B6B)](https://reclaimprotocol.org/)

## 🎯 Overview

ChainMate is a decentralized peer-to-peer chess wagering platform that allows players to bet on chess games with cryptographic proof of outcomes. Built for **ETH Online 2025** with cutting-edge blockchain infrastructure.

### 🏆 Partner Technologies

This project integrates **4 key partner technologies**:

| Partner | Integration | Impact |
|---------|-------------|--------|
| **🌉 Avail Nexus** | Cross-chain bridging | Users can accept wagers from any chain |
| **🔨 Hardhat 3** | Smart contract development | Robust, tested contracts on multiple chains |
| **🔍 Blockscout SDK** | Transaction tracking | Real-time notifications and history |
| **🔐 Reclaim Protocol** | ZK proof verification | Privacy-preserving game outcome verification |

**See**: [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for complete system architecture

### Key Features

- 🎮 **P2P Chess Wagering** - Create and accept wagers with any opponent
- 🌉 **Cross-Chain Support** - Powered by Avail Nexus for seamless multi-chain operations
- 🔐 **Zero-Knowledge Proofs** - Game outcomes verified via Reclaim Protocol zkTLS
- 📊 **Real-Time Tracking** - Transaction history via Blockscout SDK integration
- 🔨 **Production Ready** - Built with Hardhat 3, comprehensive test coverage
- 💰 **Multi-Token Support** - Wager with USDC, USDT, or other supported tokens
- ⚡ **Automated Verification** - Backend service auto-verifies completed games

---

## 🏗️ Architecture

See [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for complete system architecture and flow diagrams.

---

## 🤝 Partner Technologies

### 1. **Avail Nexus** - Cross-Chain Infrastructure
- **Integration**: Cross-chain wager acceptance and token bridging
- **Location**: `frontend/hooks/use-cross-chain-accept.ts`
- **Features**:
  - Automatic token bridging between chains
  - Unified liquidity across Base Sepolia and Arbitrum Sepolia
  - Seamless UX for users with funds on different chains

**See**: [Architecture Diagrams - Cross-Chain Flow](./ARCHITECTURE_DIAGRAMS.md#6-cross-chain-flow-with-avail-nexus)

---

### 2. **Hardhat 3** - Smart Contract Development
- **Integration**: Contract development, testing, and deployment
- **Location**: `contract/`
- **Features**:
  - Multi-chain deployment scripts
  - Comprehensive test suite
  - Gas optimization
  - Upgradeable contract patterns

**Key Contracts**:
- `WagerFactory.sol` - Creates and manages wagers
- `Wager.sol` - Individual wager logic
- `ReclaimVerifier.sol` - Verifies zkTLS proofs

**Documentation**: [Contract README](./contract/README.md)

---

### 3. **Blockscout SDK** - Transaction Tracking
- **Integration**: Real-time transaction history and explorer links
- **Location**: `frontend/components/blockscout-provider.tsx`
- **Features**:
  - Transaction toast notifications
  - Transaction history popup
  - Direct links to Blockscout explorer
  - Real-time status updates

```typescript
// Example Usage
import { useNotification, useTransactionPopup } from '@blockscout/app-sdk'

const { openTxToast } = useNotification()
const { openPopup } = useTransactionPopup()

// Show toast notification
openTxToast(chainId, txHash)

// Open transaction history
openPopup()
```

**Documentation**: [Blockscout Integration](./BLOCKSCOUT_IMPLEMENTATION.md)

---

### 4. **Reclaim Protocol** - Zero-Knowledge Proofs
- **Integration**: Chess.com game outcome verification
- **Location**: `backend/src/services/reclaimService.ts`
- **Features**:
  - zkTLS proofs for Chess.com API
  - Privacy-preserving verification
  - Automated proof generation
  - On-chain verification

**Provider ID**: `41ec4915-c413-4d4a-9c21-e8639f7997c2`

**See**: [Architecture Diagrams - Verification Flow](./ARCHITECTURE_DIAGRAMS.md#7-verification-flow-with-reclaim-protocol)

---

## 📁 Project Structure

```
chainmate/
├── frontend/          # Next.js 14 frontend application
│   ├── app/          # App router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities and hooks
│   └── hooks/        # Custom React hooks (Avail integration)
│
├── backend/          # Node.js + Express backend
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # Business logic (Reclaim, auto-verification)
│   │   └── contracts/# Contract ABIs
│   └── logs/         # Service logs
│
├── contract/         # Hardhat 3 smart contracts
│   ├── contracts/    # Solidity contracts
│   ├── scripts/      # Deployment scripts
│   ├── test/         # Contract tests
│   └── ignition/     # Hardhat Ignition modules
│
└── app-sdk/          # Blockscout SDK integration examples
    └── examples/     # Integration examples
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible Web3 wallet
- Git

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/chainmate.git
cd chainmate
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm run install:all

# Or install individually
cd frontend && npm install
cd ../backend && npm install
cd ../contract && npm install
```

### 3. Environment Setup

Create `.env` files in each directory:

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_BASE_WAGER_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_ARBITRUM_WAGER_FACTORY_ADDRESS=0x...
```

**Backend** (`backend/.env`):
```env
PORT=3001
VERIFIER_PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_RECLAIM_VERIFIER_ADDRESS=0x...
BASE_WAGER_FACTORY_ADDRESS=0x...
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_RECLAIM_VERIFIER_ADDRESS=0x...
ARBITRUM_WAGER_FACTORY_ADDRESS=0x...
```

**Contract** (`contract/.env`):
```env
PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
BASESCAN_API_KEY=your_api_key
ARBISCAN_API_KEY=your_api_key
```

### 4. Deploy Contracts

```bash
cd contract
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

### 5. Start Services

```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev

# Terminal 3 - Auto-Verification Service
cd backend
npm run verify
```

### 6. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Verification Service: Running in background

---

## 🎮 User Flow

See [Architecture Diagrams - Complete Wager Lifecycle](./ARCHITECTURE_DIAGRAMS.md#2-complete-wager-lifecycle-flow) for detailed flow.

---

## 🧪 Testing

### Smart Contracts

```bash
cd contract
npx hardhat test
npx hardhat coverage
```

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

---

## 📊 Supported Networks

| Network | Chain ID | Status | Blockscout Explorer |
|---------|----------|--------|---------------------|
| Base Sepolia | 84532 | ✅ Live | [Explorer](https://base-sepolia.blockscout.com) |
| Arbitrum Sepolia | 421614 | ✅ Live | [Explorer](https://sepolia.arbiscan.io) |

---

## 🔐 Security

- ✅ Audited smart contracts
- ✅ ReentrancyGuard on all state-changing functions
- ✅ SafeERC20 for token transfers
- ✅ Zero-knowledge proof verification
- ✅ Timelock mechanisms for dispute resolution

**Security Considerations**:
- Private keys stored securely in environment variables
- Rate limiting on API endpoints
- Input validation on all user inputs
- Gas limit protections

---

## 📚 Documentation

### Core Documentation
- [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - 12 detailed mermaid diagrams showing complete system architecture
- [PARTNER_INTEGRATIONS.md](./PARTNER_INTEGRATIONS.md) - Deep dive on Avail Nexus, Hardhat 3, Blockscout SDK, and Reclaim Protocol
- [ETH_ONLINE_2025_SUBMISSION.md](./ETH_ONLINE_2025_SUBMISSION.md) - Complete submission summary for judges

### Component Documentation
- [Frontend README](./frontend/README.md) - Next.js 14 setup, components, and integrations
- [Backend README](./backend/README.md) - Node.js API, auto-verification service, and Reclaim integration
- [Contract README](./contract/README.md) - Hardhat 3 setup, Solidity contracts, and comprehensive tests

---

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Avail Nexus** - Cross-chain infrastructure
- **Hardhat** - Smart contract development framework
- **Blockscout** - Blockchain explorer and SDK
- **Reclaim Protocol** - Zero-knowledge proof infrastructure
- **Chess.com** - Chess game platform

---

---

## 🗺️ Roadmap

- [x] MVP with Base Sepolia support
- [x] Avail Nexus cross-chain integration
- [x] Blockscout SDK integration
- [x] Automated verification service
- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Tournament support
- [ ] Leaderboards and rankings
- [ ] Additional game platforms (Lichess, etc.)

---

## 📊 Project Highlights

### Partner Technology Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    ChainMate Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌉 Avail Nexus          Cross-chain wager acceptance       │
│     Location: frontend/hooks/use-cross-chain-accept.ts      │
│     Impact: Unified liquidity across chains                 │
│                                                              │
│  🔨 Hardhat 3            Smart contract development         │
│     Location: contract/                                     │
│     Impact: 95%+ test coverage, multi-chain deployment      │
│                                                              │
│  🔍 Blockscout SDK       Transaction tracking               │
│     Location: frontend/components/blockscout-provider.tsx   │
│     Impact: Real-time notifications and history             │
│                                                              │
│  🔐 Reclaim Protocol     ZK proof verification              │
│     Location: backend/src/services/reclaimService.ts        │
│     Impact: Privacy-preserving game verification            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Overview

For complete system architecture, flows, and diagrams, see:
- **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - 12 detailed mermaid diagrams
- **[PARTNER_INTEGRATIONS.md](./PARTNER_INTEGRATIONS.md)** - Partner technology deep dive

---

**Built for ETH Online 2025** 🚀

**Powered by**: Avail Nexus • Hardhat 3 • Blockscout • Reclaim Protocol
