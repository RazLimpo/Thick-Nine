// app/api/affiliate-settings/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

function hdrs(req: NextRequest, json = false) {
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  const a = req.headers.get("authorization");
  const c = req.headers.get("cookie");
  if (a) h.Authorization = a;
  if (c) h.Cookie = c;
  return h;
}

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/affiliate-settings/payouts`, {
      method: "GET",
      headers: hdrs(request),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
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
    const res = await fetch(`${BACKEND_URL}/api/affiliate-settings/payouts`, {
      method: "POST",
      headers: hdrs(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
