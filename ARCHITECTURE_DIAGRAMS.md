# ChainMate Architecture Diagrams

## 1. System Overview - High Level Architecture

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        UI[User Interface]
        Wagmi[Wagmi/Viem]
        RainbowKit[RainbowKit Wallet]
        AvailSDK[Avail Nexus SDK]
        BlockscoutSDK[Blockscout SDK]
    end

    subgraph "Backend - Node.js"
        API[Express API]
        AutoVerify[Auto-Verification Service]
        ReclaimService[Reclaim Service]
        ChessAPI[Chess.com API Client]
    end

    subgraph "Blockchain - Base Sepolia"
        BaseFactory[WagerFactory Contract]
        BaseWager[Wager Contracts]
        BaseVerifier[ReclaimVerifier Contract]
    end

    subgraph "Blockchain - Arbitrum Sepolia"
        ArbFactory[WagerFactory Contract]
        ArbWager[Wager Contracts]
        ArbVerifier[ReclaimVerifier Contract]
    end

    subgraph "External Services"
        ChessCom[Chess.com]
        Reclaim[Reclaim Protocol]
        AvailNexus[Avail Nexus Network]
        Blockscout[Blockscout Explorer]
    end

    UI --> Wagmi
    UI --> RainbowKit
    UI --> AvailSDK
    UI --> BlockscoutSDK
    
    Wagmi --> BaseFactory
    Wagmi --> ArbFactory
    Wagmi --> BaseWager
    Wagmi --> ArbWager
    
    AvailSDK --> AvailNexus
    AvailNexus --> BaseWager
    AvailNexus --> ArbWager
    
    BlockscoutSDK --> Blockscout
    Blockscout --> BaseFactory
    Blockscout --> ArbFactory
    
    API --> AutoVerify
    AutoVerify --> ReclaimService
    AutoVerify --> ChessAPI
    AutoVerify --> BaseVerifier
    AutoVerify --> ArbVerifier
    
    ReclaimService --> Reclaim
    ChessAPI --> ChessCom
    
    BaseVerifier --> BaseWager
    ArbVerifier --> ArbWager

    style AvailSDK fill:#4A90E2
    style AvailNexus fill:#4A90E2
    style BlockscoutSDK fill:#48C774
    style Blockscout fill:#48C774
    style Reclaim fill:#9B59B6
    style ReclaimService fill:#9B59B6
