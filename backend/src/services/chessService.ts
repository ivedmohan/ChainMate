import axios from 'axios';

export interface ChessGameData {
  gameId: string;
  white: {
    username: string;
    rating: number;
  };
  black: {
    username: string;
    rating: number;
  };
  result: string;
  winner?: string;
  endTime: number;
  timeControl: string;
  rated: boolean;
  url: string;
}

export class ChessService {
  private baseUrl: string;
  private axiosInstance;

  constructor() {
    this.baseUrl = process.env.CHESS_COM_API_BASE_URL || 'https://api.chess.com/pub';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'ChainMate/1.0.0 (contact@chainmate.app)'
      }
    });
  }

  /**
   * Fetch game data from Chess.com API
   */
  async getGameData(gameId: string): Promise<ChessGameData> {
    try {
      console.log(`🔍 Fetching Chess.com game data for: ${gameId}`);

      // Chess.com game URLs can be in different formats
      // Extract the actual game ID if it's a full URL
      const actualGameId = this.extractGameId(gameId);
      
      const response = await this.axiosInstance.get(`/game/${actualGameId}`);
      const gameData = response.data;

      if (!gameData || !gameData.game) {
        throw new Error('Game not found or invalid response');
      }

      const game = gameData.game;
      
      // Parse game result
      const result = this.parseGameResult(game);
      
      const parsedGame: ChessGameData = {
        gameId: actualGameId,
        white: {
          username: game.white?.username || '',
          rating: game.white?.rating || 0
        },
        black: {
          username: game.black?.username || '',
          rating: game.black?.rating || 0
        },
        result: result.result,
        winner: result.winner,
        endTime: game.end_time * 1000, // Convert to milliseconds
        timeControl: game.time_control || '',
        rated: game.rated || false,
        url: game.url || `https://chess.com/game/live/${actualGameId}`
      };

      console.log('✅ Game data fetched successfully:', {
        gameId: parsedGame.gameId,
        result: parsedGame.result,
        winner: parsedGame.winner
      });

      return parsedGame;

    } catch (error) {
      console.error('❌ Error fetching Chess.com game data:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Game not found on Chess.com');
        } else if (error.response?.status === 429) {
          throw new Error('Rate limited by Chess.com API');
        }
      }
      
      throw new Error(`Failed to fetch game data: ${error}`);
    }
  }

  /**
   * Validate that a game exists and is completed
   */
  async validateGame(gameId: string): Promise<boolean> {
    try {
      const gameData = await this.getGameData(gameId);
      
      // Check if game is completed
      if (!gameData.result || gameData.result === 'in_progress') {
        return false;
      }

      // Check if game ended recently (within last 24 hours for security)
      const now = Date.now();
      const gameEndTime = gameData.endTime;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - gameEndTime > twentyFourHours) {
        console.warn('⚠️ Game is older than 24 hours');
        // Still valid, but log warning
      }

      return true;

    } catch (error) {
      console.error('❌ Game validation failed:', error);
      return false;
    }
  }

  /**
   * Get player's recent games
   */
  async getPlayerGames(username: string, limit: number = 10): Promise<ChessGameData[]> {
    try {
      console.log(`🔍 Fetching recent games for player: ${username}`);

      const response = await this.axiosInstance.get(`/player/${username}/games/recent`);
      const games = response.data.games || [];

      const parsedGames = games.slice(0, limit).map((game: any) => {
        const result = this.parseGameResult(game);
        
        return {
          gameId: this.extractGameId(game.url),
          white: {
            username: game.white?.username || '',
            rating: game.white?.rating || 0
          },
          black: {
            username: game.black?.username || '',
            rating: game.black?.rating || 0
          },
          result: result.result,
          winner: result.winner,
          endTime: game.end_time * 1000,
          timeControl: game.time_control || '',
          rated: game.rated || false,
          url: game.url
        };
      });

      console.log(`✅ Fetched ${parsedGames.length} games for ${username}`);
      return parsedGames;

    } catch (error) {
      console.error('❌ Error fetching player games:', error);
      throw new Error(`Failed to fetch player games: ${error}`);
    }
  }

  /**
   * Extract game ID from various Chess.com URL formats
   */
  private extractGameId(gameIdOrUrl: string): string {
    // If it's already just an ID, return it
    if (!gameIdOrUrl.includes('/')) {
      return gameIdOrUrl;
    }

    // Extract from various Chess.com URL formats
    const patterns = [
      /\/game\/live\/(\d+)/,
      /\/game\/(\d+)/,
      /\/live\/(\d+)/,
      /(\d+)$/
    ];

    for (const pattern of patterns) {
      const match = gameIdOrUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // If no pattern matches, assume it's the ID itself
    return gameIdOrUrl.replace(/[^0-9]/g, '');
  }

  /**
   * Parse game result from Chess.com API response
   */
  private parseGameResult(game: any): { result: string; winner?: string } {
    const pgn = game.pgn || '';
    const whiteUsername = game.white?.username || '';
    const blackUsername = game.black?.username || '';

    // Check PGN for result
    if (pgn.includes('1-0')) {
      return { result: 'white_wins', winner: whiteUsername };
    } else if (pgn.includes('0-1')) {
      return { result: 'black_wins', winner: blackUsername };
    } else if (pgn.includes('1/2-1/2')) {
      return { result: 'draw' };
    }

    // Fallback to other result indicators
    if (game.white?.result === 'win') {
      return { result: 'white_wins', winner: whiteUsername };
    } else if (game.black?.result === 'win') {
      return { result: 'black_wins', winner: blackUsername };
    } else if (game.white?.result === 'draw' || game.black?.result === 'draw') {
      return { result: 'draw' };
    }

    // If game is still in progress or result unclear
    return { result: 'unknown' };
  }
}

// Export singleton instance
export const chessService = new ChessService();