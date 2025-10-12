const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// API response types
export interface GameValidationResponse {
  success: boolean
  game: {
    white: string
    black: string
    result: string
    url: string
    timeControl: string
    endTime: string
  } | null
  error?: string
}

export interface ReclaimProofResponse {
  success: boolean
  proof: {
    identifier: string
    claimData: {
      provider: string
      parameters: string
      owner: string
      timestampS: number
      context: string
      contextAddress: string
      contextMessage: string
      epoch: number
    }
    signatures: string[]
  } | null
  error?: string
}

// API client class
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health')
  }

  // Validate Chess.com game
  async validateGame(gameUrl: string): Promise<GameValidationResponse> {
    return this.request('/api/chess/validate-game', {
      method: 'POST',
      body: JSON.stringify({ gameUrl }),
    })
  }

  // Generate Reclaim proof
  async generateReclaimProof(gameUrl: string): Promise<ReclaimProofResponse> {
    return this.request('/api/reclaim/generate-proof', {
      method: 'POST',
      body: JSON.stringify({ gameUrl }),
    })
  }

  // Verify Reclaim proof
  async verifyReclaimProof(proof: any): Promise<{ success: boolean; error?: string }> {
    return this.request('/api/reclaim/verify-proof', {
      method: 'POST',
      body: JSON.stringify({ proof }),
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export individual functions for easier use
export const validateGame = (gameUrl: string) => apiClient.validateGame(gameUrl)
export const generateReclaimProof = (gameUrl: string) => apiClient.generateReclaimProof(gameUrl)
export const verifyReclaimProof = (proof: any) => apiClient.verifyReclaimProof(proof)