```

---

## 2. Complete Wager Lifecycle Flow

```mermaid
sequenceDiagram
    participant PlayerA as Player A (Creator)
    participant Frontend as Frontend UI
    participant Wallet as Wallet (RainbowKit)
    participant Factory as WagerFactory
    participant Wager as Wager Contract
    participant PlayerB as Player B (Opponent)
    participant Avail as Avail Nexus
    participant Chess as Chess.com
    participant Backend as Backend Service
    participant Reclaim as Reclaim Protocol
    participant Verifier as ReclaimVerifier
    participant Blockscout as Blockscout Explorer

    Note over PlayerA,Blockscout: Phase 1: Wager Creation (Base Sepolia)
    
    PlayerA->>Frontend: Create Wager (10 USDC, vs PlayerB)
    Frontend->>Wallet: Request signature
    Wallet->>Factory: createWager(opponent, token, amount)
    Factory->>Wager: Deploy new Wager contract
    Wager-->>Factory: Wager address
    Factory-->>Frontend: WagerCreated event
    Frontend->>Blockscout: Log transaction
    
    PlayerA->>Frontend: Approve USDC
    Frontend->>Wallet: Request approval
    Wallet->>Wager: approve(amount)
    Wager-->>Frontend: Approval confirmed
    Frontend->>Blockscout: Log transaction
    
    PlayerA->>Frontend: Deposit USDC
    Frontend->>Wallet: Request deposit
    Wallet->>Wager: creatorDeposit()
    Wager->>Wager: Update state to Created
    Wager-->>Frontend: Deposit confirmed
    Frontend->>Blockscout: Log transaction

    Note over PlayerA,Blockscout: Phase 2: Cross-Chain Acceptance (Arbitrum → Base)
    
    PlayerB->>Frontend: Open wager page (on Base)
    Frontend->>Wager: getWagerData()
    Wager-->>Frontend: Wager details
    Frontend->>Frontend: Detect: PlayerB has 0 USDC on Base
    Frontend->>Frontend: Show "Bridge & Accept" button
    
    PlayerB->>Frontend: Click "Bridge & Accept"
    Frontend->>Wallet: Initialize Avail Nexus SDK
    Wallet-->>Frontend: Provider ready
    Frontend->>Avail: bridgeAndExecute({from: Arbitrum, to: Base})
    
    Avail->>Avail: Find USDC on Arbitrum
    Avail->>Avail: Bridge USDC to Base
    Avail->>Wager: Approve USDC on Base
    Avail->>Wager: acceptWager(username)
    Wager->>Wager: Update state to Funded
    Wager-->>Frontend: WagerFunded event
    Frontend->>Blockscout: Log all transactions
    
    Note over PlayerA,Blockscout: Phase 3: Game Play
    
    PlayerA->>Chess: Play chess game
    PlayerB->>Chess: Play chess game
    Chess-->>Chess: Game completes (PlayerA wins)
    
    PlayerA->>Frontend: Link game ID
    Frontend->>Wallet: Request signature
    Wallet->>Wager: linkGame(gameId)
    Wager->>Wager: Update state to GameLinked
    Wager-->>Frontend: GameLinked event
    Frontend->>Blockscout: Log transaction

    Note over PlayerA,Blockscout: Phase 4: Automatic Verification
    
    Backend->>Backend: Cron job runs (every minute)
    Backend->>Factory: getTotalWagers()
    Factory-->>Backend: Wager count
    Backend->>Wager: getWagerData()
    Wager-->>Backend: Wager in GameLinked state
    
    Backend->>Chess: GET /game/{gameId}
    Chess-->>Backend: Game data (result: 1-0)
    Backend->>Reclaim: Generate ZK proof
    Reclaim-->>Backend: Signed proof
    
    Backend->>Verifier: verifyChessGameProof(proof, wager, players)
    Verifier->>Verifier: Validate proof
    Verifier->>Verifier: Determine winner (PlayerA)
    Verifier->>Wager: resolveWager(winner)
    Wager->>Wager: Update state to Completed
    Wager-->>Backend: OutcomeVerified event
    Backend->>Blockscout: Log transaction

    Note over PlayerA,Blockscout: Phase 5: Settlement
    
    PlayerA->>Frontend: Settle & Claim
    Frontend->>Wallet: Request signature
    Wallet->>Wager: settle()
    Wager->>Wager: Calculate fees (2%)
    Wager->>Wager: Transfer 19.6 USDC to PlayerA
    Wager->>Wager: Transfer 0.4 USDC to Treasury
    Wager->>Wager: Update state to Settled
    Wager-->>Frontend: WagerSettled event
    Frontend->>Blockscout: Log transaction
    
    Frontend->>Blockscout: Fetch all transactions
    Blockscout-->>Frontend: Transaction history
    Frontend->>PlayerA: Display complete history
