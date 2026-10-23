import { NextResponse } from "next/server";

import { dosmLabour } from "@/lib/signals/fetchers";

/** GET /api/labour → the latest 13 months of Malaysia's Labour Force Survey (OpenDOSM). */
export const runtime = "nodejs";

export async function GET() {
  try {
    const labour = await dosmLabour(13);
    return NextResponse.json(
      { labour },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
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
