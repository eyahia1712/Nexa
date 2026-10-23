import { NextResponse } from "next/server";

import { SKILL_BY_ID } from "@/lib/catalog";
import { arxivCount } from "@/lib/signals/fetchers";

/**
 * GET /api/arxiv?q=<skill id | total>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * → { count }: how many arXiv papers match that skill (or all papers) in the
 * window. One question per request, so it works on serverless hosting; the
 * CDN shares answers between visitors, which keeps us well inside arXiv's
 * rate limit.
 */
export const runtime = "nodejs";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (!DAY.test(from) || !DAY.test(to))
    return NextResponse.json(
      { error: "from and to must be YYYY-MM-DD" },
      { status: 400 },
    );
  const query = q === "total" ? null : (SKILL_BY_ID.get(q)?.arxiv ?? undefined);
  if (query === undefined)
    return NextResponse.json(
      { error: `No arXiv query for “${q}”` },
      { status: 404 },
    );
  try {
    const count = await arxivCount(query, { from, to });
    return NextResponse.json(
      { q, from, to, count, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
