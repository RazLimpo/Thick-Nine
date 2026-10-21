// app/api/affiliate-settings/social/[platform]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> | { platform: string } }
) {
  try {
    const { platform } = await Promise.resolve(context.params);
    const headers: Record<string, string> = { Accept: "application/json" };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const res = await fetch(
      `${BACKEND_URL}/api/affiliate-settings/social/${encodeURIComponent(platform)}`,
      { method: "DELETE", headers, cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
