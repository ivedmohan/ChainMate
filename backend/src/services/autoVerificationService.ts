import { ethers } from 'ethers';
import cron from 'node-cron';
import { reclaimService } from './reclaimService';
import { WAGER_ABI, WAGER_FACTORY_ABI, RECLAIM_VERIFIER_ABI } from '../contracts/abis';

export interface WagerToVerify {
  address: string;
  gameId: string;
  creator: string;
  opponent: string;
  creatorUsername: string;
  opponentUsername: string;
}

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  reclaimVerifier: string;
  wagerFactory: string;
}

export class AutoVerificationService {
  private chains: Map<string, ChainConfig>;
  private providers: Map<string, ethers.JsonRpcProvider>;
  private wallets: Map<string, ethers.Wallet>;
  private isRunning: boolean = false;
  private checkInterval: number = 60000; // 1 minute

  constructor() {
    this.chains = new Map();
    this.providers = new Map();
    this.wallets = new Map();
    
    const privateKey = process.env.VERIFIER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VERIFIER_PRIVATE_KEY must be set in environment');
    }

    // Initialize supported chains
    this.initializeChains(privateKey);

    if (this.chains.size === 0) {
      throw new Error('No chains configured! Set at least one chain configuration.');
    }

    console.log('🤖 Auto-Verification Service initialized');
    console.log(`   Supported chains: ${this.chains.size}`);
    this.chains.forEach((config, name) => {
      console.log(`   - ${config.name} (Chain ID: ${config.chainId})`);
      console.log(`     Verifier: ${config.reclaimVerifier}`);
      console.log(`     Factory: ${config.wagerFactory}`);
    });
    console.log(`   Wallet: ${this.wallets.values().next().value?.address}`);
  }

  /**
   * Initialize chain configurations from environment
   */
  private initializeChains(privateKey: string) {
    // Base Sepolia
    const baseRpc = process.env.BASE_SEPOLIA_RPC_URL;
    const baseVerifier = process.env.BASE_RECLAIM_VERIFIER_ADDRESS;
    const baseFactory = process.env.BASE_WAGER_FACTORY_ADDRESS;

    if (baseRpc && baseVerifier && baseFactory) {
      const provider = new ethers.JsonRpcProvider(baseRpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      this.chains.set('base-sepolia', {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: baseRpc,
        reclaimVerifier: baseVerifier,
        wagerFactory: baseFactory
      });
      this.providers.set('base-sepolia', provider);
      this.wallets.set('base-sepolia', wallet);
    }

    // Arbitrum Sepolia
    const arbRpc = process.env.ARBITRUM_SEPOLIA_RPC_URL;
    const arbVerifier = process.env.ARBITRUM_RECLAIM_VERIFIER_ADDRESS;
    const arbFactory = process.env.ARBITRUM_WAGER_FACTORY_ADDRESS;

    if (arbRpc && arbVerifier && arbFactory) {
      const provider = new ethers.JsonRpcProvider(arbRpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      this.chains.set('arbitrum-sepolia', {
        name: 'Arbitrum Sepolia',
        chainId: 421614,
        rpcUrl: arbRpc,
        reclaimVerifier: arbVerifier,
        wagerFactory: arbFactory
      });
      this.providers.set('arbitrum-sepolia', provider);
      this.wallets.set('arbitrum-sepolia', wallet);
    }

    // Fallback to legacy env vars for backward compatibility
    const legacyRpc = process.env.RPC_URL;
    const legacyVerifier = process.env.RECLAIM_VERIFIER_ADDRESS;
    const legacyFactory = process.env.WAGER_FACTORY_ADDRESS;

    if (legacyRpc && legacyVerifier && legacyFactory && this.chains.size === 0) {
      const provider = new ethers.JsonRpcProvider(legacyRpc);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      this.chains.set('legacy', {
        name: 'Legacy Chain',
        chainId: 0,
        rpcUrl: legacyRpc,
        reclaimVerifier: legacyVerifier,
        wagerFactory: legacyFactory
      });
      this.providers.set('legacy', provider);
      this.wallets.set('legacy', wallet);
    }
  }

  /**
   * Start the automated verification service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Auto-Verification Service...');

    // Run immediately on start
    this.checkAndVerifyWagers();

    // Then run every minute
    cron.schedule('* * * * *', () => {
      if (this.isRunning) {
        this.checkAndVerifyWagers();
      }
    });

    console.log('✅ Service started - checking every minute');
  }

  /**
   * Stop the service
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Auto-Verification Service stopped');
  }

  /**
   * Main verification loop - checks all chains
   */
  private async checkAndVerifyWagers() {
    try {
      console.log('🔍 Checking for wagers needing verification...');

      // Check each configured chain
      for (const [chainKey, config] of this.chains.entries()) {
        await this.checkChainWagers(chainKey, config);
      }

    } catch (error) {
      console.error('❌ Error in verification loop:', error);
    }
  }

  /**
   * Check wagers on a specific chain
   */
  private async checkChainWagers(chainKey: string, config: ChainConfig) {
    try {
      console.log(`\n📡 Checking ${config.name}...`);

      const provider = this.providers.get(chainKey);
      if (!provider) return;

      const wagerFactory = new ethers.Contract(
        config.wagerFactory,
        WAGER_FACTORY_ABI,
        provider
      );

      // Get all wagers from factory
      const totalWagers = await wagerFactory.getTotalWagers();
      console.log(`   Found ${totalWagers} total wagers on ${config.name}`);

      const wagersToVerify: WagerToVerify[] = [];

      // Check each wager
      for (let i = 0; i < totalWagers; i++) {
        const wagerAddress = await wagerFactory.allWagers(i);
        const wagerData = await this.getWagerData(wagerAddress, provider);

        // Only process wagers in GameLinked state (state === 2)
        if (wagerData && wagerData.state === 2 && wagerData.gameId) {
          wagersToVerify.push({
            address: wagerAddress,
            gameId: wagerData.gameId,
            creator: wagerData.creator,
            opponent: wagerData.opponent,
            creatorUsername: wagerData.creatorChessUsername,
            opponentUsername: wagerData.opponentChessUsername
          });
        }
      }

      if (wagersToVerify.length === 0) {
        console.log(`   ✅ No wagers needing verification on ${config.name}`);
        return;
      }

      console.log(`   🎯 Found ${wagersToVerify.length} wager(s) to verify on ${config.name}`);

      // Process each wager
      for (const wager of wagersToVerify) {
        await this.verifyWager(wager, chainKey, config);
      }

    } catch (error) {
      console.error(`❌ Error checking ${config.name}:`, error);
    }
  }

  /**
   * Get wager data from contract
   */
  private async getWagerData(wagerAddress: string, provider: ethers.JsonRpcProvider): Promise<any> {
    try {
      const wager = new ethers.Contract(wagerAddress, WAGER_ABI, provider);
      const data = await wager.getWagerData();

      return {
        creator: data[0],
        opponent: data[1],
        token: data[2],
        amount: data[3],
        creatorChessUsername: data[4],
        opponentChessUsername: data[5],
        gameId: data[6],
        state: Number(data[7]), // Convert BigInt to Number for comparison
        winner: data[8],
        createdAt: data[9],
        fundedAt: data[10],
        expiresAt: data[11]
      };
    } catch (error) {
      console.error(`Error getting wager data for ${wagerAddress}:`, error);
      return null;
    }
  }

  /**
   * Verify a single wager
   */
  private async verifyWager(wager: WagerToVerify, chainKey: string, config: ChainConfig) {
    try {
      console.log(`\n🔐 Processing wager on ${config.name}: ${wager.address}`);
      console.log(`   Game ID: ${wager.gameId}`);
      console.log(`   Players: ${wager.creatorUsername} vs ${wager.opponentUsername}`);

      // Step 1: Fetch Chess.com game data via Reclaim Protocol
      console.log('   📡 Fetching game data from Chess.com...');
      
      // Use Reclaim SDK to generate and fetch proof
      const gameUrl = `https://www.chess.com/callback/live/game/${wager.gameId}`;
      const proofData = await this.fetchGameProofFromReclaim(wager.gameId, gameUrl);

      if (!proofData) {
        console.error('   ❌ Could not fetch game proof');
        return;
      }

      // Step 2: Validate the game data
      console.log('   ✅ Game data fetched successfully');
      
      // For now, skip Reclaim verification and use the game data directly
      // TODO: Integrate real Reclaim SDK proof generation
      const gameData = {
        gameId: wager.gameId,
        whitePlayer: proofData.claimData?.context ? 
          JSON.parse(proofData.claimData.context).extractedParameters.white_paper : 
          wager.creatorUsername,
        blackPlayer: proofData.claimData?.context ?
          JSON.parse(proofData.claimData.context).extractedParameters.black_player :
          wager.opponentUsername,
        result: proofData.claimData?.context ?
          JSON.parse(proofData.claimData.context).extractedParameters.result :
          '1-0', // Default for testing
        winner: wager.creatorUsername // Will be determined from result
      };
      
      console.log(`   Result: ${gameData.result}`);
      console.log(`   White: ${gameData.whitePlayer}, Black: ${gameData.blackPlayer}`);

      // Step 3: Validate usernames match
      if (!this.validateUsernames(gameData, wager)) {
        console.error('   ❌ Username mismatch!');
        return;
      }

      // Step 4: Determine winner address
      const winnerAddress = this.determineWinnerAddress(
        gameData,
        wager.creator,
        wager.opponent,
        wager.creatorUsername,
        wager.opponentUsername
      );

      console.log(`   Winner address: ${winnerAddress || 'Draw (0x0...)'}`);

      // Step 5: Encode proof for contract
      const encodedProof = this.encodeProof(proofData, gameData);

      // Step 6: Submit to ReclaimVerifier contract
      console.log('   📝 Submitting proof to contract...');
      
      const wallet = this.wallets.get(chainKey);
      if (!wallet) throw new Error(`Wallet not found for ${chainKey}`);

      const reclaimVerifier = new ethers.Contract(
        config.reclaimVerifier,
        RECLAIM_VERIFIER_ABI,
        wallet
      );
      
      const tx = await reclaimVerifier.verifyChessGameProof(
        encodedProof,
        wager.address,
        wager.creator,
        wager.opponent,
        {
          gasLimit: 500000 // Set reasonable gas limit
        }
      );

      console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      console.log(`   ✅ Verification complete! Block: ${receipt.blockNumber}`);
      console.log(`   🎉 Wager ${wager.address} resolved!`);

    } catch (error: any) {
      // Check if already verified
      if (error.message?.includes('WagerNotActive') || error.message?.includes('ProofAlreadyUsed')) {
        console.log(`   ⚠️ Wager already verified or resolved`);
      } else {
        console.error(`   ❌ Error verifying wager ${wager.address}:`, error.message);
      }
    }
  }

  /**
   * Fetch game proof from Reclaim Protocol
   * Using the provider: 41ec4915-c413-4d4a-9c21-e8639f7997c2
   */
  private async fetchGameProofFromReclaim(gameId: string, gameUrl: string): Promise<any> {
    try {
      // In a real implementation, you would:
      // 1. Generate a proof request using Reclaim SDK
      // 2. Make the actual call to Chess.com via Reclaim
      // 3. Get back the signed proof
      
      // For now, we'll simulate fetching from Chess.com directly
      // and format it as a Reclaim proof
      
      const axios = require('axios');
      const response = await axios.get(gameUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'P2PChess/1.0'
        }
      });

      if (!response.data) {
        throw new Error('No game data returned');
      }

      // Extract game result from Chess.com API response
      const gameData = response.data.game || response.data;
      const pgnHeaders = gameData.pgnHeaders || {};
      
      const whitePlayer = pgnHeaders.White || '';
      const blackPlayer = pgnHeaders.Black || '';
      const result = pgnHeaders.Result || '';

      // Create a Reclaim-style proof structure
      const proof = {
        claimData: {
          provider: '41ec4915-c413-4d4a-9c21-e8639f7997c2',
          parameters: gameId,
          context: JSON.stringify({
            extractedParameters: {
              URL_PARAMS_1_GRD: gameId,
              white_paper: whitePlayer, // Note: matches your provider typo
              black_player: blackPlayer,
              result: result
            },
            providerHash: '41ec4915-c413-4d4a-9c21-e8639f7997c2'
          }),
          timestampS: Math.floor(Date.now() / 1000).toString()
        },
        signatures: ['mock_signature'], // In real implementation, this comes from Reclaim
        witnesses: [
          {
            id: '0x000...', // Witness IDs from Reclaim
            url: 'https://witness.reclaimprotocol.org'
          }
        ]
      };

      return proof;

    } catch (error) {
      console.error('Error fetching game proof:', error);
      return null;
    }
  }

  /**
   * Validate that Chess.com usernames match wager participants
   */
  private validateUsernames(gameData: any, wager: WagerToVerify): boolean {
    const white = gameData.whitePlayer.toLowerCase();
    const black = gameData.blackPlayer.toLowerCase();
    const creator = wager.creatorUsername.toLowerCase();
    const opponent = wager.opponentUsername.toLowerCase();

    // Check if players match (in either order)
    const match1 = white === creator && black === opponent;
    const match2 = white === opponent && black === creator;

    return match1 || match2;
  }

  /**
   * Determine winner's blockchain address based on Chess.com result
   */
  private determineWinnerAddress(
    gameData: any,
    creatorAddress: string,
    opponentAddress: string,
    creatorUsername: string,
    opponentUsername: string
  ): string {
    const result = gameData.result;
    const white = gameData.whitePlayer.toLowerCase();
    const black = gameData.blackPlayer.toLowerCase();
    const creator = creatorUsername.toLowerCase();
    const opponent = opponentUsername.toLowerCase();

    console.log(`   🎯 Determining winner from result: ${result}`);
    console.log(`   White: ${white}, Black: ${black}`);
    console.log(`   Creator: ${creator}, Opponent: ${opponent}`);

    // Parse Chess.com result format
    // "1-0" = White wins
    // "0-1" = Black wins
    // "1/2-1/2" = Draw
    if (result === '1/2-1/2' || result === '1/2' || result === 'draw') {
      console.log(`   Result: Draw`);
      return ethers.ZeroAddress;
    }

    let winnerColor: 'white' | 'black' | null = null;
    
    if (result === '1-0') {
      winnerColor = 'white';
    } else if (result === '0-1') {
      winnerColor = 'black';
    } else {
      console.error(`   ❌ Unknown result format: ${result}`);
      return ethers.ZeroAddress;
    }

    console.log(`   Winner color: ${winnerColor}`);

    // Determine which player was which color
    const creatorIsWhite = white === creator;
    const creatorIsBlack = black === creator;
    const opponentIsWhite = white === opponent;
    const opponentIsBlack = black === opponent;

    console.log(`   Creator is ${creatorIsWhite ? 'white' : creatorIsBlack ? 'black' : 'unknown'}`);
    console.log(`   Opponent is ${opponentIsWhite ? 'white' : opponentIsBlack ? 'black' : 'unknown'}`);

    // Match winner color to player address
    if (winnerColor === 'white') {
      if (creatorIsWhite) {
        console.log(`   ✅ Creator (white) wins!`);
        return creatorAddress;
      } else if (opponentIsWhite) {
        console.log(`   ✅ Opponent (white) wins!`);
        return opponentAddress;
      }
    } else if (winnerColor === 'black') {
      if (creatorIsBlack) {
        console.log(`   ✅ Creator (black) wins!`);
        return creatorAddress;
      } else if (opponentIsBlack) {
        console.log(`   ✅ Opponent (black) wins!`);
        return opponentAddress;
      }
    }

    // Shouldn't reach here - username mismatch
    console.error(`   ❌ Could not determine winner address!`);
    console.error(`   Result: ${result}, White: ${white}, Black: ${black}`);
    console.error(`   Creator: ${creator}, Opponent: ${opponent}`);
    return ethers.ZeroAddress;
  }

  /**
   * Encode proof for ReclaimVerifier contract
   */
  private encodeProof(proofData: any, gameData: any): string {
    // Create the EncodedGameProof struct
    const proof = {
      gameId: gameData.gameId,
      result: gameData.result,
      timestamp: Math.floor(Date.now() / 1000),
      whitePlayerHash: ethers.keccak256(ethers.toUtf8Bytes(gameData.whitePlayer)),
      blackPlayerHash: ethers.keccak256(ethers.toUtf8Bytes(gameData.blackPlayer))
    };

    // Encode using the contract's struct format
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(string gameId, string result, uint256 timestamp, bytes32 whitePlayerHash, bytes32 blackPlayerHash)'],
      [[proof.gameId, proof.result, proof.timestamp, proof.whitePlayerHash, proof.blackPlayerHash]]
    );

    return encoded;
  }

  /**
   * Get service status
   */
  getStatus() {
    const chains = Array.from(this.chains.entries()).map(([key, config]) => ({
      key,
      name: config.name,
      chainId: config.chainId,
      reclaimVerifier: config.reclaimVerifier,
      wagerFactory: config.wagerFactory
    }));

    return {
      isRunning: this.isRunning,
      wallet: this.wallets.values().next().value?.address,
      chains,
      chainsCount: this.chains.size
    };
  }
}

// Create singleton instance
let serviceInstance: AutoVerificationService | null = null;

export function getAutoVerificationService(): AutoVerificationService {
  if (!serviceInstance) {
    serviceInstance = new AutoVerificationService();
  }
  return serviceInstance;
}

// Export for direct execution
if (require.main === module) {
  (async () => {
    try {
      const service = getAutoVerificationService();
      service.start();

      console.log('\n✅ Auto-Verification Service is running');
      console.log('   Press Ctrl+C to stop\n');

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down...');
        service.stop();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to start service:', error);
      process.exit(1);
    }
  })();
}

