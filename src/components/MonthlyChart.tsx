"use client";

import { useMemo } from "react";
import { DayEntry } from "@/lib/types";

const MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];

interface Props {
  days: Record<string, DayEntry>;
  monthsBack?: number;
}

// So'nggi N oy bo'yicha davomat sonini ustunli grafikda ko'rsatadi.
export default function MonthlyChart({ days, monthsBack = 12 }: Props) {
  const bars = useMemo(() => {
    const now = new Date();
    const counts: { label: string; year: number; count: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
      let c = 0;
      for (const k in days) if (k.startsWith(prefix)) c++;
      counts.push({ label: MONTHS_SHORT[m], year: y, count: c });
    }
    return counts;
  }, [days, monthsBack]);

  const max = Math.max(1, ...bars.map((b) => b.count));

  return (
    <div className="rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <h2 className="mb-4 text-base font-semibold tracking-tight">
        Oylik statistika{" "}
        <span className="font-normal text-muted">so&apos;nggi {monthsBack} oy</span>
      </h2>
      <div className="flex items-end justify-between gap-1.5" style={{ height: 140 }}>
        {bars.map((b, i) => {
          const h = b.count === 0 ? 3 : Math.round((b.count / max) * 116) + 6;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-foreground">
                {b.count || ""}
              </span>
              <div
                className={[
                  "w-full max-w-[26px] rounded-md transition-all",
                  b.count > 0 ? "bg-neutral-800" : "bg-neutral-200",
                ].join(" ")}
                style={{ height: h }}
                title={`${b.label} ${b.year}: ${b.count}`}
              />
              <span className="text-[10px] text-muted">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
