# ChainMate Backend

Backend service for ChainMate P2P ZK Wagering platform. Handles Reclaim Protocol integration for zero-knowledge proof generation and verification of Chess.com game outcomes.

## 🚀 Features

- **Reclaim Protocol Integration**: Generate and verify ZK proofs for Chess.com games
- **Chess.com API Integration**: Fetch and validate game data
- **RESTful API**: Clean endpoints for frontend integration
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Zod schema validation
- **Error Handling**: Comprehensive error management
- **TypeScript**: Full type safety

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## 🔧 Configuration

Update `.env` file with your settings:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Reclaim Protocol Configuration
RECLAIM_APP_ID=your_reclaim_app_id
RECLAIM_APP_SECRET=your_reclaim_app_secret

# Chess.com API Configuration
CHESS_COM_API_BASE_URL=https://api.chess.com/pub

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Development with logging
npm run dev:log

# Production build
npm run build
npm start

# Production with logging
npm run start:log

# Run tests
npm test

# Clean build and logs
npm run clean
```

## 📋 Logs

Server logs are stored in the `logs/` directory:
- `logs/server.log` - Main server log file
- Use `npm run dev:log` or `npm run start:log` to enable file logging

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Reclaim Protocol Endpoints

#### Generate Proof Request
```
POST /api/reclaim/generate-proof
Content-Type: application/json

{
  "gameId": "12345678",
  "expectedWinner": "username" // optional
}
```

#### Verify Proof
```
POST /api/reclaim/verify-proof
Content-Type: application/json

{
  "proof": { /* Reclaim proof object */ },
  "gameId": "12345678"
}
```

#### Check Proof Status
```
GET /api/reclaim/proof-status/:requestId
```

### Chess.com API Endpoints

#### Get Game Data
```
GET /api/chess/game/:gameId
```

#### Validate Game
```
POST /api/chess/validate-game
Content-Type: application/json

{
  "gameId": "12345678"
}
```

#### Get Player Games
```
POST /api/chess/player-games
Content-Type: application/json

{
  "username": "hikaru",
  "limit": 10 // optional, default 10, max 50
}
```

#### Chess.com API Health Check
```
GET /api/chess/health
```

## 🔄 Workflow

1. **Game Validation**: Validate Chess.com game exists and is completed
2. **Proof Generation**: Generate Reclaim proof request for the game
3. **User Interaction**: User completes proof generation via Reclaim
4. **Proof Verification**: Verify submitted proof and cross-check with Chess.com
5. **Smart Contract**: Submit verified proof to blockchain

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test Chess.com game fetch
curl http://localhost:3001/api/chess/game/12345678

# Test game validation
curl -X POST http://localhost:3001/api/chess/validate-game \
  -H "Content-Type: application/json" \
  -d '{"gameId": "12345678"}'

# Test proof generation
curl -X POST http://localhost:3001/api/reclaim/generate-proof \
  -H "Content-Type: application/json" \
  -d '{"gameId": "12345678", "expectedWinner": "hikaru"}'
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global error handling
│   │   ├── rateLimiter.ts     # Rate limiting middleware
│   │   └── validation.ts      # Request validation
│   ├── routes/
│   │   ├── chess.ts           # Chess.com API routes
│   │   └── reclaim.ts         # Reclaim Protocol routes
│   ├── services/
│   │   ├── chessService.ts    # Chess.com API integration
│   │   └── reclaimService.ts  # Reclaim Protocol integration
│   └── index.ts               # Main server file
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🔒 Security Features

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Zod schema validation for all inputs
- **CORS Protection**: Configurable allowed origins
- **Helmet**: Security headers
- **Error Sanitization**: No sensitive data in error responses

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": [/* Validation errors if applicable */]
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## 🔗 Integration

This backend integrates with:
- **Reclaim Protocol**: ZK proof generation and verification
- **Chess.com API**: Game data fetching and validation
- **ChainMate Frontend**: React application
- **Smart Contracts**: Ethereum/Base/Arbitrum contracts

## 📝 Development Notes

- Uses TypeScript for type safety
- Implements singleton pattern for services
- Includes comprehensive logging
- Follows RESTful API conventions
- Supports both development and production environments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details