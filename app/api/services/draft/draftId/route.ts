// app/api/services/draft/[draftId]/route.ts
// Next.js App Router — load a single draft (proxies to Express with auth)

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:5000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> | { draftId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const { draftId } = params;

    if (!draftId) {
      return NextResponse.json({ message: "draftId is required." }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(`${BACKEND_URL}/api/services/draft/${draftId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to load draft." },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("GET draft proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
