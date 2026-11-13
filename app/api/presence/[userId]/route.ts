// app/api/presence/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const userId = params.userId;
    const res = await fetch(`${BACKEND_URL}/api/presence/${userId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    console.error("presence user proxy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
