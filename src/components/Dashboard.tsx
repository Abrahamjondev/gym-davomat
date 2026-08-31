"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { DayEntry, Config, Mood } from "@/lib/types";
import { Stats } from "@/lib/stats";
import { quoteOfDay, MUSCLE_PRESETS } from "@/lib/quotes";
import { toKey } from "@/lib/stats";
import { compressImage } from "@/lib/image";
import MonthCalendar from "./MonthCalendar";
import YearHeatmap from "./YearHeatmap";
import MonthlyChart from "./MonthlyChart";

const REACTIONS = ["💪", "🔥", "👏", "❤️"];

interface ApiData {
  days: Record<string, DayEntry>;
  config: Config;
  stats: Stats;
  isOwner: boolean;
  avatar: string | null;
  reactions: Record<string, number>;
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
  const [counts, setCounts] = useState<{
    views: number;
    visitors: number;
    today: number;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/data", { cache: "no-store" });
    const json = (await res.json()) as ApiData;
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tashrifni bir marta hisoblaymiz (sahifa ochilganda).
  useEffect(() => {
    fetch("/api/view", { method: "POST" })
      .then((r) => r.json())
      .then(setCounts)
      .catch(() => {});
  }, []);

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
      colors: ["#525252", "#404040", "#737373", "#a3a3a3"],
      scalar: 0.9,
    });
  };

  const saveEntry = async (
    entry: DayEntry & { photo?: string; removePhoto?: boolean },
    isNew: boolean,
  ) => {
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

  // Profil rasmini yuklash (egasi).
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    try {
      const dataUrl = await compressImage(file, 320, 0.8);
      await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: dataUrl }),
      });
      await load();
    } catch {
      // e'tiborsiz
    }
    setAvatarBusy(false);
  };

  // Reaksiya bosish (hamma).
  const react = async (emoji: string) => {
    // optimistik
    setData((d) =>
      d
        ? { ...d, reactions: { ...d.reactions, [emoji]: (d.reactions[emoji] ?? 0) + 1 } }
        : d,
    );
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const json = await res.json();
      if (json?.reactions) setData((d) => (d ? { ...d, reactions: json.reactions } : d));
    } catch {
      // e'tiborsiz
    }
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
        <div className="flex items-center gap-3">
          {/* Avatar (dumaloq profil rasmi) */}
          <button
            onClick={() => isOwner && avatarInputRef.current?.click()}
            disabled={!isOwner || avatarBusy}
            className={[
              "relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border-soft bg-neutral-100 sm:h-16 sm:w-16",
              isOwner ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
            title={isOwner ? "Rasmni o'zgartirish" : config.ownerName}
          >
            {data!.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data!.avatar}
                alt={config.ownerName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-xl font-bold text-neutral-400">
                {config.ownerName.charAt(0).toUpperCase()}
              </span>
            )}
            {isOwner && (
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-medium text-white">
                {avatarBusy ? "..." : "📷"}
              </span>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPickAvatar}
          />

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted">
              Gym Davomat
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {config.ownerName}
            </h1>
            <p className="mt-1 text-sm text-muted">{quoteOfDay(now)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isOwner ? (
            <>
              <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-medium text-white">
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

      {/* Tashrifchilar hisoblagichi */}
      {counts && (
        <div className="fade-up mb-5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-card px-3 py-1.5">
            👁 <b className="text-foreground">{counts.views.toLocaleString()}</b> ko&apos;rish
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-card px-3 py-1.5">
            🧑 <b className="text-foreground">{counts.visitors.toLocaleString()}</b> tashrifchi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-card px-3 py-1.5">
            📅 bugun <b className="text-foreground">{counts.today.toLocaleString()}</b>
          </span>
        </div>
      )}

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

        <MonthlyChart days={days} />
      </div>

      {/* Reaksiyalar — hamma bosishi mumkin */}
      <ReactionsBar reactions={data!.reactions} onReact={react} />

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
        "fade-up mb-5 flex items-center justify-between gap-3 rounded-2xl border p-4 sm:p-5",
        went
          ? "border-neutral-800 bg-neutral-800 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
          : "border-border-soft bg-card",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p
          className={[
            "text-xs font-medium uppercase tracking-widest",
            went ? "text-white/70" : "text-muted",
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
          "shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95",
          went
            ? "bg-white text-neutral-900 hover:bg-neutral-100"
            : "bg-neutral-800 text-white hover:bg-neutral-900",
        ].join(" ")}
      >
        {went ? "Ko'rish" : isOwner ? "Bugun bordim" : "Belgilash"}
      </button>
    </div>
  );
}

/* ---------- Reaksiyalar ---------- */
function ReactionsBar({
  reactions,
  onReact,
}: {
  reactions: Record<string, number>;
  onReact: (emoji: string) => void;
}) {
  const [popped, setPopped] = useState<string | null>(null);
  const total = REACTIONS.reduce((s, e) => s + (reactions[e] ?? 0), 0);

  const tap = (e: string) => {
    setPopped(e);
    setTimeout(() => setPopped(null), 400);
    onReact(e);
  };

  return (
    <div className="fade-up mt-5 rounded-2xl border border-border-soft bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Qo&apos;llab-quvvatlash</h2>
        <span className="text-xs text-muted">{total.toLocaleString()} reaksiya</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {REACTIONS.map((e) => (
          <button
            key={e}
            onClick={() => tap(e)}
            className="flex flex-col items-center gap-1 rounded-xl border border-border-soft py-3 transition hover:border-neutral-300 active:scale-90"
          >
            <span className={popped === e ? "mark-pop text-2xl" : "text-2xl"}>{e}</span>
            <span className="text-xs font-semibold text-foreground">
              {(reactions[e] ?? 0).toLocaleString()}
            </span>
          </button>
        ))}
      </div>
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
              ? "border-neutral-800 bg-neutral-800 text-white shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
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
                ? "border-neutral-800 bg-neutral-100 text-neutral-900"
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
  onSave: (
    e: DayEntry & { photo?: string; removePhoto?: boolean },
    isNew: boolean,
  ) => void;
  onDelete: (k: string) => void;
}) {
  const went = !!entry;
  const [note, setNote] = useState(entry?.note ?? "");
  const [muscle, setMuscle] = useState(entry?.muscle ?? "");
  const [mood, setMood] = useState<Mood | undefined>(entry?.mood);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isFuture = dateKey > todayKey;

  // Mavjud rasmni yuklab olamiz (egasi ham, mehmon ham ko'radi).
  useEffect(() => {
    let active = true;
    if (entry?.hasPhoto) {
      fetch(`/api/photo?date=${dateKey}`)
        .then((r) => r.json())
        .then((d) => {
          if (active && d.photo) setExistingPhoto(d.photo);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [dateKey, entry?.hasPhoto]);

  const displayPhoto = newPhoto ?? (photoRemoved ? null : existingPhoto);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file) return;
    setPhotoBusy(true);
    try {
      const compressed = await compressImage(file);
      setNewPhoto(compressed);
      setPhotoRemoved(false);
    } catch {
      // e'tiborsiz qoldiramiz
    }
    setPhotoBusy(false);
  };

  const clearPhoto = () => {
    setNewPhoto(null);
    setPhotoRemoved(true);
  };

  const pretty = new Date(dateKey + "T00:00:00").toLocaleDateString("uz-UZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const save = () => {
    setSaving(true);
    onSave(
      {
        date: dateKey,
        note: note.trim() || undefined,
        muscle: muscle.trim() || undefined,
        mood,
        ...(newPhoto ? { photo: newPhoto } : {}),
        ...(!newPhoto && photoRemoved ? { removePhoto: true } : {}),
      },
      !went,
    );
  };

  const chip = (active: boolean) =>
    [
      "rounded-full border px-2.5 py-1.5 text-xs transition active:scale-95",
      active
        ? "border-neutral-800 bg-neutral-800 text-white"
        : "border-border-soft text-muted hover:border-neutral-300",
    ].join(" ");

  return (
    <Overlay onClose={onClose}>
      <p className="text-xs font-medium uppercase tracking-widest text-muted">
        {went ? "Zalga borilgan kun" : "Kun"}
      </p>
      <h3 className="mt-1 text-lg font-semibold capitalize">{pretty}</h3>

      {isOwner ? (
        isFuture ? (
          <p className="mt-4 text-sm text-muted">
            Kelajakdagi kunni belgilab bo&apos;lmaydi.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Mushak guruhi
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MUSCLE_PRESETS.map((m) => (
                  <button key={m} onClick={() => setMuscle(m)} className={chip(muscle === m)}>
                    {m}
                  </button>
                ))}
              </div>
              <input
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                placeholder="yoki o'zing yoz…"
                className="w-full rounded-lg border border-border-soft bg-card px-3 py-2.5 text-base outline-none focus:border-neutral-400"
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
                    className={chip(mood === m)}
                  >
                    {MOOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Rasm{" "}
                <span className="font-normal text-neutral-400">
                  (ixtiyoriy · faqat kamera)
                </span>
              </label>
              {displayPhoto ? (
                <div className="relative overflow-hidden rounded-xl border border-border-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayPhoto}
                    alt="Kun rasmi"
                    className="max-h-72 w-full object-cover"
                  />
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur"
                    >
                      Qayta olish
                    </button>
                    <button
                      onClick={clearPhoto}
                      className="rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm font-medium text-muted transition hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-60"
                >
                  {photoBusy ? "Tayyorlanmoqda…" : "📷 Kamera orqali rasm olish"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onPickPhoto}
              />
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
                className="w-full resize-none rounded-lg border border-border-soft bg-card px-3 py-2.5 text-base outline-none focus:border-neutral-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 active:scale-95 disabled:opacity-60"
              >
                {saving ? "Saqlanmoqda…" : went ? "Saqlash" : "Bordim ✅"}
              </button>
              {went && (
                <button
                  onClick={() => onDelete(dateKey)}
                  className="rounded-xl border border-border-soft px-4 py-3 text-sm font-medium text-muted transition hover:border-red-300 hover:text-red-500"
                >
                  O&apos;chirish
                </button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {went ? (
            <>
              <Detail label="Holat" value="Zalga borilgan ✅" />
              {entry?.muscle && <Detail label="Mashq" value={entry.muscle} />}
              {entry?.mood && <Detail label="Kayfiyat" value={MOOD_LABELS[entry.mood]} />}
              {entry?.note && <Detail label="Izoh" value={entry.note} />}
              {displayPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayPhoto}
                  alt="Kun rasmi"
                  className="mt-1 max-h-72 w-full rounded-xl border border-border-soft object-cover"
                />
              )}
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
        className="mt-4 w-full rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 active:scale-95 disabled:opacity-40"
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
            className="w-full accent-neutral-800"
          />
        </div>
        <button
          onClick={save}
          className="w-full rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 active:scale-95"
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
        className="sheet-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border-soft bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-h-[88vh] sm:rounded-3xl sm:p-6 sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
