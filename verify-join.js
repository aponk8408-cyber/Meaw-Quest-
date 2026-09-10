// /api/verify-join.js
//
// Vercel Serverless Function — checks whether a Telegram user has joined a
// channel, using the Bot API's getChatMember method.
//
// The bot token lives ONLY in the Vercel environment variable BOT_TOKEN.
// It is never sent to, or visible from, the browser / Mini App.
//
// Called by the Meaw Quest front-end like:
//   GET https://<your-project>.vercel.app/api/verify-join?user_id=123456789&channel=YourChannelUsername
//
// Response:
//   { "joined": true,  "status": "member" }
//   { "joined": false, "status": "left" }
//   { "joined": false, "error": "..." }   <- channel not found, bot not admin, etc.

export default async function handler(req, res) {
  // Allow the Mini App (running inside Telegram's WebView / any browser) to call this.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ joined: false, error: 'Method not allowed' });
  }

  const { user_id, channel } = req.query;

  if (!user_id || !channel) {
    return res.status(400).json({ joined: false, error: 'Missing user_id or channel query param' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    // This means the env var was not set in the Vercel project settings.
    return res.status(500).json({ joined: false, error: 'Server misconfigured: BOT_TOKEN env var not set' });
  }

  // Accept either "@username", "username", or a numeric chat id (e.g. -1001234567890)
  let chatId = String(channel).trim();
  const isNumericId = /^-?\d+$/.test(chatId);
  if (!isNumericId && !chatId.startsWith('@')) {
    chatId = '@' + chatId;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(user_id)}`;
    const tgRes = await fetch(url);
    const data = await tgRes.json();

    if (!data.ok) {
      // Common causes:
      //  - the bot itself was never added to the channel (or was removed)
      //  - the bot is not an admin in the channel (required to read member status)
      //  - the channel username/id is wrong
      return res.status(200).json({
        joined: false,
        error: data.description || 'Telegram API returned an error'
      });
    }

    // Possible statuses: creator, administrator, member, restricted, left, kicked
    const status = data.result.status;
    const joined = ['creator', 'administrator', 'member', 'restricted'].includes(status);

    return res.status(200).json({ joined, status });
  } catch (err) {
    return res.status(500).json({ joined: false, error: 'Verification request failed', detail: err.message });
  }
}
