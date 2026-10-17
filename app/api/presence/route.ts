import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

/** GET /api/presence?ids=id1,id2,id3 */
export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { message: "Server misconfiguration: backend URL missing." },
      { status: 500 }
    );
  }

  try {
    const ids = request.nextUrl.searchParams.get("ids") || "";
    const res = await fetch(
      `${BACKEND_URL}/api/presence?ids=${encodeURIComponent(ids)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    console.error("presence batch proxy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}