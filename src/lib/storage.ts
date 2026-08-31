import { DayEntry, Config, DB, DEFAULT_CONFIG } from "./types";

/**
 * Saqlash qatlami (storage layer).
 * - Agar UPSTASH env sozlangan bo'lsa -> Upstash Redis (Vercel / production).
 * - Aks holda -> lokal .data/db.json fayli (faqat ishlab chiqish uchun).
 */

const DAYS_KEY = "gym:days";
const CONFIG_KEY = "gym:config";
const PHOTOS_KEY = "gym:photos";
const VIEWS_KEY = "gym:views";
const VISITORS_KEY = "gym:visitors";
const AVATAR_KEY = "gym:avatar";
const REACTIONS_KEY = "gym:reactions";

export const REACTIONS = ["💪", "🔥", "👏", "❤️"] as const;
export type ReactionCounts = Record<string, number>;

export interface Counts {
  views: number; // umumiy ko'rishlar
  visitors: number; // unikal tashrifchilar
  today: number; // bugungi ko'rishlar
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

async function redisGetCounts(todayKey: string): Promise<Counts> {
  const redis = await redisClient();
  const [views, visitors, today] = await Promise.all([
    redis.get(VIEWS_KEY),
    redis.get(VISITORS_KEY),
    redis.get(`${VIEWS_KEY}:${todayKey}`),
  ]);
  return { views: num(views), visitors: num(visitors), today: num(today) };
}

async function redisRegisterView(
  newVisitor: boolean,
  todayKey: string,
): Promise<Counts> {
  const redis = await redisClient();
  const views = await redis.incr(VIEWS_KEY);
  const today = await redis.incr(`${VIEWS_KEY}:${todayKey}`);
  const visitors = newVisitor
    ? await redis.incr(VISITORS_KEY)
    : num(await redis.get(VISITORS_KEY));
  return { views: num(views), visitors: num(visitors), today: num(today) };
}

async function redisGetAvatar(): Promise<string | null> {
  const redis = await redisClient();
  return (await redis.get<string>(AVATAR_KEY)) ?? null;
}

async function redisGetReactions(): Promise<ReactionCounts> {
  const redis = await redisClient();
  const h = await redis.hgetall<ReactionCounts>(REACTIONS_KEY);
  return normalizeReactions(h ?? {});
}

async function redisChangeReaction(
  emoji: string,
  delta: number,
): Promise<ReactionCounts> {
  const redis = await redisClient();
  const v = await redis.hincrby(REACTIONS_KEY, emoji, delta);
  if (v < 0) await redis.hset(REACTIONS_KEY, { [emoji]: 0 });
  return redisGetReactions();
}

function normalizeReactions(raw: Record<string, unknown>): ReactionCounts {
  const out: ReactionCounts = {};
  for (const e of REACTIONS) out[e] = num(raw[e]);
  return out;
}

// ---------- File backend (dev) ----------
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface Meta {
  views: number;
  visitors: number;
  daily: Record<string, number>; // date -> views
}

interface RawFile {
  days: Record<string, DayEntry>;
  config: Config;
  photos: Record<string, string>; // date -> dataURL
  meta: Meta;
  reactions: ReactionCounts;
  avatar?: string; // dataURL
}

async function fileReadRaw(): Promise<RawFile> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<RawFile>;
    return {
      days: parsed.days ?? {},
      config: { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) },
      photos: parsed.photos ?? {},
      meta: {
        views: parsed.meta?.views ?? 0,
        visitors: parsed.meta?.visitors ?? 0,
        daily: parsed.meta?.daily ?? {},
      },
      reactions: normalizeReactions(parsed.reactions ?? {}),
      avatar: parsed.avatar,
    };
  } catch {
    return {
      days: {},
      config: { ...DEFAULT_CONFIG },
      photos: {},
      meta: { views: 0, visitors: 0, daily: {} },
      reactions: normalizeReactions({}),
    };
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

export async function getCounts(todayKey: string): Promise<Counts> {
  if (hasRedis) return redisGetCounts(todayKey);
  const raw = await fileReadRaw();
  return {
    views: raw.meta.views,
    visitors: raw.meta.visitors,
    today: raw.meta.daily[todayKey] ?? 0,
  };
}

export async function registerView(
  newVisitor: boolean,
  todayKey: string,
): Promise<Counts> {
  if (hasRedis) return redisRegisterView(newVisitor, todayKey);
  const raw = await fileReadRaw();
  raw.meta.views += 1;
  raw.meta.daily[todayKey] = (raw.meta.daily[todayKey] ?? 0) + 1;
  if (newVisitor) raw.meta.visitors += 1;
  await fileWriteRaw(raw);
  return {
    views: raw.meta.views,
    visitors: raw.meta.visitors,
    today: raw.meta.daily[todayKey],
  };
}

export async function getAvatar(): Promise<string | null> {
  if (hasRedis) return redisGetAvatar();
  const raw = await fileReadRaw();
  return raw.avatar ?? null;
}

export async function setAvatar(dataUrl: string): Promise<void> {
  if (hasRedis) {
    const redis = await redisClient();
    await redis.set(AVATAR_KEY, dataUrl);
    return;
  }
  const raw = await fileReadRaw();
  raw.avatar = dataUrl;
  await fileWriteRaw(raw);
}

export async function removeAvatar(): Promise<void> {
  if (hasRedis) {
    const redis = await redisClient();
    await redis.del(AVATAR_KEY);
    return;
  }
  const raw = await fileReadRaw();
  delete raw.avatar;
  await fileWriteRaw(raw);
}

export async function getReactions(): Promise<ReactionCounts> {
  if (hasRedis) return redisGetReactions();
  const raw = await fileReadRaw();
  return normalizeReactions(raw.reactions);
}

export async function changeReaction(
  emoji: string,
  delta: number,
): Promise<ReactionCounts> {
  if (hasRedis) return redisChangeReaction(emoji, delta);
  const raw = await fileReadRaw();
  raw.reactions[emoji] = Math.max(0, (raw.reactions[emoji] ?? 0) + delta);
  await fileWriteRaw(raw);
  return normalizeReactions(raw.reactions);
}

export function usingRedis() {
  return hasRedis;
}
