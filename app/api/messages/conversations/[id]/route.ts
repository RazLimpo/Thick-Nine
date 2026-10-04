// app/api/messages/conversations/[id]/route.ts
// GET thread

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

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

    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const qs = request.nextUrl.searchParams.toString();
    const response = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${id}${qs ? `?${qs}` : ""}`,
      { method: "GET", headers, cache: "no-store" }
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
