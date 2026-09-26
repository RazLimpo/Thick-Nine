import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const backendRes = await fetch(
      `${API_BASE_URL}/api/admin/notifications/feed`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to load feed." },
        { status: backendRes.status }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reach backend";
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}