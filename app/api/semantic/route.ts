import { NextResponse } from "next/server";

/**
 * Proxy to the RunPod serverless endpoint (runpod/handler.py). Keeps the API
 * key on the server. Returns { enabled: false } when RunPod is not configured,
 * so the app works without it.
 */
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    enabled: Boolean(
      process.env.RUNPOD_API_KEY && process.env.RUNPOD_ENDPOINT_ID,
    ),
  });
}

export async function POST(request: Request) {
  const key = process.env.RUNPOD_API_KEY;
  const endpoint = process.env.RUNPOD_ENDPOINT_ID;
  if (!key || !endpoint) return NextResponse.json({ enabled: false });

  const input = (await request.json()) as {
    profile: string[];
    roles: Record<string, string[]>;
  };
  try {
    const response = await fetch(
      `https://api.runpod.ai/v2/${endpoint}/runsync`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(90_000),
      },
    );
    const body = (await response.json()) as {
      status?: string;
      output?: {
        scores?: Record<string, number>;
        model?: string;
        device?: string;
        error?: string;
      };
    };
    if (!response.ok || body.status !== "COMPLETED" || !body.output?.scores) {
      return NextResponse.json(
        {
          enabled: true,
          error:
            body.output?.error ??
            `RunPod status ${body.status ?? response.status}`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ enabled: true, ...body.output });
  } catch (error) {
    return NextResponse.json(
      { enabled: true, error: (error as Error).message },
      { status: 502 },
    );
  }
}
