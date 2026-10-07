// app/api/messages/upload/route.ts
// Proxy multipart upload to Express → Cloudinary

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type") || "";

    // Forward the raw body (multipart) as-is
    const body = await request.arrayBuffer();

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;
    if (contentType) headers["Content-Type"] = contentType;

    const response = await fetch(`${BACKEND_URL}/api/messages/upload`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            (data as { message?: string }).message || "Upload failed.",
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
