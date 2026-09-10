// /api/config.js
//
// Reads/writes the Meaw Quest admin config (channels, missions, redeem codes,
// economy settings, maintenance mode, verifyEndpoint, etc.) from MongoDB Atlas.
//
//   GET  /api/config            -> returns the current config (creates a
//                                   default one on first run if none exists)
//   POST /api/config            -> replaces the config document
//                                   requires header:  x-admin-secret: <ADMIN_SECRET>
//
// Nothing here ever exposes MONGODB_URI or ADMIN_SECRET to the client — they
// only exist as Vercel environment variables on the server.

import getClientPromise from '../lib/mongodb.js';

const DB_NAME = 'meawquest';
const COLLECTION = 'config';
const DOC_ID = 'admin_config';

const DEFAULT_CONFIG = {
  _id: DOC_ID,
  coinPrice: 0.0021,
  farmReward: 250,
  adReward: 15,
  adLimit: 10,
  refAdsNeeded: 5,
  refBonus: 100,
  refCommissionPct: 10,
  minWithdraw: 1000,
  coinPerDollar: 5000,
  wdAdsNeeded: 5,
  maintenance: false,
  // Same-origin relative path — works automatically since verify-join.js is
  // deployed in this same Vercel project. No manual URL editing needed.
  verifyEndpoint: '/api/verify-join',
  channels: [
    { name: 'JackFruit Quest Official', link: 'https://t.me/JackFruitQuest_Official' },
    { name: 'JackFruit Quest Payout', link: 'https://t.me/JackFruitQuest_Payout' },
    { name: 'Crypto Learn 90', link: 'https://t.me/Crypto_Learn90' }
  ],
  missions: [
    { id: 'm_tg_1', name: 'Follow Telegram Channel', reward: 50, category: 'telegram', link: 'https://t.me/JackFruitQuest_Official' },
    { id: 'm_tw_1', name: 'Follow on Twitter/X', reward: 50, category: 'twitter', link: 'https://twitter.com/' },
    { id: 'm_ms_1', name: 'Visit Partner Website (30s)', reward: 30, category: 'mission', link: 'https://example.com' }
  ],
  redeemCodes: [
    { code: 'WELCOME50', amount: 50, maxUses: 1000, usedBy: [] }
  ],
  boosts: [
    { name: 'Speed Boost x2', cost: 500, mult: 2 },
    { name: 'Speed Boost x3', cost: 1500, mult: 3 },
    { name: 'Speed Boost x5', cost: 4000, mult: 5 }
  ],
  withdrawMethods: [
    { name: 'TON', icon: '💎' },
    { name: 'USDT (TON)', icon: '💵' }
  ],
  spinPrizes: [
    { value: 20, weight: 28, color: '#e05a4e' },
    { value: 50, weight: 24, color: '#f4c430' },
    { value: 10, weight: 20, color: '#5fbf6b' },
    { value: 100, weight: 12, color: '#4a86c8' },
    { value: 30, weight: 18, color: '#c8871a' },
    { value: 250, weight: 6, color: '#8a5cf6' },
    { value: 15, weight: 20, color: '#e08a4e' },
    { value: 1000, weight: 2, color: '#ff5ecb' }
  ]
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let client;
  try {
    client = await getClientPromise();
  } catch (e) {
    return res.status(500).json({ error: 'Database connection failed', detail: e.message });
  }
  const col = client.db(DB_NAME).collection(COLLECTION);

  if (req.method === 'GET') {
    let doc = await col.findOne({ _id: DOC_ID });
    if (!doc) {
      await col.insertOne(DEFAULT_CONFIG);
      doc = DEFAULT_CONFIG;
    }
    return res.status(200).json(doc);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const secret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_SECRET) {
      return res.status(500).json({ error: 'Server misconfigured: ADMIN_SECRET env var not set' });
    }
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized — missing or invalid x-admin-secret header' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    delete body._id; // never let the client override the doc id
    await col.updateOne({ _id: DOC_ID }, { $set: body }, { upsert: true });
    const updated = await col.findOne({ _id: DOC_ID });
    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
