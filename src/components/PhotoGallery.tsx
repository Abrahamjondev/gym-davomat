"use client";

import { useMemo } from "react";
import { DayEntry } from "@/lib/types";

interface Props {
  days: Record<string, DayEntry>;
  onOpen: (dateKey: string) => void;
}

// Rasmi bor kunlarni chiroyli to'r (grid) ko'rinishida ko'rsatadi.
export default function PhotoGallery({ days, onOpen }: Props) {
  const photoDays = useMemo(
    () =>
      Object.keys(days)
        .filter((k) => days[k].hasPhoto)
        .sort()
        .reverse(),
    [days],
  );

  if (photoDays.length === 0) return null;

  return (
    <div className="fade-up mt-5 rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Rasmlar galereyasi</h2>
        <span className="text-xs text-muted">{photoDays.length} ta</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photoDays.map((k) => {
          const label = new Date(k + "T00:00:00").toLocaleDateString("uz-UZ", {
            day: "numeric",
            month: "short",
          });
          return (
            <button
              key={k}
              onClick={() => onOpen(k)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border-soft bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo/img?date=${k}`}
                alt={label}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[10px] font-medium text-white">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
