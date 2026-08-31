// Davomat tarixini to'ldiradi.
// - Upstash env bo'lsa -> Redis'ga yozadi (deploy uchun).
// - Aks holda -> lokal .data/db.json ga yozadi.
//
// Ishlatish (lokal):   node scripts/seed.mjs
// Ishlatish (Upstash): UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node scripts/seed.mjs

import { promises as fs } from "fs";
import path from "path";

const TODAY = "2026-08-31"; // bugungi kun (shu kungacha to'ldiriladi)

function key(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// UTC bo'yicha barqaror sana iteratsiyasi.
function eachDay(startKey, endKey, cb) {
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  while (cur <= end) {
    const dt = new Date(cur);
    cb(dt);
    cur += 24 * 3600 * 1000;
  }
}

const days = {};
function mark(dt) {
  const k = key(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  if (k > TODAY) return;
  days[k] = { date: k };
}

// --- 1-davr: 2025-01-01 .. 2025-03-15, kun ora (har 2 kunda) ---
{
  let i = 0;
  eachDay("2025-01-01", "2025-03-15", (dt) => {
    if (i % 2 === 0) mark(dt);
    i++;
  });
}

// --- 2-davr: 2025-04-01 .. 2025-10-31, kun ora (har 2 kunda) ---
{
  let i = 0;
  eachDay("2025-04-01", "2025-10-31", (dt) => {
    if (i % 2 === 0) mark(dt);
    i++;
  });
}

// --- 3-davr: 2026-05-10 .. bugun, haftasiga 3 marta (Du/Cha/Ju) ---
{
  eachDay("2026-05-10", TODAY, (dt) => {
    const wd = dt.getUTCDay(); // 0=Ya .. 1=Du,3=Cha,5=Ju
    if (wd === 1 || wd === 3 || wd === 5) mark(dt);
  });
}

const config = { weeklyGoal: 3, ownerName: "ABRHAM" };
const total = Object.keys(days).length;

const hasRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

if (hasRedis) {
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  await redis.del("gym:days");
  // Bo'laklab yozamiz (katta hset)
  await redis.hset("gym:days", days);
  await redis.set("gym:config", config);
  console.log(`Upstash'ga ${total} kun yozildi.`);
} else {
  const dir = path.join(process.cwd(), ".data");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "db.json");
  await fs.writeFile(
    file,
    JSON.stringify({ days, config, photos: {} }, null, 2),
    "utf8",
  );
  console.log(`Fayl-bazaga ${total} kun yozildi: ${file}`);
}

// Qisqa hisobot
const byYear = {};
for (const k of Object.keys(days)) {
  const y = k.slice(0, 4);
  byYear[y] = (byYear[y] || 0) + 1;
}
console.log("Yillar bo'yicha:", byYear);