```

---

## 3. Smart Contract Architecture

```mermaid
classDiagram
    class WagerFactory {
        +address treasury
        +mapping supportedTokens
        +Wager[] allWagers
        +mapping userWagers
        +createWager(opponent, token, amount, username)
        +getUserWagers(user) Wager[]
        +isSupportedToken(token) bool
        +getStats() Stats
    }

    class Wager {
        +address creator
        +address opponent
        +address token
        +uint256 amount
        +string creatorChessUsername
        +string opponentChessUsername
        +string gameId
        +WagerState state
        +address winner
        +creatorDeposit()
        +acceptWager(username)
        +linkGame(gameId)
        +resolveWager(winner)
        +settle()
        +cancel()
    }

    class ReclaimVerifier {
        +mapping usedProofs
        +mapping resolvedWagers
        +verifyChessGameProof(proof, wager, players)
        -_verifyAndExtractProof(proof)
        -_determineWinner(result, players)
        -_validateWagerParticipants(wager, proof)
    }

    class IERC20 {
        <<interface>>
        +transfer(to, amount)
        +transferFrom(from, to, amount)
        +approve(spender, amount)
        +balanceOf(account) uint256
    }

    WagerFactory --> Wager : creates
    Wager --> IERC20 : uses
    ReclaimVerifier --> Wager : resolves
    WagerFactory --> ReclaimVerifier : references

    note for Wager "States: Created → Funded → GameLinked → Completed → Settled"
    note for ReclaimVerifier "Verifies Chess.com game results using ZK proofs"
```

---

## 4. Frontend Component Architecture

```mermaid
flowchart TD
    A[App Layout] --> B[Web3Provider]
    A --> C[Navbar]
    
    B --> D[RainbowKit]
    B --> E[TanStack Query]
    
    F[Home Page] --> G[Hero Component]
    H[Dashboard] --> I[WagerCard]
    J[Create Wager] --> K[WagerForm]
    L[Wager Detail] --> I
    L --> M[Transaction History]
    
    K --> N[useCreateWager]
    I --> O[useWagerData]
    I --> P[useAcceptWager]
    I --> Q[useCrossChainAccept]
    M --> R[useTransactionPopup]
    
    N --> S[Wagmi/Viem]
    O --> S
    P --> S
    Q --> T[Avail Nexus SDK]
    R --> U[Blockscout SDK]
    
    T --> S
    U --> V[Blockscout API]

    classDef avail fill:#4A90E2,stroke:#333,stroke-width:2px
    classDef blockscout fill:#48C774,stroke:#333,stroke-width:2px
    classDef core fill:#FFD700,stroke:#333,stroke-width:2px
    
    class Q,T avail
    class M,R,U blockscout
    class S,B,D,E core
```

---

## 5. Backend Service Architecture

```mermaid
graph TB
    subgraph "Express Server"
        Server[Express App]
        Routes[API Routes]
        Middleware[Middleware]
    end

    subgraph "Services"
        AutoVerify[AutoVerificationService]
        ReclaimSvc[ReclaimService]
        ChessSvc[ChessService]
    end

    subgraph "External APIs"
        ChessAPI[Chess.com API]
        ReclaimAPI[Reclaim Protocol]
    end

    subgraph "Blockchain"
        BaseChain[Base Sepolia RPC]
        ArbChain[Arbitrum Sepolia RPC]
    end

    Server --> Routes
    Server --> Middleware
    Routes --> AutoVerify
    Routes --> ReclaimSvc
    Routes --> ChessSvc
    
    AutoVerify --> ReclaimSvc
    AutoVerify --> ChessSvc
    AutoVerify --> BaseChain
    AutoVerify --> ArbChain
    
    ReclaimSvc --> ReclaimAPI
    ChessSvc --> ChessAPI
    
    AutoVerify -.->|Cron: Every 1 min| AutoVerify

    note1[Monitors wagers in GameLinked state]
    note2[Fetches game results from Chess.com]
    note3[Generates ZK proofs via Reclaim]
    note4[Submits proofs to ReclaimVerifier]
    
    AutoVerify -.-> note1
    AutoVerify -.-> note2
    AutoVerify -.-> note3
    AutoVerify -.-> note4
