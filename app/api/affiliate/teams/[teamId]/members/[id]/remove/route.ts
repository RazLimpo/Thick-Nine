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

/**
 * POST /api/affiliate/teams/:teamId/members/:id/remove
 * id = target userId (User._id to remove)
 */
export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ teamId: string; id: string }> | { teamId: string; id: string };
  }
) {
  try {
    const { teamId, id } = await Promise.resolve(context.params);
    const body = await request.json().catch(() => ({}));
    const headers = {
      ...forwardHeaders(request),
      "Content-Type": "application/json",
    };
    const res = await fetch(
      `${BACKEND_URL}/api/affiliate/teams/${teamId}/members/${id}/remove`,
      {
        method: "POST",
        headers,
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
