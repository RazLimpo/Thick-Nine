// app/api/admin/me/route.ts
// Next.js proxy → Express GET /api/admin/me

import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  API_BASE_URL ||
  "http://localhost:5000";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookie = req.headers.get("cookie");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: authHeader,
    };
    if (cookie) headers.Cookie = cookie;

    const backendRes = await fetch(`${BACKEND}/api/admin/me`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Failed to load administrator profile.",
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("GET /api/admin/me proxy error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message },
      { status: 502 }
    );
  }
}
