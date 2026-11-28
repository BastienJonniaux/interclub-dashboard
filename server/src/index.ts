import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';
import { prisma } from './prisma';
import { isAllowedOrigin } from './utils/cors';

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Requête bloquée depuis l'origine non autorisée : ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger in dev
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Mount API routes
app.use('/api', apiRouter);

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'Interclub Dashboard API',
    status: 'running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }
  console.error('[Unhandled Server Error]', err);
  return res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
});

const server = app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📡 Healthcheck available at http://localhost:${port}/api/health`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

