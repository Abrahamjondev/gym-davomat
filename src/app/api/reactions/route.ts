import { NextRequest, NextResponse } from "next/server";
import { addReaction, getReactions, REACTIONS } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Reaksiya qo'shish — HAMMA (tashrifchilar) bosishi mumkin.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const emoji = body?.emoji;
  if (typeof emoji !== "string" || !REACTIONS.includes(emoji as never)) {
    return NextResponse.json({ error: "Noto'g'ri reaksiya" }, { status: 400 });
  }
  const reactions = await addReaction(emoji);
  return NextResponse.json({ reactions });
}

// Joriy reaksiyalarni olish.
export async function GET() {
  return NextResponse.json({ reactions: await getReactions() });
}
