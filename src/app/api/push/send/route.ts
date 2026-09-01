import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getAll, getPushSubs, removePushSub } from "@/lib/storage";
import { toKey, weekStartKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Vercel Cron har kuni chaqiradi. Egasi bugun bormagan bo'lsa eslatma yuboradi.
export async function GET(req: NextRequest) {
  // Cron himoyasi: Vercel `Authorization: Bearer <CRON_SECRET>` qo'shadi.
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const { days, config } = await getAll();
  const now = new Date();
  const todayKey = toKey(now);

  // Bugun belgilangan bo'lsa — eslatma kerak emas.
  if (days[todayKey]) {
    return NextResponse.json({ sent: 0, reason: "already-marked" });
  }
  // Haftalik maqsad allaqachon bajarilgan bo'lsa — eslatma kerak emas.
  const ws = weekStartKey(now);
  let weekCount = 0;
  for (const k in days) if (weekStartKey(new Date(k + "T00:00:00")) === ws) weekCount++;
  if (weekCount >= Math.max(1, config.weeklyGoal)) {
    return NextResponse.json({ sent: 0, reason: "goal-met" });
  }

  const subs = await getPushSubs();
  if (subs.length === 0) return NextResponse.json({ sent: 0, reason: "no-subs" });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:example@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  const payload = JSON.stringify({
    title: "Gym vaqti! 🏋️",
    body: `Bu hafta ${weekCount}/${config.weeklyGoal}. Bugun ham borib qo'ygin!`,
    url: "/",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await removePushSub(sub.endpoint);
      }
    }),
  );

  return NextResponse.json({ sent });
}
