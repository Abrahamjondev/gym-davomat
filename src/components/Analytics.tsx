"use client";

import { useMemo } from "react";
import { DayEntry, Mood } from "@/lib/types";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MOOD_LABELS: Record<Mood, string> = {
  great: "🔥 Zo'r",
  good: "🙂 Yaxshi",
  ok: "😐 O'rtacha",
  tired: "😮‍💨 Charchoq",
};

interface Props {
  days: Record<string, DayEntry>;
}

// Hafta kunlari, mushak guruhi va kayfiyat bo'yicha tahlil.
export default function Analytics({ days }: Props) {
  const { weekday, muscles, moods, hasMuscle, hasMood } = useMemo(() => {
    const weekday = [0, 0, 0, 0, 0, 0, 0];
    const muscles = new Map<string, number>();
    const moods = new Map<Mood, number>();
    for (const k in days) {
      const [y, m, d] = k.split("-").map(Number);
      const wd = (new Date(y, m - 1, d).getDay() + 6) % 7; // Du=0
      weekday[wd]++;
      const e = days[k];
      if (e.muscle) muscles.set(e.muscle, (muscles.get(e.muscle) ?? 0) + 1);
      if (e.mood) moods.set(e.mood, (moods.get(e.mood) ?? 0) + 1);
    }
    return {
      weekday,
      muscles: [...muscles.entries()].sort((a, b) => b[1] - a[1]),
      moods: [...moods.entries()].sort((a, b) => b[1] - a[1]),
      hasMuscle: muscles.size > 0,
      hasMood: moods.size > 0,
    };
  }, [days]);

  const wdMax = Math.max(1, ...weekday);
  const muscleMax = Math.max(1, ...muscles.map((m) => m[1]));

  return (
    <div className="fade-up space-y-4 rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold tracking-tight">Chuqur tahlil</h2>

      {/* Hafta kunlari */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted">Hafta kunlari bo&apos;yicha</p>
        <div className="flex items-end justify-between gap-1.5" style={{ height: 90 }}>
          {weekday.map((c, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold">{c || ""}</span>
              <div
                className={c > 0 ? "w-full max-w-[28px] rounded-md bg-accent" : "w-full max-w-[28px] rounded-md bg-surface-2"}
                style={{ height: c === 0 ? 3 : Math.round((c / wdMax) * 64) + 6 }}
              />
              <span className="text-[10px] text-muted">{WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mushak guruhi */}
      {hasMuscle && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Mushak guruhi bo&apos;yicha</p>
          <div className="space-y-1.5">
            {muscles.slice(0, 7).map(([name, c]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs">{name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(c / muscleMax) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kayfiyat */}
      {hasMood && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Kayfiyat bo&apos;yicha</p>
          <div className="flex flex-wrap gap-2">
            {moods.map(([m, c]) => (
              <span
                key={m}
                className="rounded-full border border-border-soft px-3 py-1.5 text-xs"
              >
                {MOOD_LABELS[m]} · <b>{c}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {!hasMuscle && !hasMood && (
        <p className="text-xs text-muted">
          Kunlarga mushak guruhi va kayfiyat qo&apos;shsangiz, bu yerda tahlil chiqadi.
        </p>
      )}
    </div>
  );
}
