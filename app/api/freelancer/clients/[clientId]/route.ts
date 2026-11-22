// app/api/freelancer/clients/[clientId]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const headers: Record<string, string> = { Accept: "application/json" };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const response = await fetch(
      `${BACKEND_URL}/api/freelancer/clients/${params.clientId}`,
      { method: "GET", headers, cache: "no-store" }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : "Failed to load client.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> | { clientId: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const body = await request.json().catch(() => ({}));
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const response = await fetch(
      `${BACKEND_URL}/api/freelancer/clients/${params.clientId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: e instanceof Error ? e.message : "Failed to update.",
      },
      { status: 500 }
    );
  }
}
