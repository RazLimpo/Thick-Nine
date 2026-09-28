// app/api/services/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  "http://localhost:5000";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Service ID is required." },
        { status: 400 }
      );
    }

    const response = await fetch(`\( {BACKEND_URL}/api/services/ \){id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Service not found.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("GET service proxy error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}