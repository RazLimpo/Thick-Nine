// app/api/bookmarks/check/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const qs = request.nextUrl.search;
    const response = await fetch(`${BACKEND_URL}/api/bookmarks/check${qs}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Failed to check bookmark.",
        },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error("[bookmarks/check] proxy error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