```

---

## 6. Cross-Chain Flow with Avail Nexus

```mermaid
sequenceDiagram
    participant User as Player B (Arbitrum)
    participant UI as Frontend
    participant Wallet as Wallet
    participant AvailSDK as Avail Nexus SDK
    participant ArbChain as Arbitrum Chain
    participant AvailNetwork as Avail Network
    participant BaseChain as Base Chain
    participant Wager as Wager Contract

    Note over User,Wager: Player B has USDC on Arbitrum, Wager is on Base

    User->>UI: Click "Bridge & Accept"
    UI->>UI: Detect insufficient balance on Base
    UI->>AvailSDK: Initialize SDK
    AvailSDK->>Wallet: Request provider
    Wallet-->>AvailSDK: EIP-1193 provider
    
    UI->>AvailSDK: bridgeAndExecute({<br/>token: USDC,<br/>amount: 10,<br/>toChainId: Base,<br/>execute: acceptWager()})
    
    AvailSDK->>AvailSDK: Scan all chains for USDC
    AvailSDK->>ArbChain: Check USDC balance
    ArbChain-->>AvailSDK: Balance: 10 USDC ✓
    
    Note over AvailSDK,AvailNetwork: Step 1: Bridge Tokens
    
    AvailSDK->>Wallet: Request signature (Bridge)
    Wallet->>User: Approve bridge transaction
    User-->>Wallet: Approved
    Wallet->>ArbChain: Lock 10 USDC
    ArbChain->>AvailNetwork: Bridge request
    AvailNetwork->>BaseChain: Mint 10 USDC to user
    
    Note over AvailSDK,BaseChain: Step 2: Approve Contract
    
    AvailSDK->>Wallet: Request signature (Approve)
    Wallet->>User: Approve token spending
    User-->>Wallet: Approved
    Wallet->>BaseChain: approve(Wager, 10 USDC)
    
    Note over AvailSDK,Wager: Step 3: Execute Function
    
    AvailSDK->>Wallet: Request signature (Execute)
    Wallet->>User: Approve wager acceptance
    User-->>Wallet: Approved
    Wallet->>Wager: acceptWager(username)
    Wager->>Wager: transferFrom(user, wager, 10 USDC)
    Wager->>Wager: Update state to Funded
    Wager-->>AvailSDK: Success
    
    AvailSDK-->>UI: BridgeAndExecuteResult
    UI->>User: ✅ Wager accepted!

    Note over User,Wager: Total: 3 wallet popups, ~2-5 minutes
```

---

## 7. Verification Flow with Reclaim Protocol

```mermaid
sequenceDiagram
    participant Backend as Backend Service
    participant ChessAPI as Chess.com API
    participant Reclaim as Reclaim Protocol
    participant Verifier as ReclaimVerifier
    participant Wager as Wager Contract

    Note over Backend,Wager: Automatic verification runs every minute

    Backend->>Backend: Cron job triggered
    Backend->>Wager: getWagerData()
    Wager-->>Backend: State: GameLinked, GameID: 123456

    Note over Backend,Reclaim: Step 1: Fetch Game Data

    Backend->>ChessAPI: GET /game/123456
    ChessAPI-->>Backend: {<br/>White: "Magnus",<br/>Black: "Hikaru",<br/>Result: "1-0"<br/>}

    Note over Backend,Reclaim: Step 2: Generate ZK Proof

    Backend->>Reclaim: Generate proof for game 123456
    Reclaim->>ChessAPI: Verify game data (zkTLS)
    ChessAPI-->>Reclaim: Game data confirmed
    Reclaim->>Reclaim: Create cryptographic proof
    Reclaim-->>Backend: Signed proof + metadata

    Note over Backend,Verifier: Step 3: Encode Proof

    Backend->>Backend: encodeProof({<br/>gameId: "123456",<br/>result: "1-0",<br/>timestamp: now,<br/>whiteHash: hash("Magnus"),<br/>blackHash: hash("Hikaru")<br/>})

    Note over Backend,Wager: Step 4: Submit to Contract

    Backend->>Verifier: verifyChessGameProof(<br/>encodedProof,<br/>wagerAddress,<br/>whiteAddress,<br/>blackAddress)

    Verifier->>Verifier: Decode proof
    Verifier->>Verifier: Validate timestamp
    Verifier->>Verifier: Check proof not used
    Verifier->>Verifier: Determine winner:<br/>"1-0" → whiteAddress

    Verifier->>Wager: resolveWager(whiteAddress, "1-0")
    Wager->>Wager: Set winner = whiteAddress
    Wager->>Wager: Update state to Completed
    Wager-->>Verifier: Success
    Verifier-->>Backend: OutcomeVerified event

    Backend->>Backend: Log: ✅ Wager verified!
