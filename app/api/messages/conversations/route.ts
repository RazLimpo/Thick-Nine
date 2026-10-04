// app/api/messages/conversations/route.ts
// GET list | POST start conversation

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

function authHeaders(request: NextRequest) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const authHeader = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authHeader) headers.Authorization = authHeader;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const qs = request.nextUrl.searchParams.toString();
    const response = await fetch(
      `${BACKEND_URL}/api/messages/conversations${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: authHeaders(request),
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
            "Failed to load conversations.",
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const headers = {
      ...authHeaders(request),
      "Content-Type": "application/json",
    };
    const response = await fetch(`${BACKEND_URL}/api/messages/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message ||
            "Failed to start conversation.",
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
