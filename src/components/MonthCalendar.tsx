"use client";

import { DayEntry } from "@/lib/types";
import { toKey } from "@/lib/stats";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

interface Props {
  year: number;
  month: number; // 0-11
  days: Record<string, DayEntry>;
  todayKey: string;
  animatingKey: string | null;
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (key: string) => void;
}

export default function MonthCalendar({
  year,
  month,
  days,
  todayKey,
  animatingKey,
  onPrev,
  onNext,
  onDayClick,
}: Props) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // dushanba boshi

  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">
          {MONTHS[month]} <span className="text-muted font-normal">{year}</span>
        </h2>
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            aria-label="Oldingi oy"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-soft text-muted transition hover:bg-surface-2"
          >
            ‹
          </button>
          <button
            onClick={onNext}
            aria-label="Keyingi oy"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-soft text-muted transition hover:bg-surface-2"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = toKey(new Date(year, month, d));
          const entry = days[key];
          const went = !!entry;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const animating = key === animatingKey;

          return (
            <button
              key={i}
              onClick={() => onDayClick(key)}
              disabled={isFuture}
              title={entry?.muscle || (went ? "Zalga borilgan" : "")}
              className={[
                "relative aspect-square rounded-xl text-sm font-medium transition-all",
                "flex items-center justify-center select-none",
                went
                  ? "bg-accent text-accent-fg shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                  : "bg-surface text-muted hover:bg-surface-2 active:bg-surface-2",
                isToday && !went ? "ring-2 ring-accent ring-offset-1 ring-offset-card" : "",
                isToday && went ? "ring-2 ring-accent/40 ring-offset-1 ring-offset-card" : "",
                isFuture ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                animating ? "mark-pop" : "",
              ].join(" ")}
            >
              {d}
              {went && entry?.muscle && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent-fg/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
