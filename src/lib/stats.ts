import { DayEntry, Config } from "./types";

// Sana yordamchilari — barchasi lokal vaqt bo'yicha "YYYY-MM-DD" formatida ishlaydi.

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Dushanba = haftaning boshi. Berilgan sana uchun hafta boshining kalitini qaytaradi.
export function weekStartKey(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7; // yakshanba(0)->6, dushanba(1)->0
  copy.setDate(copy.getDate() - day);
  return toKey(copy);
}

export interface Stats {
  total: number; // umumiy borilgan kunlar
  thisMonth: number; // shu oyda
  thisYear: number; // shu yilda
  last30: number; // so'nggi 30 kunda
  avgGapDays: number | null; // o'rtacha necha kunda bir marta
  thisWeekCount: number; // shu haftada nechta
  weeklyStreak: number; // ketma-ket maqsadga yetgan haftalar
  bestWeeklyStreak: number; // eng uzun haftalik streak
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  label: string;
  threshold: number;
  unlocked: boolean;
}

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlocked">[] = [
  { id: "first", label: "Birinchi qadam", threshold: 1 },
  { id: "week", label: "7 mashg'ulot", threshold: 7 },
  { id: "month", label: "30 mashg'ulot", threshold: 30 },
  { id: "fifty", label: "50 mashg'ulot", threshold: 50 },
  { id: "century", label: "100 mashg'ulot", threshold: 100 },
];

export function computeStats(
  days: Record<string, DayEntry>,
  config: Config,
  today: Date = new Date(),
): Stats {
  const keys = Object.keys(days).sort();
  const total = keys.length;

  const ymNow = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const yNow = String(today.getFullYear());

  let thisMonth = 0;
  let thisYear = 0;
  for (const k of keys) {
    if (k.startsWith(ymNow)) thisMonth++;
    if (k.startsWith(yNow)) thisYear++;
  }

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ms30 = 30 * 24 * 3600 * 1000;
  let last30 = 0;
  for (const k of keys) {
    const diff = todayStart.getTime() - fromKey(k).getTime();
    if (diff >= 0 && diff < ms30) last30++;
  }

  // O'rtacha oraliq (kunlarda) — birinchi va oxirgi kun orasidagi masofa / (n-1)
  let avgGapDays: number | null = null;
  if (keys.length >= 2) {
    const span =
      (fromKey(keys[keys.length - 1]).getTime() - fromKey(keys[0]).getTime()) /
      (24 * 3600 * 1000);
    avgGapDays = Math.round((span / (keys.length - 1)) * 10) / 10;
  }

  // Haftalar bo'yicha guruhlash
  const weekCounts = new Map<string, number>();
  for (const k of keys) {
    const ws = weekStartKey(fromKey(k));
    weekCounts.set(ws, (weekCounts.get(ws) || 0) + 1);
  }

  const thisWeekKey = weekStartKey(todayStart);
  const thisWeekCount = weekCounts.get(thisWeekKey) || 0;

  // Haftalik streak: shu haftadan orqaga qarab, maqsadga yetgan ketma-ket haftalar.
  // Joriy hafta hali tugamagani uchun, agar maqsadga yetmagan bo'lsa ham streakni buzmaydi.
  const goal = Math.max(1, config.weeklyGoal);
  const weeklyStreak = countWeeklyStreak(weekCounts, thisWeekKey, goal);
  const bestWeeklyStreak = bestStreak(weekCounts, goal);

  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map((a) => ({
    ...a,
    unlocked: total >= a.threshold,
  }));

  return {
    total,
    thisMonth,
    thisYear,
    last30,
    avgGapDays,
    thisWeekCount,
    weeklyStreak,
    bestWeeklyStreak,
    achievements,
  };
}

function prevWeekKey(weekKey: string): string {
  const d = fromKey(weekKey);
  d.setDate(d.getDate() - 7);
  return toKey(d);
}

function countWeeklyStreak(
  weekCounts: Map<string, number>,
  thisWeekKey: string,
  goal: number,
): number {
  let streak = 0;
  let cursor = thisWeekKey;
  // Joriy hafta: maqsadga yetgan bo'lsa hisobga olamiz.
  if ((weekCounts.get(cursor) || 0) >= goal) {
    streak++;
  }
  // Oldingi haftalarga o'tamiz.
  cursor = prevWeekKey(cursor);
  while ((weekCounts.get(cursor) || 0) >= goal) {
    streak++;
    cursor = prevWeekKey(cursor);
  }
  return streak;
}

function bestStreak(weekCounts: Map<string, number>, goal: number): number {
  const weeks = [...weekCounts.keys()].sort();
  if (weeks.length === 0) return 0;
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const w of weeks) {
    const met = (weekCounts.get(w) || 0) >= goal;
    if (!met) {
      cur = 0;
      prev = w;
      continue;
    }
    if (prev && prevWeekKey(w) === prev) {
      cur++;
    } else {
      cur = 1;
    }
    best = Math.max(best, cur);
    prev = w;
  }
  return best;
}
