import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the real Reclaim Protocol SDK
import { ReclaimProofRequest, verifyProof } from '@reclaimprotocol/js-sdk';

export interface ChessGameProof {
  gameId: string;
  winner: string;
  result: string;
  whitePlayer: string;
  blackPlayer: string;
  endTime: number;
  proof: any;
}

export interface ProofGenerationRequest {
  gameId: string;
  expectedWinner?: string;
}

export class ReclaimService {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.RECLAIM_APP_ID!;
    this.appSecret = process.env.RECLAIM_APP_SECRET!;

    if (!this.appId || !this.appSecret) {
      throw new Error('Reclaim credentials not configured');
    }
  }

  /**
   * Generate a proof request for Chess.com game verification
   * Uses provider ID: 41ec4915-c413-4d4a-9c21-e8639f7997c2
   */
  async generateProofRequest(request: ProofGenerationRequest): Promise<string> {
    try {
      console.log(`🔍 Generating proof request for game: ${request.gameId}`);

      // Create Reclaim proof request with Chess.com provider (following official docs)
      const reclaimProofRequest = await ReclaimProofRequest.init(
        this.appId,
        this.appSecret,
        '41ec4915-c413-4d4a-9c21-e8639f7997c2' // Chess.com provider ID
      );

      // Set callback URL for proof verification
      const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
      reclaimProofRequest.setAppCallbackUrl(`${baseUrl}/api/reclaim/receive-proofs`);

      // Generate the proof request configuration
      const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();
      
      console.log(`✅ Proof request config generated for game: ${request.gameId}`);
      
      // Return the configuration that the frontend will use
      return reclaimProofRequestConfig;

    } catch (error) {
      console.error('❌ Error generating proof request:', error);
      throw new Error(`Failed to generate proof request: ${error}`);
    }
  }

  /**
   * Verify a submitted proof from Reclaim Protocol
   */
  async verifyProof(proofData: any): Promise<ChessGameProof> {
    try {
      console.log('🔍 Verifying Reclaim proof...');

      // Verify the proof using Reclaim SDK (following official docs)
      const isValid = await verifyProof(proofData);
      if (!isValid) {
        throw new Error('Invalid proof signature');
      }

      // Extract game data from the proof
      const gameData = this.extractGameDataFromProof(proofData);

      console.log('✅ Proof verified successfully');
      return gameData;

    } catch (error) {
      console.error('❌ Error verifying proof:', error);
      throw new Error(`Proof verification failed: ${error}`);
    }
  }

  /**
   * Validate the cryptographic signature of the proof
   */
  private async validateProofSignature(proofData: any): Promise<boolean> {
    try {
      // TODO: Implement actual signature validation using Reclaim SDK
      // This is a placeholder - the actual implementation depends on Reclaim's verification methods

      // Basic validation checks
      if (!proofData || !proofData.signature || !proofData.data) {
        return false;
      }

      // Verify timestamp is recent (within 1 hour)
      const proofTimestamp = proofData.timestamp || 0;
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - proofTimestamp > oneHour) {
        console.warn('⚠️ Proof is too old');
        return false;
      }

      // TODO: Add actual cryptographic verification here
      return true;

    } catch (error) {
      console.error('❌ Error validating proof signature:', error);
      return false;
    }
  }

  /**
   * Extract chess game data from the verified proof
   */
  private extractGameDataFromProof(proofData: any): ChessGameProof {
    try {
      // Parse the Reclaim proof context to extract game information
      // This handles the specific format from Chess.com provider (41ec4915-c413-4d4a-9c21-e8639f7997c2)
      const context = JSON.parse(proofData.claimData?.context || '{}');
      const extractedParams = context.extractedParameters;

      if (!extractedParams) {
        throw new Error('No extracted parameters found in proof');
      }

      // Extract player information
      const whitePlayer = extractedParams.white_paper || extractedParams.white_player || ''; // Handle typo in provider
      const blackPlayer = extractedParams.black_player || '';
      const gameResult = extractedParams.result || '';

      // Determine winner based on result
      let winner = '';
      let result = '';

      if (gameResult.includes('1-0') || gameResult.toLowerCase().includes('white')) {
        winner = whitePlayer;
        result = 'white_wins';
      } else if (gameResult.includes('0-1') || gameResult.toLowerCase().includes('black')) {
        winner = blackPlayer;
        result = 'black_wins';
      } else if (gameResult.includes('1/2-1/2') || gameResult.toLowerCase().includes('draw')) {
        winner = '';
        result = 'draw';
      } else {
        throw new Error(`Unable to determine game result from: ${gameResult}`);
      }

      // Extract game ID from URL parameters if available
      const gameId = extractedParams.URL_PARAMS_1_GRD || 
                   proofData.claimData?.parameters || 
                   'unknown';

      return {
        gameId,
        winner,
        result,
        whitePlayer,
        blackPlayer,
        endTime: parseInt(proofData.claimData?.timestampS || '0') * 1000,
        proof: proofData
      };

    } catch (error) {
      console.error('❌ Error extracting game data:', error);
      throw new Error(`Failed to extract game data: ${error}`);
    }
  }

  /**
   * Get proof status by request ID
   */
  async getProofStatus(requestId: string): Promise<any> {
    try {
      // TODO: Implement proof status checking using Reclaim SDK
      console.log(`🔍 Checking proof status for request: ${requestId}`);

      // Placeholder implementation
      return {
        requestId,
        status: 'pending',
        message: 'Proof generation in progress'
      };

    } catch (error) {
      console.error('❌ Error checking proof status:', error);
      throw new Error(`Failed to check proof status: ${error}`);
    }
  }
}

// Export singleton instance
export const reclaimService = new ReclaimService();