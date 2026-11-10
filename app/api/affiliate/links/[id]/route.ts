// app/api/affiliate/links/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Link id is required." },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const backendUrl = `${BACKEND_URL.replace(/\/+$/, "")}/api/affiliate/links/${encodeURIComponent(id)}`;
    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
