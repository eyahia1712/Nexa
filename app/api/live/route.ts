import { NextResponse } from "next/server";

import { watchLive } from "@/lib/signals/live-stream";

/** GET ?since=<epoch ms> → live arXiv samples taken since then (and keeps the feed running). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get("since") ?? 0);
  return NextResponse.json(watchLive(Number.isFinite(since) ? since : 0));
}
