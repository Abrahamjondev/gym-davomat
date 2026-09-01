import { NextRequest } from "next/server";
import { getPhoto } from "@/lib/storage";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Kun rasmini <img src> uchun bevosita bayt sifatida qaytaradi.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return new Response("Bad request", { status: 400 });
  }
  const dataUrl = await getPhoto(date);
  if (!dataUrl) return new Response("Not found", { status: 404 });

  const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return new Response("Bad data", { status: 500 });
  const contentType = m[1];
  const bytes = Buffer.from(m[2], "base64");

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=60",
    },
  });
}
