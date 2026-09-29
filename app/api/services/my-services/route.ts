// app/api/services/my-services/route.ts

import { NextRequest, NextResponse } from "next/server";

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

    const backendUrl = `${BACKEND_URL}/api/services/my-services`;
    console.log("[my-services] Proxying to:", backendUrl);
    console.log("[my-services] Has Authorization:", Boolean(authHeader));

    let response: Response;
    try {
      response = await fetch(backendUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });
    } catch (networkErr: unknown) {
      const msg =
        networkErr instanceof Error ? networkErr.message : String(networkErr);
      console.error("[my-services] Network error:", msg);
      return NextResponse.json(
        {
          success: false,
          message: `Backend unreachable (${BACKEND_URL}): ${msg}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));
    console.log("[my-services] Backend status:", response.status);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.msg || data.message || "Failed to fetch your services.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[my-services] Unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}