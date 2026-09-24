import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const backendRes = await fetch(`${API_BASE_URL}/api/admin/messages/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const data = await backendRes.json().catch(() => ({}));

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.message || "Failed to submit reply",
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to submit reply";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}