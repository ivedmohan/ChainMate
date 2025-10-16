# ChainMate - ETH Online 2025 Submission

> P2P Chess Wagering Platform with Cross-Chain Support and ZK Proof Verification

---

## 🎯 Project Summary

**ChainMate** enables trustless peer-to-peer chess wagering with cryptographic proof of game outcomes. Players can create wagers on one blockchain and accept them from another, with automatic verification of Chess.com game results using zero-knowledge proofs.

---

## 🏆 Partner Technology Integrations

### 1. Avail Nexus - Cross-Chain Infrastructure

**Prize Track**: Avail Nexus Integration

**Implementation**: 
- Location: `frontend/hooks/use-cross-chain-accept.ts`
- Users can accept wagers on Base Sepolia using funds from Arbitrum Sepolia
- Automatic token bridging and contract execution in one flow
- Seamless UX - users don't need to manually bridge tokens

**Key Features**:
- Unified liquidity across chains
- One-click cross-chain wager acceptance
- Automatic routing optimization
- 2-5 minute bridge time

**Architecture**: See [ARCHITECTURE_DIAGRAMS.md - Section 6](./ARCHITECTURE_DIAGRAMS.md#6-cross-chain-flow-with-avail-nexus)

---

### 2. Hardhat 3 - Smart Contract Development

**Prize Track**: Hardhat 3 Integration

**Implementation**:
- Location: `contract/`
- All smart contracts developed, tested, and deployed using **Hardhat 3**
- Multi-chain deployment to Base Sepolia and Arbitrum Sepolia
- Hardhat Ignition for reproducible deployments
- Comprehensive test suite with 95%+ coverage

**Key Hardhat 3 Features**:
- ✅ **EDR (Ethereum Development Runtime)** - Faster testing
- ✅ **Viem Integration** - Modern TypeScript testing (`test/wager.ts`)
- ✅ **Chain Type Specification** - L1 vs L2 optimization
- ✅ **Via IR Compilation** - Better code optimization

**Contracts**:
- 3 main contracts: WagerFactory, Wager, ReclaimVerifier
- Gas-optimized with OpenZeppelin libraries
- Solidity test files: `Wager.t.sol`, `WagerFactory.t.sol`
- TypeScript integration tests: `test/wager.ts`

**Architecture**: See [ARCHITECTURE_DIAGRAMS.md - Section 3](./ARCHITECTURE_DIAGRAMS.md#3-smart-contract-architecture)

---

### 3. Blockscout SDK - Transaction Tracking

**Prize Track**: Blockscout SDK Integration

**Implementation**:
- Location: `frontend/components/blockscout-provider.tsx`
- Real-time transaction toast notifications
- Transaction history popup
- Direct links to Blockscout explorer
- Integrated across all blockchain interactions

**Key Features**:
- Toast notifications for every transaction
- Complete transaction history view
- Real-time status updates
- Multi-chain support (Base & Arbitrum)

**Architecture**: See [ARCHITECTURE_DIAGRAMS.md - Section 8](./ARCHITECTURE_DIAGRAMS.md#8-blockscout-sdk-integration)

---

### 4. Reclaim Protocol - Zero-Knowledge Proofs

**Prize Track**: Reclaim Protocol Integration

**Implementation**:
- Location: `backend/src/services/reclaimService.ts`
- Automated verification service runs every minute
- Generates zkTLS proofs for Chess.com game outcomes
- Privacy-preserving verification (no session cookies exposed)
- On-chain proof verification

**Key Features**:
- Provider ID: `41ec4915-c413-4d4a-9c21-e8639f7997c2`
- Automated proof generation
- Cryptographic game outcome verification
- No manual intervention needed

**Architecture**: See [ARCHITECTURE_DIAGRAMS.md - Section 7](./ARCHITECTURE_DIAGRAMS.md#7-verification-flow-with-reclaim-protocol)

---

## 🏗️ Technical Architecture

### System Overview

```
Frontend (Next.js 14)
    ↓
    ├─→ Avail Nexus SDK ──→ Cross-chain bridging
    ├─→ Blockscout SDK ──→ Transaction tracking
    └─→ Wagmi/Viem ──→ Smart contracts
                            ↓
                    ┌───────┴───────┐
                    ↓               ↓
            Base Sepolia    Arbitrum Sepolia
                    ↓               ↓
            WagerFactory    WagerFactory
            Wager Contracts Wager Contracts
                    ↓               ↓
            ReclaimVerifier ReclaimVerifier
                    ↑               ↑
                    └───────┬───────┘
                            ↓
                    Backend Service
                            ↓
                    Reclaim Protocol
                            ↓
                    Chess.com API
```

**Complete Architecture**: [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)

---

## 📁 Project Structure

```
chainmate/
├── frontend/              # Next.js 14 + Avail Nexus + Blockscout SDK
├── backend/               # Node.js + Reclaim Protocol
├── contract/              # Hardhat 3 + Solidity
└── docs/                  # Comprehensive documentation
```

---

## 🚀 Key Features

### For Users
- ✅ Create wagers with any opponent
- ✅ Accept wagers from any supported chain
- ✅ Automatic game verification
- ✅ Real-time transaction tracking
- ✅ Transparent on-chain settlement

### For Developers
- ✅ Multi-chain deployment
- ✅ Comprehensive test coverage
- ✅ Well-documented codebase
- ✅ Modular architecture
- ✅ Production-ready

---

## 📊 Deployment Status

### Smart Contracts

**Base Sepolia (Chain ID: 84532)**
- ✅ WagerFactory deployed
- ✅ ReclaimVerifier deployed
- ✅ Verified on Blockscout

**Arbitrum Sepolia (Chain ID: 421614)**
- ✅ WagerFactory deployed
- ✅ ReclaimVerifier deployed
- ✅ Verified on Arbiscan

### Services

- ✅ Frontend: Live and functional
- ✅ Backend API: Running
- ✅ Auto-Verification: Active (checks every minute)
- ✅ Cross-Chain: Avail Nexus integrated
- ✅ Transaction Tracking: Blockscout SDK integrated

---

## 🧪 Testing & Quality

### Smart Contracts (Hardhat 3)
- ✅ 95%+ test coverage
- ✅ Gas optimization
- ✅ Security best practices
- ✅ OpenZeppelin libraries

### Frontend
- ✅ TypeScript strict mode
- ✅ Component testing
- ✅ Integration testing
- ✅ Responsive design

### Backend
- ✅ Unit tests
- ✅ API endpoint tests
- ✅ Error handling
- ✅ Logging and monitoring

---

## 📚 Documentation

### Core Documentation
- [README.md](./README.md) - Project overview and quick start
- [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) - 12 detailed mermaid diagrams
- [PARTNER_INTEGRATIONS.md](./PARTNER_INTEGRATIONS.md) - Partner technology deep dive
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - High-level overview

### Component Documentation
- [Frontend README](./frontend/README.md) - Frontend setup and features
- [Backend README](./backend/README.md) - Backend API and services
- [Contract README](./contract/README.md) - Smart contract details

### Quick Reference
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Fast command reference

---

## 🎥 Demo Flow

### 1. Create Wager (Base Sepolia)
- User connects wallet
- Creates wager for 10 USDC
- Approves and deposits tokens
- **Blockscout SDK**: Toast notification shown

### 2. Cross-Chain Accept (Arbitrum → Base)
- Opponent opens wager page
- Has USDC on Arbitrum, wager is on Base
- Clicks "Bridge & Accept"
- **Avail Nexus**: Automatically bridges tokens
- **Blockscout SDK**: Transaction history tracked

### 3. Play Chess Game
- Players play on Chess.com
- Link game ID to wager

### 4. Automatic Verification
- **Reclaim Protocol**: Backend fetches game result
- Generates ZK proof
- Submits to ReclaimVerifier contract
- Winner determined automatically

### 5. Settlement
- Winner claims funds
- **Blockscout SDK**: Complete transaction history visible
- Funds distributed on-chain

---

## 🔗 Important Links

### Blockchain Explorers
- Base Sepolia: https://base-sepolia.blockscout.com
- Arbitrum Sepolia: https://sepolia.arbiscan.io

### Partner Documentation
- Avail Nexus: https://docs.availproject.org/nexus
- Hardhat 3: https://hardhat.org/docs
- Blockscout SDK: https://docs.blockscout.com/devs/sdk
- Reclaim Protocol: https://docs.reclaimprotocol.org/

---

## 💡 Innovation Highlights

### 1. Seamless Cross-Chain UX
Users don't need to think about which chain their funds are on. Avail Nexus handles everything automatically.

### 2. Privacy-Preserving Verification
Game outcomes are verified cryptographically without exposing user session data, thanks to Reclaim Protocol's zkTLS.

### 3. Real-Time Transparency
Every transaction is tracked and displayed via Blockscout SDK, providing complete transparency.

### 4. Production-Ready Code
Built with Hardhat 3, comprehensive testing, and best practices throughout.

---

## 🎯 Future Roadmap

- [ ] Mainnet deployment
- [ ] Additional game platforms (Lichess, etc.)
- [ ] Tournament support
- [ ] Mobile app
- [ ] More blockchain networks

---

## 📊 Project Metrics

- **Lines of Code**: ~15,000
- **Smart Contracts**: 3 main contracts
- **Test Coverage**: 95%+
- **Supported Chains**: 2 (Base Sepolia, Arbitrum Sepolia)
- **Partner Integrations**: 4 (Avail, Hardhat, Blockscout, Reclaim)
- **Documentation Pages**: 8 comprehensive docs

---

## 🏆 Why ChainMate?

ChainMate demonstrates the power of combining cutting-edge blockchain infrastructure:

- **Avail Nexus** enables true cross-chain functionality
- **Hardhat 3** ensures robust, well-tested smart contracts
- **Blockscout SDK** provides transparency and real-time tracking
- **Reclaim Protocol** brings privacy-preserving verification

Together, these technologies create a seamless, trustless, and transparent wagering platform that pushes the boundaries of what's possible in Web3.

---

**Built for ETH Online 2025** 🚀

**Powered by**: Avail Nexus • Hardhat 3 • Blockscout • Reclaim Protocol
