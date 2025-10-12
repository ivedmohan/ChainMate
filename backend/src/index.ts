import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { reclaimRoutes } from './routes/reclaim';
import { chessRoutes } from './routes/chess';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { getAutoVerificationService } from './services/autoVerificationService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
// Use express.text for Reclaim proof callbacks (as per documentation)
app.use(express.text({ type: '*/*', limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'chainmate-backend'
  });
});

// API routes
app.use('/api/reclaim', reclaimRoutes);
app.use('/api/chess', chessRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 ChainMate backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Reclaim API: http://localhost:${PORT}/api/reclaim`);
  console.log(`♟️  Chess API: http://localhost:${PORT}/api/chess`);
  
  // Start Auto-Verification Service if configured
  if (process.env.ENABLE_AUTO_VERIFICATION === 'true') {
    try {
      const verificationService = getAutoVerificationService();
      verificationService.start();
      console.log('✅ Auto-Verification Service started');
    } catch (error) {
      console.error('❌ Failed to start Auto-Verification Service:', error);
      console.error('   Make sure VERIFIER_PRIVATE_KEY and contract addresses are set');
    }
  } else {
    console.log('ℹ️  Auto-Verification Service disabled (set ENABLE_AUTO_VERIFICATION=true to enable)');
  }
});

export default app;