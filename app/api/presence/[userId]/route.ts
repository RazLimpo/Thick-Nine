import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(
  _request: NextRequest,
  context: { params: { userId: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { message: "Server misconfiguration: backend URL missing." },
      { status: 500 }
    );
  }

  try {
    const userId = context.params.userId;
    const res = await fetch(`${BACKEND_URL}/api/presence/${userId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    console.error("presence user proxy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}