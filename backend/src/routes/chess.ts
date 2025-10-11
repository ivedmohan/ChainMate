import { Router } from 'express';
import { z } from 'zod';
import { chessService } from '../services/chessService';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const gameIdSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required')
});

const playerGamesSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  limit: z.number().min(1).max(50).optional().default(10)
});

/**
 * GET /api/chess/game/:gameId
 * Get Chess.com game data
 */
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        error: 'Game ID is required'
      });
    }

    console.log(`🔍 Fetching game data for: ${gameId}`);

    const gameData = await chessService.getGameData(gameId);

    res.json({
      success: true,
      data: gameData
    });

  } catch (error) {
    console.error('❌ Error fetching game data:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Game not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to fetch game data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chess/validate-game
 * Validate that a Chess.com game exists and is completed
 */
router.post('/validate-game', validateRequest(gameIdSchema), async (req, res) => {
  try {
    const { gameId } = req.body;

    console.log(`✅ Validating game: ${gameId}`);

    const isValid = await chessService.validateGame(gameId);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game',
        message: 'Game not found, not completed, or invalid'
      });
    }

    // If valid, also return game data
    const gameData = await chessService.getGameData(gameId);

    res.json({
      success: true,
      valid: true,
      data: gameData
    });

  } catch (error) {
    console.error('❌ Error validating game:', error);
    res.status(500).json({
      success: false,
      error: 'Game validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chess/player-games
 * Get recent games for a Chess.com player
 */
router.post('/player-games', validateRequest(playerGamesSchema), async (req, res) => {
  try {
    const { username, limit } = req.body;

    console.log(`🔍 Fetching games for player: ${username}`);

    const games = await chessService.getPlayerGames(username, limit);

    res.json({
      success: true,
      data: {
        username,
        games,
        count: games.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching player games:', error);
    res.status(500).json({
      error: 'Failed to fetch player games',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chess/health
 * Check Chess.com API connectivity
 */
router.get('/health', async (req, res) => {
  try {
    // Test with a known game ID or player
    const testResponse = await chessService.getPlayerGames('hikaru', 1);
    
    res.json({
      success: true,
      status: 'Chess.com API is accessible',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chess.com API health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'Chess.com API is not accessible',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as chessRoutes };