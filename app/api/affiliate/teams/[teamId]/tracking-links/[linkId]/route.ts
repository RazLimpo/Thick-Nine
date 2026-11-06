import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

function forwardHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const a = request.headers.get("authorization");
  const c = request.headers.get("cookie");
  if (a) headers.Authorization = a;
  if (c) headers.Cookie = c;
  return headers;
}

/** PATCH — /api/affiliate/teams/:teamId/tracking-links/:linkId */
export async function PATCH(
  request: NextRequest,
  context: {
    params:
      | Promise<{ teamId: string; linkId: string }>
      | { teamId: string; linkId: string };
  }
) {
  try {
    const { teamId, linkId } = await Promise.resolve(context.params);
    const body = await request.json().catch(() => ({}));
    const res = await fetch(
      `${BACKEND_URL}/api/affiliate/teams/${teamId}/tracking-links/${linkId}`,
      {
        method: "PATCH",
        headers: {
          ...forwardHeaders(request),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
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
