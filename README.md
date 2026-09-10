# Meaw Quest — Full App (Vercel + MongoDB)

এই একটাই folder-এ পুরো app আছে — **frontend (index.html) + backend (api/)**
একসাথে, একই Vercel project হিসেবে deploy হবে। তাই আপনাকে কোনো URL হাতে
বসাতে হবে না — সব automatic (same-origin relative path দিয়ে কাজ করে)।

**আপনি যা করবেন:** GitHub-এ এই ফাইলগুলো upload → Vercel দিয়ে import →
৩টা Environment Variable বসান → Deploy। **ব্যস, এইটুকুই।**

## ফাইল স্ট্রাকচার (হুবহু এভাবেই GitHub-এ থাকতে হবে)
```
meaw-verify-backend/
├── index.html            ← পুরো Meaw Quest app (এটাই মূল পেজ, "/" এ খুলবে)
├── api/
│   ├── config.js         ← MongoDB-backed admin config (GET public, POST protected)
│   └── verify-join.js    ← Telegram channel-join verification (Bot API)
├── lib/
│   └── mongodb.js        ← cached MongoDB connection helper
├── package.json
└── README.md
```

## কীভাবে সব একসাথে কাজ করে
- `index.html` লোড হওয়ার সময় নিজে থেকেই `/api/config` কল করে (same domain,
  তাই কোনো URL বসাতে হয় না) → MongoDB থেকে channels/missions/redeem
  codes/economy/maintenance mode সব পড়ে নেয়
- Channel join verify করার সময় app নিজে থেকেই `/api/verify-join` কল করে
  (এটাও MongoDB config-এর ভেতরেই ডিফল্ট হিসেবে সেট করা আছে)
- সব একই Vercel project-এ থাকায় কোনো manual URL/config এডিট লাগে না

## ধাপে ধাপে ডিপ্লয়

### ১. বট-কে channel-এ Admin বানান
প্রতিটা channel-এ যেটা verify করতে চান, সেখানে আপনার bot-কে
**Administrator** হিসেবে যোগ করুন (শুধু member থাকলে `getChatMember` অনেক
সময় সঠিক status দেয় না)।

### ২. MongoDB Atlas ঠিক আছে কিনা চেক করুন
আপনার connection string:
```
mongodb+srv://meawquest2034:<db_password>@cluster0.qcqspud.mongodb.net/?appName=Cluster0
```
- **Database Access** → `meawquest2034` ইউজারের password ঠিক আছে কিনা
- **Network Access** → `0.0.0.0/0` (Allow from anywhere) whitelist করা আছে কিনা
  (Vercel-এর serverless function বিভিন্ন IP থেকে কানেক্ট করে)

### ৩. GitHub-এ আপলোড করুন
এই ৫টা ফাইল (+ ফোল্ডার স্ট্রাকচার ঠিক রেখে) একটা নতুন GitHub repo-তে push করুন।

### ৪. Vercel-এ Import করুন
1. https://vercel.com → **Add New Project**
2. আপনার GitHub repo সিলেক্ট করুন
3. Framework Preset: **Other** (auto-detect না হলেও সমস্যা নেই)
4. **এখনই Deploy চাপবেন না** — আগে env variable বসান (নিচে)

### ৫. Environment Variables বসান (এইটাই সবচেয়ে গুরুত্বপূর্ণ ধাপ)
Project → **Settings → Environment Variables** → এই ৩টা যোগ করুন
(Production + Preview + Development — **তিনটা environment-এই**):

| Key | Value |
|---|---|
| `BOT_TOKEN` | আপনার বটের টোকেন (BotFather থেকে) |
| `MONGODB_URI` | `mongodb+srv://meawquest2034:আসল_পাসওয়ার্ড@cluster0.qcqspud.mongodb.net/?appName=Cluster0` |
| `ADMIN_SECRET` | নিজে একটা লম্বা random string বানান (যেমন টার্মিনালে `openssl rand -hex 24` চালিয়ে) |

### ৬. Deploy করুন
Deploy চাপুন। শেষ হলে Vercel একটা URL দেবে, যেমন:
```
https://meaw-quest.vercel.app
```
এটাই আপনার সম্পূর্ণ, live app — সরাসরি এই লিংক আপনার Telegram bot-এর
Menu Button / Web App URL হিসেবে বসিয়ে দিন।

### ৭. টেস্ট করুন
- App খুলুন: `https://meaw-quest.vercel.app` — Join Kingdom স্ক্রিন আসা উচিত
- Config check: `https://meaw-quest.vercel.app/api/config` (browser-এ খুললে JSON দেখাবে)
- Verify check: `https://meaw-quest.vercel.app/api/verify-join?user_id=123456789&channel=YourChannelUsername`

## Config বদলানো (channels, missions, economy, maintenance mode)
আপাতত admin UI নেই, তাই `curl`/Postman দিয়ে `POST /api/config` কল করবেন
(secret সহ):
```bash
curl -X POST https://meaw-quest.vercel.app/api/config \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: আপনার_ADMIN_SECRET" \
  -d '{"maintenance": true}'
```
শুধু যেই field পাঠাবেন সেটাই বদলাবে, বাকি সব আগের মতো থাকবে।
(একটা proper Admin Panel UI চাইলে বলবেন — আলাদা করে বানিয়ে দেব, এই একই
`/api/config` endpoint-এ POST করবে।)

## Troubleshooting
- **App খুলছে কিন্তু config load হচ্ছে না / সব ডিফল্ট দেখাচ্ছে** → browser
  console (F12) খুলে দেখুন `/api/config` fetch error দিচ্ছে কিনা;
  `MONGODB_URI` ঠিক আছে কিনা এবং redeploy করা হয়েছে কিনা চেক করুন
- **401 Unauthorized (POST করার সময়)** → `x-admin-secret` header ভুল, বা
  Vercel-এ `ADMIN_SECRET` সেট নেই
- **500, Database connection failed** → Atlas Network Access-এ `0.0.0.0/0`
  আছে কিনা, password-এ special character (`@`, `#` ইত্যাদি) থাকলে
  URL-encode করা লাগবে (যেমন `@` → `%40`)
- **verify-join সবসময় `joined:false`** → বট চ্যানেলে Admin আছে কিনা চেক করুন
- **Private channel** → `@username` কাজ করবে না, numeric `chat_id`
  (যেমন `-1001234567890`) ব্যবহার করতে হবে
