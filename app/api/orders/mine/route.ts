// app/api/orders/mine/route.ts
// Seller's orders across all services

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams.toString();
    const headers: Record<string, string> = { Accept: "application/json" };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const response = await fetch(
      `${BACKEND_URL}/api/orders/mine${qs ? `?${qs}` : ""}`,
      { method: "GET", headers, cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : "Failed to load orders",
      },
      { status: 500 }
    );
  }
}
