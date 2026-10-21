// app/api/affiliate-settings/generate-banner/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const res = await fetch(
      `${BACKEND_URL}/api/affiliate-settings/generate-banner`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
