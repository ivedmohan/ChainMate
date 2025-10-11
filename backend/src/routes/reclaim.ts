import { Router } from 'express';
import { z } from 'zod';
import { reclaimService } from '../services/reclaimService';
import { chessService } from '../services/chessService';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const generateProofSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  expectedWinner: z.string().optional()
});

const verifyProofSchema = z.object({
  proof: z.any(),
  gameId: z.string().min(1, 'Game ID is required')
});

/**
 * POST /api/reclaim/generate-proof
 * Generate a Reclaim proof request for Chess.com game verification
 */
router.post('/generate-proof', validateRequest(generateProofSchema), async (req, res) => {
  try {
    const { gameId, expectedWinner } = req.body;

    console.log(`📝 Generating proof for game: ${gameId}`);

    // First, validate the game exists and is completed
    const isValidGame = await chessService.validateGame(gameId);
    if (!isValidGame) {
      return res.status(400).json({
        error: 'Invalid game',
        message: 'Game not found or not completed'
      });
    }

    // Get game data to include in response
    const gameData = await chessService.getGameData(gameId);

    // Generate Reclaim proof request
    const proofRequestUrl = await reclaimService.generateProofRequest({
      gameId,
      expectedWinner
    });

    res.json({
      success: true,
      data: {
        proofRequestUrl,
        gameData: {
          gameId: gameData.gameId,
          white: gameData.white.username,
          black: gameData.black.username,
          result: gameData.result,
          winner: gameData.winner,
          endTime: gameData.endTime
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating proof:', error);
    res.status(500).json({
      error: 'Proof generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reclaim/verify-proof
 * Verify a submitted Reclaim proof
 */
router.post('/verify-proof', validateRequest(verifyProofSchema), async (req, res) => {
  try {
    const { proof, gameId } = req.body;

    console.log(`🔍 Verifying proof for game: ${gameId}`);

    // Verify the proof using Reclaim service
    const verifiedData = await reclaimService.verifyProof(proof);

    // Cross-check with Chess.com API data
    const chessData = await chessService.getGameData(gameId);

    // Validate that proof data matches Chess.com data
    if (verifiedData.gameId !== chessData.gameId) {
      return res.status(400).json({
        error: 'Proof validation failed',
        message: 'Game ID mismatch between proof and Chess.com API'
      });
    }

    if (verifiedData.winner !== chessData.winner) {
      return res.status(400).json({
        error: 'Proof validation failed',
        message: 'Winner mismatch between proof and Chess.com API'
      });
    }

    res.json({
      success: true,
      data: {
        verified: true,
        gameId: verifiedData.gameId,
        winner: verifiedData.winner,
        result: verifiedData.result,
        whitePlayer: verifiedData.whitePlayer,
        blackPlayer: verifiedData.blackPlayer,
        endTime: verifiedData.endTime,
        proofHash: proof.hash || 'unknown'
      }
    });

  } catch (error) {
    console.error('❌ Error verifying proof:', error);
    res.status(500).json({
      error: 'Proof verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reclaim/proof-status/:requestId
 * Check the status of a proof request
 */
router.get('/proof-status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({
        error: 'Request ID is required'
      });
    }

    const status = await reclaimService.getProofStatus(requestId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Error checking proof status:', error);
    res.status(500).json({
      error: 'Failed to check proof status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as reclaimRoutes };