```

---

## 8. Blockscout Integration

```mermaid
graph TB
    subgraph "Frontend"
        WagerPage[Wager Detail Page]
        TxHistory[TransactionHistory Component]
        TxCard[Transaction Card]
    end

    subgraph "Blockscout SDK"
        SDK[Blockscout Client]
        API[Blockscout API]
    end

    subgraph "Blockscout Explorer"
        BaseExplorer[Base Sepolia Explorer]
        ArbExplorer[Arbitrum Sepolia Explorer]
    end

    subgraph "Blockchain Data"
        BaseTx[Base Transactions]
        ArbTx[Arbitrum Transactions]
    end

    WagerPage --> TxHistory
    TxHistory --> SDK
    SDK --> API
    
    API --> BaseExplorer
    API --> ArbExplorer
    
    BaseExplorer --> BaseTx
    ArbExplorer --> ArbTx
    
    TxHistory --> TxCard
    TxCard -.->|Link| BaseExplorer
    TxCard -.->|Link| ArbExplorer

    note1[Fetch all transactions<br/>for wager address]
    note2[Display: hash, status,<br/>timestamp, gas used]
    note3[Link to Blockscout<br/>for details]
    
    SDK -.-> note1
    TxCard -.-> note2
    TxCard -.-> note3

    style SDK fill:#48C774
    style TxHistory fill:#48C774
```

---

## 9. Data Flow - Token Transfers

```mermaid
graph LR
    subgraph "Player A Wallet"
        A_USDC[10 USDC]
    end

    subgraph "Wager Contract"
        Escrow[Escrow: 20 USDC]
    end

    subgraph "Player B Wallet - Arbitrum"
        B_USDC_ARB[10 USDC]
    end

    subgraph "Player B Wallet - Base"
        B_USDC_BASE[0 USDC]
    end

    subgraph "Avail Network"
        Bridge[Bridge]
    end

    subgraph "Treasury"
        Fees[0.4 USDC]
    end

    subgraph "Winner Wallet"
        Winnings[19.6 USDC]
    end

    A_USDC -->|1. Deposit| Escrow
    B_USDC_ARB -->|2. Bridge via Avail| Bridge
    Bridge -->|3. Receive on Base| B_USDC_BASE
    B_USDC_BASE -->|4. Deposit| Escrow
    Escrow -->|5. Settlement: 98%| Winnings
    Escrow -->|5. Settlement: 2%| Fees

    style Bridge fill:#4A90E2
    style Escrow fill:#FFD700
    style Winnings fill:#48C774
```

---

## 10. Technology Stack Overview

```mermaid
mindmap
  root((ChainMate))
    Frontend
      Next.js 15
      React 19
      TypeScript
      Tailwind CSS
      shadcn/ui
      Wagmi v2
      Viem v2
      RainbowKit
      TanStack Query
      Avail Nexus SDK
      Blockscout SDK
    Backend
      Node.js
      Express
      TypeScript
      Ethers.js
      Axios
      Cron Jobs
    Smart Contracts
      Solidity 0.8.28
      Hardhat 3
      OpenZeppelin
      SafeERC20
      ReentrancyGuard
    Blockchain
      Base Sepolia
      Arbitrum Sepolia
      USDC Token
      PYUSD Token
    External Services
      Chess.com API
      Reclaim Protocol
      Avail Nexus
      Blockscout Explorer
    Testing
      Hardhat Tests
      Solidity Tests
      TypeScript Tests
