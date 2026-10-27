/**
 * SkillLink Render Keep-Alive Script
 *
 * Pings the backend health endpoint every 10 minutes to prevent Render free tier from sleeping.
 *
 * Usage:
 *   node scripts/keepAlive.js https://skilllink-server.onrender.com
 *   OR npm run keep-alive
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const targetHost =
  process.argv[2] ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.SERVER_URL ||
  process.env.PING_URL ||
  'http://localhost:5000';

const healthEndpoint = `${targetHost.replace(/\/+$/, '')}/api/health`;
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

console.log('--------------------------------------------------');
console.log('🚀 SkillLink Keep-Alive Pinger Initialized');
console.log(`🎯 Target URL: ${healthEndpoint}`);
console.log(`⏱️ Interval  : Every 10 minutes (600,000 ms)`);
console.log('--------------------------------------------------\n');

async function sendPing() {
  const timestamp = new Date().toLocaleTimeString();
  const startTime = Date.now();

  try {
    const res = await fetch(healthEndpoint, {
      headers: { 'User-Agent': 'SkillLink-KeepAlive/1.0' },
    });
    const duration = Date.now() - startTime;

    if (res.ok) {
      console.log(`[${timestamp}] 💓 Ping SUCCESS - HTTP ${res.status} (${duration}ms)`);
    } else {
      console.warn(`[${timestamp}] ⚠️ Ping returned non-OK status: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[${timestamp}] ❌ Ping FAILED: ${err.message}`);
  }
}

// 1. Send first ping immediately
sendPing();

// 2. Schedule recurring ping every 10 minutes
setInterval(sendPing, PING_INTERVAL_MS);
