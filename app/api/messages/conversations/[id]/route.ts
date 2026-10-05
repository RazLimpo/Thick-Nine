// app/api/messages/conversations/[id]/route.ts
// GET thread · PATCH star|archive|block

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

function authHeaders(request: NextRequest, json = false) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (json) headers["Content-Type"] = "application/json";
  const authHeader = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authHeader) headers.Authorization = authHeader;
  if (cookie) headers.Cookie = cookie;
  return headers;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Conversation ID required." },
        { status: 400 }
      );
    }
    const qs = request.nextUrl.searchParams.toString();
    const response = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${id}${qs ? `?${qs}` : ""}`,
      { method: "GET", headers: authHeaders(request), cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message || "Failed to load thread.",
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Conversation ID required." },
        { status: 400 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const response = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${id}`,
      {
        method: "PATCH",
        headers: authHeaders(request, true),
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message || "Failed to update.",
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
