import { NextRequest, NextResponse } from "next/server";
import { getPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Bitta kun rasmini qaytaradi (ommaviy o'qish).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Noto'g'ri sana" }, { status: 400 });
  }
  const photo = await getPhoto(date);
  return NextResponse.json({ photo });
}
