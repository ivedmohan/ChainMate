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
   * Note: Chess.com doesn't have a direct /game/:id endpoint
   * We need to search through player's game archives or use the game URL directly
   */
  async getGameData(gameId: string): Promise<ChessGameData> {
    try {
      console.log(`🔍 Fetching Chess.com game data for: ${gameId}`);

      // If it's a full Chess.com URL, we can extract game info differently
      if (gameId.includes('chess.com')) {
        return await this.getGameDataFromUrl(gameId);
      }

      // For now, throw an error since we need more context (player name or game URL)
      throw new Error('Direct game ID lookup not supported. Please provide full Chess.com game URL or player context.');
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
   * Get game data from a Chess.com game URL
   */
  private async getGameDataFromUrl(gameUrl: string): Promise<ChessGameData> {
    try {
      // For Chess.com game URLs, we can sometimes extract the PGN directly
      // This is a simplified approach - in practice, you'd need to parse the HTML
      // or use Chess.com's official API methods

      const gameId = this.extractGameId(gameUrl);

      // Placeholder implementation - in reality, you'd need to:
      // 1. Parse the game URL to get player names and date
      // 2. Search through player's monthly archives
      // 3. Find the specific game by matching URL or timestamp

      // For now, return mock data since Chess.com doesn't have direct game ID lookup
      // In production, you'd need to implement proper game URL parsing or player archive search
      const mockGameData: ChessGameData = {
        gameId,
        white: { username: 'player1', rating: 1500 },
        black: { username: 'player2', rating: 1600 },
        result: 'white_wins',
        winner: 'player1',
        endTime: Date.now(),
        timeControl: '10+0',
        rated: true,
        url: gameUrl
      };

      console.log('✅ Mock game data returned for:', gameId);
      return mockGameData;

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