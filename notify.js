// /api/notify.js
//
// Sends a templated Telegram message via the Bot API's sendMessage method.
// BOT_TOKEN stays server-side (env var) — never exposed to the client.
//
// Intentionally template-only (no freeform "text" field accepted from the
// client) to limit what this public endpoint can be used to send — it can
// only ever produce the fixed referral-activation notification below.
//
//   POST /api/notify
//   body: { chat_id: "123456789", type: "referral_active",
//           data: { name: "Rahim", reward: 100, totalBonus: 350 } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured: BOT_TOKEN not set' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { chat_id, type, data } = body;

  if (!chat_id || !type) {
    return res.status(400).json({ ok: false, error: 'Missing chat_id or type' });
  }

  let text;
  if (type === 'referral_active') {
    const name = (data && data.name) ? String(data.name).slice(0, 64) : 'Your friend';
    const reward = Number(data && data.reward) || 0;
    const totalBonus = Number(data && data.totalBonus) || 0;
    text =
      `🎉 *${name}* is now your active referral!\n\n` +
      `You just earned *+${reward} Meaw* referral bonus.\n` +
      `Your total referral earnings so far: *${totalBonus} Meaw* 🐾`;
  } else {
    return res.status(400).json({ ok: false, error: 'Unknown notification type' });
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'Markdown' })
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      // Common cause: the user has never opened a chat with the bot, so
      // Telegram won't allow the bot to message them first.
      return res.status(200).json({ ok: false, error: tgData.description || 'Telegram API error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Notify request failed', detail: err.message });
  }
}
