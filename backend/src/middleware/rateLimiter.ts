import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  const clientId = req.ip || 'unknown';
  const now = Date.now();

  // Clean up expired entries
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  // Initialize or get client data
  if (!store[clientId]) {
    store[clientId] = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  const clientData = store[clientId];

  // Reset if window has expired
  if (clientData.resetTime < now) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }

  // Check if limit exceeded
  if (clientData.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`,
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  // Increment counter
  clientData.count++;

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': (maxRequests - clientData.count).toString(),
    'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
  });

  next();
};