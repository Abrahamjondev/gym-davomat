import { DayEntry, Config, DB, DEFAULT_CONFIG } from "./types";

/**
 * Saqlash qatlami (storage layer).
 * - Agar UPSTASH env sozlangan bo'lsa -> Upstash Redis (Vercel / production).
 * - Aks holda -> lokal .data/db.json fayli (faqat ishlab chiqish uchun).
 */

const DAYS_KEY = "gym:days";
const CONFIG_KEY = "gym:config";

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// ---------- Redis backend ----------
async function redisClient() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

async function redisGetAll(): Promise<DB> {
  const redis = await redisClient();
  const [days, config] = await Promise.all([
    redis.hgetall<Record<string, DayEntry>>(DAYS_KEY),
    redis.get<Config>(CONFIG_KEY),
  ]);
  return {
    days: days ?? {},
    config: { ...DEFAULT_CONFIG, ...(config ?? {}) },
  };
}

async function redisSetDay(entry: DayEntry) {
  const redis = await redisClient();
  await redis.hset(DAYS_KEY, { [entry.date]: entry });
}

async function redisRemoveDay(date: string) {
  const redis = await redisClient();
  await redis.hdel(DAYS_KEY, date);
}

async function redisSetConfig(config: Config) {
  const redis = await redisClient();
  await redis.set(CONFIG_KEY, config);
}

// ---------- File backend (dev) ----------
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

async function fileRead(): Promise<DB> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as DB;
    return {
      days: parsed.days ?? {},
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
    };
  } catch {
    return { days: {}, config: { ...DEFAULT_CONFIG } };
  }
}

async function fileWrite(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

// ---------- Public API ----------
export async function getAll(): Promise<DB> {
  return hasRedis ? redisGetAll() : fileRead();
}

export async function setDay(entry: DayEntry): Promise<void> {
  if (hasRedis) return redisSetDay(entry);
  const db = await fileRead();
  db.days[entry.date] = entry;
  await fileWrite(db);
}

export async function removeDay(date: string): Promise<void> {
  if (hasRedis) return redisRemoveDay(date);
  const db = await fileRead();
  delete db.days[date];
  await fileWrite(db);
}

export async function setConfig(config: Config): Promise<void> {
  if (hasRedis) return redisSetConfig(config);
  const db = await fileRead();
  db.config = config;
  await fileWrite(db);
}

export function usingRedis() {
  return hasRedis;
}
