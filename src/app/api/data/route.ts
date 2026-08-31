import { NextResponse } from "next/server";
import { getAll, getAvatar, getReactions } from "@/lib/storage";
import { isOwner } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Ommaviy (public) o'qish. Hamma ko'ra oladi.
export async function GET() {
  const [db, owner, avatar, reactions] = await Promise.all([
    getAll(),
    isOwner(),
    getAvatar(),
    getReactions(),
  ]);
  const stats = computeStats(db.days, db.config);
  return NextResponse.json({
    days: db.days,
    config: db.config,
    stats,
    isOwner: owner,
    avatar,
    reactions,
  });
}
