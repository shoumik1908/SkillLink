import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Trust proxy for rate limiters behind reverse proxies or tests
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === CLIENT_ORIGIN ||
        origin === 'http://localhost:5173' ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Basic Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillLink Server (Node + Express + Neon Postgres)',
  });
});

// API Routes (supports both /api/* and /* for reverse proxy compatibility)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/listings', '/listings'], listingRoutes);
app.use(['/api/requests', '/requests'], requestRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 SkillLink Server running on http://localhost:${PORT}`);
  console.log(`🔒 Allowed Client Origin: ${CLIENT_ORIGIN}`);
  console.log(`📡 Health check available at http://localhost:${PORT}/api/health`);

  // Keep-Alive Self-Ping (prevents Render free tier from sleeping after 15m of inactivity)
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || process.env.PING_URL;
  if (externalUrl) {
    const pingTarget = `${externalUrl.replace(/\/+$/, '')}/api/health`;
    const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
    console.log(`💓 [KEEP-ALIVE] Auto-ping active: pinging ${pingTarget} every 10 minutes`);

    setInterval(async () => {
      try {
        const response = await fetch(pingTarget, {
          headers: { 'User-Agent': 'SkillLink-InternalKeepAlive/1.0' },
        });
        if (response.ok) {
          console.log(`💓 [KEEP-ALIVE] Ping OK (${response.status}) at ${new Date().toLocaleTimeString()}`);
        } else {
          console.warn(`⚠️ [KEEP-ALIVE] Ping returned status ${response.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ [KEEP-ALIVE] Ping network error:`, err.message);
      }
    }, PING_INTERVAL);
  }
});

export default app;
