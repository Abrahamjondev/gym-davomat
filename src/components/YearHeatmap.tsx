"use client";

import { DayEntry } from "@/lib/types";
import { toKey } from "@/lib/stats";

interface Props {
  year: number;
  days: Record<string, DayEntry>;
  todayKey: string;
  onDayClick: (key: string) => void;
}

const MONTH_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

// Bir yilni haftalarga (ustunlar) ajratadi. Har ustun 7 kun (Du..Ya).
export default function YearHeatmap({ year, days, todayKey, onDayClick }: Props) {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Birinchi ustun yil boshidagi haftaning dushanbasidan boshlanadi.
  const start = new Date(jan1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= dec31 || cursor.getDay() !== 1) {
    const col: Date[] = [];
    for (let i = 0; i < 7; i++) {
      col.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(col);
    if (cursor > dec31 && cursor.getDay() === 1) break;
  }

  // Har ustun tepasida oy yorlig'i (agar shu ustunda oy boshlansa).
  const monthLabels = weeks.map((col) => {
    const inYear = col.find((d) => d.getFullYear() === year);
    if (!inYear) return "";
    const firstOfMonth = col.find(
      (d) => d.getFullYear() === year && d.getDate() <= 7,
    );
    return firstOfMonth ? MONTH_SHORT[firstOfMonth.getMonth()] : "";
  });

  return (
    <div className="rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">
          Yillik ko&apos;rinish{" "}
          <span className="font-normal text-muted">{year}</span>
        </h2>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>Kam</span>
          <span className="h-3 w-3 rounded-[3px] bg-surface-2" />
          <span className="h-3 w-3 rounded-[3px] bg-accent" />
          <span>Bordim</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {/* Oy yorliqlari */}
          <div className="flex gap-1 pl-0">
            {monthLabels.map((label, i) => (
              <div
                key={i}
                className="w-3 text-[9px] leading-3 text-muted"
                style={{ minWidth: "0.75rem" }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Haftalar */}
          <div className="flex gap-1">
            {weeks.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((d, ri) => {
                  const inYear = d.getFullYear() === year;
                  const key = toKey(d);
                  const went = !!days[key];
                  const isToday = key === todayKey;
                  const isFuture = key > todayKey;
                  if (!inYear) {
                    return <div key={ri} className="h-3 w-3" />;
                  }
                  return (
                    <button
                      key={ri}
                      onClick={() => !isFuture && onDayClick(key)}
                      disabled={isFuture}
                      title={key}
                      className={[
                        "h-3 w-3 rounded-[3px] transition",
                        went
                          ? "bg-accent hover:bg-accent"
                          : "bg-surface-2 hover:bg-surface-2",
                        isToday ? "ring-1 ring-accent ring-offset-1 ring-offset-card" : "",
                        isFuture ? "opacity-30 cursor-default" : "cursor-pointer",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
