"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { DayEntry, Config, Mood } from "@/lib/types";
import { Stats } from "@/lib/stats";
import { quoteOfDay, MUSCLE_PRESETS } from "@/lib/quotes";
import { toKey } from "@/lib/stats";
import MonthCalendar from "./MonthCalendar";
import YearHeatmap from "./YearHeatmap";

interface ApiData {
  days: Record<string, DayEntry>;
  config: Config;
  stats: Stats;
  isOwner: boolean;
}

const MOOD_LABELS: Record<Mood, string> = {
  great: "🔥 Zo'r",
  good: "🙂 Yaxshi",
  ok: "😐 O'rtacha",
  tired: "😮‍💨 Charchoq",
};

export default function Dashboard() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = useMemo(() => new Date(), []);
  const todayKey = toKey(now);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/data", { cache: "no-store" });
    const json = (await res.json()) as ApiData;
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = data?.isOwner ?? false;
  const days = data?.days ?? {};

  const handleDayClick = (key: string) => {
    if (!isOwner && !days[key]) return; // mehmon bo'sh kunni ocholmaydi
    setSelectedKey(key);
  };

  const markToday = () => {
    if (!isOwner) {
      setLoginOpen(true);
      return;
    }
    setSelectedKey(todayKey);
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.7 },
      colors: ["#0a0a0a", "#404040", "#a3a3a3"],
      scalar: 0.9,
    });
  };

  const saveEntry = async (entry: DayEntry, isNew: boolean) => {
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (isNew) {
      setAnimatingKey(entry.date);
      fireConfetti();
      setTimeout(() => setAnimatingKey(null), 500);
    }
    await load();
  };

  const deleteEntry = async (key: string) => {
    await fetch(`/api/attendance?date=${key}`, { method: "DELETE" });
    await load();
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">
        <div className="animate-pulse text-sm">Yuklanmoqda…</div>
      </div>
    );
  }

  const config = data!.config;
  const stats = data!.stats;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
      {/* Header */}
      <header className="fade-up mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Gym Davomat
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {config.ownerName}
          </h1>
          <p className="mt-1 text-sm text-muted">{quoteOfDay(now)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isOwner ? (
            <>
              <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                Egasi
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="text-xs text-muted underline-offset-2 hover:underline"
                >
                  Sozlama
                </button>
                <button
                  onClick={async () => {
                    await fetch("/api/logout", { method: "POST" });
                    await load();
                  }}
                  className="text-xs text-muted underline-offset-2 hover:underline"
                >
                  Chiqish
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="rounded-full border border-border-soft bg-card px-3 py-1.5 text-xs font-medium text-muted transition hover:border-neutral-300"
            >
              Egasi kirishi
            </button>
          )}
        </div>
      </header>

      {/* Bugungi holat + davomat tugmasi */}
      <TodayCard
        went={!!days[todayKey]}
        isOwner={isOwner}
        onMark={markToday}
      />

      {/* Statistika */}
      <StatsGrid stats={stats} config={config} />

      {/* Achievements */}
      <Achievements stats={stats} />

      {/* Kalendar */}
      <div className="mt-5 space-y-5">
        <MonthCalendar
          year={viewYear}
          month={viewMonth}
          days={days}
          todayKey={todayKey}
          animatingKey={animatingKey}
          onPrev={() => {
            const m = viewMonth - 1;
            if (m < 0) {
              setViewMonth(11);
              setViewYear((y) => y - 1);
            } else setViewMonth(m);
          }}
          onNext={() => {
            const m = viewMonth + 1;
            if (m > 11) {
              setViewMonth(0);
              setViewYear((y) => y + 1);
            } else setViewMonth(m);
          }}
          onDayClick={handleDayClick}
        />

        <YearHeatmap
          year={viewYear}
          days={days}
          todayKey={todayKey}
          onDayClick={handleDayClick}
        />
      </div>

      <footer className="mt-10 text-center text-xs text-muted">
        {isOwner
          ? "Kunni belgilash uchun katakchani bos."
          : "Bu sahifa faqat ko'rish uchun. O'zgartirish egasida."}
      </footer>

      {/* Modallar */}
      {selectedKey && (
        <DayModal
          dateKey={selectedKey}
          entry={days[selectedKey]}
          isOwner={isOwner}
          todayKey={todayKey}
          onClose={() => setSelectedKey(null)}
          onSave={async (e, isNew) => {
            await saveEntry(e, isNew);
            setSelectedKey(null);
          }}
          onDelete={async (k) => {
            await deleteEntry(k);
            setSelectedKey(null);
          }}
        />
      )}

      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onSuccess={async () => {
            setLoginOpen(false);
            await load();
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => {
            setSettingsOpen(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

/* ---------- Bugungi karta ---------- */
function TodayCard({
  went,
  isOwner,
  onMark,
}: {
  went: boolean;
  isOwner: boolean;
  onMark: () => void;
}) {
  return (
    <div
      className={[
        "fade-up mb-5 flex items-center justify-between rounded-2xl border p-4 sm:p-5",
        went
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-border-soft bg-card",
      ].join(" ")}
    >
      <div>
        <p
          className={[
            "text-xs font-medium uppercase tracking-widest",
            went ? "text-white/60" : "text-muted",
          ].join(" ")}
        >
          Bugun
        </p>
        <p className="mt-0.5 text-lg font-semibold">
          {went ? "Zalga bording ✅" : "Hali belgilanmagan"}
        </p>
      </div>
      <button
        onClick={onMark}
        className={[
          "rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95",
          went
            ? "bg-white text-neutral-900 hover:bg-neutral-100"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        {went ? "Ko'rish / o'zgartirish" : isOwner ? "Bugun bordim" : "Belgilash"}
      </button>
    </div>
  );
}

/* ---------- Statistika ---------- */
function StatsGrid({ stats, config }: { stats: Stats; config: Config }) {
  const items = [
    { label: "Jami", value: stats.total },
    { label: "Bu oy", value: stats.thisMonth },
    { label: "Bu yil", value: stats.thisYear },
    { label: "So'nggi 30 kun", value: stats.last30 },
    {
      label: "Bu hafta",
      value: `${stats.thisWeekCount}/${config.weeklyGoal}`,
      highlight: stats.thisWeekCount >= config.weeklyGoal,
    },
    {
      label: "Haftalik streak 🔥",
      value: stats.weeklyStreak,
      sub: `eng uzun: ${stats.bestWeeklyStreak}`,
    },
    {
      label: "O'rtacha oraliq",
      value: stats.avgGapDays !== null ? `${stats.avgGapDays} kun` : "—",
    },
  ];
  return (
    <section className="fade-up mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className={[
            "rounded-xl border p-3",
            "highlight" in it && it.highlight
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-border-soft bg-card",
          ].join(" ")}
        >
          <p
            className={[
              "text-[11px] font-medium",
              "highlight" in it && it.highlight ? "text-white/60" : "text-muted",
            ].join(" ")}
          >
            {it.label}
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">{it.value}</p>
          {"sub" in it && it.sub && (
            <p className="text-[10px] text-muted">{it.sub}</p>
          )}
        </div>
      ))}
    </section>
  );
}

/* ---------- Achievements ---------- */
function Achievements({ stats }: { stats: Stats }) {
  return (
    <section className="fade-up mb-1">
      <div className="flex flex-wrap gap-2">
        {stats.achievements.map((a) => (
          <div
            key={a.id}
            title={`${a.threshold} mashg'ulot`}
            className={[
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              a.unlocked
                ? "border-neutral-900 bg-card text-neutral-900"
                : "border-dashed border-border-soft bg-transparent text-neutral-300",
            ].join(" ")}
          >
            <span>{a.unlocked ? "🏅" : "🔒"}</span>
            {a.label}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Kun modali ---------- */
function DayModal({
  dateKey,
  entry,
  isOwner,
  todayKey,
  onClose,
  onSave,
  onDelete,
}: {
  dateKey: string;
  entry?: DayEntry;
  isOwner: boolean;
  todayKey: string;
  onClose: () => void;
  onSave: (e: DayEntry, isNew: boolean) => void;
  onDelete: (k: string) => void;
}) {
  const went = !!entry;
  const [note, setNote] = useState(entry?.note ?? "");
  const [muscle, setMuscle] = useState(entry?.muscle ?? "");
  const [mood, setMood] = useState<Mood | undefined>(entry?.mood);
  const isFuture = dateKey > todayKey;

  const pretty = new Date(dateKey + "T00:00:00").toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const save = () =>
    onSave({ date: dateKey, note: note.trim() || undefined, muscle: muscle.trim() || undefined, mood }, !went);

  return (
    <Overlay onClose={onClose}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted">
        {went ? "Zalga borilgan kun" : "Kun"}
      </p>
      <h3 className="mt-1 text-lg font-semibold capitalize">{pretty}</h3>

      {isOwner ? (
        isFuture ? (
          <p className="mt-4 text-sm text-muted">Kelajakdagi kunni belgilab bo&apos;lmaydi.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Mushak guruhi
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MUSCLE_PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMuscle(m)}
                    className={[
                      "rounded-full border px-2.5 py-1 text-xs transition",
                      muscle === m
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-border-soft text-muted hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                placeholder="yoki o'zing yoz…"
                className="w-full rounded-lg border border-border-soft bg-card px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Kayfiyat
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(MOOD_LABELS) as Mood[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(mood === m ? undefined : m)}
                    className={[
                      "rounded-full border px-2.5 py-1 text-xs transition",
                      mood === m
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-border-soft text-muted hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {MOOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Izoh
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Bugun qanday o'tdi?"
                className="w-full resize-none rounded-lg border border-border-soft bg-card px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                {went ? "Saqlash" : "Bordim ✅"}
              </button>
              {went && (
                <button
                  onClick={() => onDelete(dateKey)}
                  className="rounded-xl border border-border-soft px-4 py-2.5 text-sm font-medium text-muted transition hover:border-red-300 hover:text-red-500"
                >
                  O&apos;chirish
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          {went ? (
            <>
              <Detail label="Holat" value="Zalga borilgan ✅" />
              {entry?.muscle && <Detail label="Mashq" value={entry.muscle} />}
              {entry?.mood && <Detail label="Kayfiyat" value={MOOD_LABELS[entry.mood]} />}
              {entry?.note && <Detail label="Izoh" value={entry.note} />}
            </>
          ) : (
            <p className="text-muted">Bu kuni zalga borilmagan.</p>
          )}
        </div>
      )}
    </Overlay>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-soft py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/* ---------- Login modali ---------- */
function LoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) onSuccess();
    else setError("PIN noto'g'ri");
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-lg font-semibold">Egasi sifatida kirish</h3>
      <p className="mt-1 text-sm text-muted">
        Davomat belgilash uchun PIN kiriting.
      </p>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="PIN"
        className="mt-4 w-full rounded-lg border border-border-soft bg-card px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
      />
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !pin}
        className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
      >
        {busy ? "Tekshirilmoqda…" : "Kirish"}
      </button>
    </Overlay>
  );
}

/* ---------- Sozlamalar modali ---------- */
function SettingsModal({
  config,
  onClose,
  onSaved,
}: {
  config: Config;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [goal, setGoal] = useState(config.weeklyGoal);
  const [name, setName] = useState(config.ownerName);

  const save = async () => {
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyGoal: goal, ownerName: name }),
    });
    onSaved();
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-lg font-semibold">Sozlamalar</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Ism</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border-soft bg-card px-3 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Haftalik maqsad: {goal} marta
          </label>
          <input
            type="range"
            min={1}
            max={7}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="w-full accent-neutral-900"
          />
        </div>
        <button
          onClick={save}
          className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Saqlash
        </button>
      </div>
    </Overlay>
  );
}

/* ---------- Umumiy overlay ---------- */
function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="overlay-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="sheet-in w-full max-w-md rounded-t-3xl border border-border-soft bg-card p-5 sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
