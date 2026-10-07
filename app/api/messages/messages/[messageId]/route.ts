// app/api/messages/messages/[messageId]/route.ts
// DELETE a message (sender only) → soft-delete + Cloudinary destroy

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> | { messageId: string } }
) {
  try {
    const { messageId } = await Promise.resolve(context.params);
    if (!messageId) {
      return NextResponse.json(
        { success: false, message: "messageId required." },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(
      `${BACKEND_URL}/api/messages/messages/${messageId}`,
      { method: "DELETE", headers, cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message || "Failed to delete.",
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
