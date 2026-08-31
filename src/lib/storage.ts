import { DayEntry, Config, DB, DEFAULT_CONFIG } from "./types";

/**
 * Saqlash qatlami (storage layer).
 * - Agar UPSTASH env sozlangan bo'lsa -> Upstash Redis (Vercel / production).
 * - Aks holda -> lokal .data/db.json fayli (faqat ishlab chiqish uchun).
 */

const DAYS_KEY = "gym:days";
const CONFIG_KEY = "gym:config";
const PHOTOS_KEY = "gym:photos";

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

async function redisGetPhoto(date: string): Promise<string | null> {
  const redis = await redisClient();
  const val = await redis.hget<string>(PHOTOS_KEY, date);
  return val ?? null;
}

async function redisSetPhoto(date: string, dataUrl: string) {
  const redis = await redisClient();
  await redis.hset(PHOTOS_KEY, { [date]: dataUrl });
}

async function redisRemovePhoto(date: string) {
  const redis = await redisClient();
  await redis.hdel(PHOTOS_KEY, date);
}

// ---------- File backend (dev) ----------
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface RawFile {
  days: Record<string, DayEntry>;
  config: Config;
  photos: Record<string, string>; // date -> dataURL
}

async function fileReadRaw(): Promise<RawFile> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<RawFile>;
    return {
      days: parsed.days ?? {},
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
      photos: parsed.photos ?? {},
    };
  } catch {
    return { days: {}, config: { ...DEFAULT_CONFIG }, photos: {} };
  }
}

async function fileWriteRaw(data: RawFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function fileRead(): Promise<DB> {
  const raw = await fileReadRaw();
  return { days: raw.days, config: raw.config };
}

// ---------- Public API ----------
export async function getAll(): Promise<DB> {
  return hasRedis ? redisGetAll() : fileRead();
}

export async function setDay(entry: DayEntry): Promise<void> {
  if (hasRedis) return redisSetDay(entry);
  const raw = await fileReadRaw();
  raw.days[entry.date] = entry;
  await fileWriteRaw(raw);
}

export async function removeDay(date: string): Promise<void> {
  if (hasRedis) {
    await Promise.all([redisRemoveDay(date), redisRemovePhoto(date)]);
    return;
  }
  const raw = await fileReadRaw();
  delete raw.days[date];
  delete raw.photos[date];
  await fileWriteRaw(raw);
}

export async function setConfig(config: Config): Promise<void> {
  if (hasRedis) return redisSetConfig(config);
  const raw = await fileReadRaw();
  raw.config = config;
  await fileWriteRaw(raw);
}

export async function getPhoto(date: string): Promise<string | null> {
  if (hasRedis) return redisGetPhoto(date);
  const raw = await fileReadRaw();
  return raw.photos[date] ?? null;
}

export async function setPhoto(date: string, dataUrl: string): Promise<void> {
  if (hasRedis) return redisSetPhoto(date, dataUrl);
  const raw = await fileReadRaw();
  raw.photos[date] = dataUrl;
  await fileWriteRaw(raw);
}

export async function removePhoto(date: string): Promise<void> {
  if (hasRedis) return redisRemovePhoto(date);
  const raw = await fileReadRaw();
  delete raw.photos[date];
  await fileWriteRaw(raw);
}

export function usingRedis() {
  return hasRedis;
}