```

---

## 11. Prize Track Integration Points

```mermaid
graph TB
    subgraph "Avail Nexus - $5,000"
        AvailUI[Cross-Chain Accept Button]
        AvailSDK[Avail Nexus SDK]
        AvailFlow[Bridge & Execute Flow]
    end

    subgraph "Blockscout - $3,000"
        BlockUI[Transaction History]
        BlockSDK[Blockscout SDK]
        BlockLinks[Explorer Links]
    end

    subgraph "Hardhat 3 - $5,000"
        HardhatConfig[Hardhat 3 Config]
        HardhatTests[Comprehensive Tests]
        HardhatDeploy[Multi-Chain Deploy]
    end

    subgraph "Core Platform"
        Contracts[Smart Contracts]
        Frontend[Frontend UI]
        Backend[Backend Service]
    end

    AvailUI --> Frontend
    AvailSDK --> AvailFlow
    AvailFlow --> Contracts

    BlockUI --> Frontend
    BlockSDK --> BlockLinks
    BlockLinks --> Contracts

    HardhatConfig --> Contracts
    HardhatTests --> Contracts
    HardhatDeploy --> Contracts

    Frontend --> Contracts
    Backend --> Contracts

    style AvailUI fill:#4A90E2
    style AvailSDK fill:#4A90E2
    style AvailFlow fill:#4A90E2
    style BlockUI fill:#48C774
    style BlockSDK fill:#48C774
    style BlockLinks fill:#48C774
    style HardhatConfig fill:#FF6B6B
    style HardhatTests fill:#FF6B6B
    style HardhatDeploy fill:#FF6B6B
```

---

## 12. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LocalFE[Local Frontend<br/>localhost:3000]
        LocalBE[Local Backend<br/>localhost:3001]
    end

    subgraph "Base Sepolia Testnet"
        BaseRPC[Base Sepolia RPC]
        BaseFactory[WagerFactory<br/>0x8f3d...dd72]
        BaseVerifier[ReclaimVerifier<br/>0xe9fa...9481]
        BaseWagers[Wager Contracts]
        BaseUSDC[USDC Token<br/>0x036C...CF7e]
    end

    subgraph "Arbitrum Sepolia Testnet"
        ArbRPC[Arbitrum Sepolia RPC]
        ArbFactory[WagerFactory<br/>0x7a57...4c9]
        ArbVerifier[ReclaimVerifier<br/>0xa8f1...cfe8]
        ArbWagers[Wager Contracts]
        ArbUSDC[USDC Token<br/>0x75fa...AA4d]
        ArbPYUSD[PYUSD Token<br/>0x637A...B1B1]
    end

    subgraph "Avail Network"
        AvailBridge[Avail Bridge]
    end

    LocalFE --> BaseRPC
    LocalFE --> ArbRPC
    LocalBE --> BaseRPC
    LocalBE --> ArbRPC

    BaseFactory --> BaseWagers
    BaseVerifier --> BaseWagers
    BaseWagers --> BaseUSDC

    ArbFactory --> ArbWagers
    ArbVerifier --> ArbWagers
    ArbWagers --> ArbUSDC
    ArbWagers --> ArbPYUSD

    AvailBridge -.->|Bridge USDC| BaseUSDC
    AvailBridge -.->|Bridge USDC| ArbUSDC

    style BaseFactory fill:#0052FF
    style ArbFactory fill:#28A0F0
    style AvailBridge fill:#4A90E2
```

---

## Legend

- 🔵 Blue: Avail Nexus Integration
- 🟢 Green: Blockscout Integration  
- 🔴 Red: Hardhat 3 Integration
- 🟡 Yellow: Core Platform Components
- 🟣 Purple: Reclaim Protocol Integration

---

These diagrams are rendered automatically by GitHub, GitLab, and most Markdown viewers!
