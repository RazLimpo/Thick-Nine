// app/r/[code]/route.ts
// Public tracking redirect — no auth
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const { code } = await Promise.resolve(context.params);
    if (!code) {
      return NextResponse.redirect(new URL("/", _request.url));
    }

    const res = await fetch(
      `${BACKEND_URL}/api/affiliate/teams/go/${encodeURIComponent(code)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.redirectUrl) {
      return NextResponse.redirect(new URL("/?tg=invalid", _request.url));
    }

    return NextResponse.redirect(data.redirectUrl, 302);
  } catch {
    return NextResponse.redirect(new URL("/", _request.url));
  }
}
