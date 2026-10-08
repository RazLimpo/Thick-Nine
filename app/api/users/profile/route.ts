// app/api/users/profile/route.ts
// Proxy GET / PUT / PATCH profile to Express

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
    const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: "GET",
      headers: hdrs(request),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

async function update(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Backend uses PUT; also accept PATCH from client
    const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: "PUT",
      headers: hdrs(request, true),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export const PUT = update;
export const PATCH = update;
