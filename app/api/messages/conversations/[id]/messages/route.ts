// app/api/messages/conversations/[id]/messages/route.ts
// POST send message

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function POST(
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
    const body = await request.json().catch(() => ({}));

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(
      `${BACKEND_URL}/api/messages/conversations/${id}/messages`,
      {
        method: "POST",
        headers,
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
            (data as { message?: string }).message || "Failed to send message.",
        },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
