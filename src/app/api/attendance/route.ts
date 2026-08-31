import { NextRequest, NextResponse } from "next/server";
import { setDay, removeDay } from "@/lib/storage";
import { isOwner } from "@/lib/auth";
import { DayEntry, Mood } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MOODS: Mood[] = ["great", "good", "ok", "tired"];

// Davomat qo'yish / yangilash — FAQAT egasi.
export async function POST(req: NextRequest) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const date = body?.date;
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Noto'g'ri sana" }, { status: 400 });
  }
  const entry: DayEntry = {
    date,
    note: typeof body.note === "string" ? body.note.slice(0, 300) : undefined,
    muscle: typeof body.muscle === "string" ? body.muscle.slice(0, 80) : undefined,
    mood: MOODS.includes(body.mood) ? body.mood : undefined,
  };
  await setDay(entry);
  return NextResponse.json({ ok: true, entry });
}

// Davomatni o'chirish — FAQAT egasi.
export async function DELETE(req: NextRequest) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Noto'g'ri sana" }, { status: 400 });
  }
  await removeDay(date);
  return NextResponse.json({ ok: true });
}
