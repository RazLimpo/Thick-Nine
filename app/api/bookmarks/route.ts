// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const qs = request.nextUrl.search;
    const response = await fetch(`${BACKEND_URL}/api/bookmarks${qs}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Failed to fetch bookmarks.",
        },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    console.error("[bookmarks] GET proxy error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
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
          message: data.message || "Failed to create bookmark.",
        },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    console.error("[bookmarks] POST proxy error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
      method: "DELETE",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Failed to delete bookmark.",
        },
        { status: response.status }
      );
    }
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    console.error("[bookmarks] DELETE proxy error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
