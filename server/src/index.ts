import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';
import { prisma } from './prisma';

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Allow wildcard if configured
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Requête bloquée depuis l'origine non autorisée : ${origin}`);
      return callback(new Error(`Bloqué par la politique CORS : l'origine ${origin} n'est pas autorisée.`));
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

