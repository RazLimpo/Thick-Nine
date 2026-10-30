// app/api/freelancer/analytics/promos/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

function fwdHeaders(request: NextRequest) {
  const headers: Record<string, string> = { Accept: "application/json" };
  const a = request.headers.get("authorization");
  const c = request.headers.get("cookie");
  if (a) headers.Authorization = a;
  if (c) headers.Cookie = c;
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/freelancer/analytics/promos`,
      { method: "GET", headers: fwdHeaders(request), cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const headers = {
      ...fwdHeaders(request),
      "Content-Type": "application/json",
    };
    const response = await fetch(
      `${BACKEND_URL}/api/freelancer/analytics/promos`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
