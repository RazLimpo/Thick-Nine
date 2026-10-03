// app/api/notifications/route.ts

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
    const qs = request.nextUrl.searchParams.toString();

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(
      `${BACKEND_URL}/api/notifications${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message ||
            "Failed to load notifications.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
