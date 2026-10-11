// app/api/orders/[id]/invoice/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://thick-nine-backend.onrender.com";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const headers: Record<string, string> = {
      Accept: "text/html, application/json",
    };
    const a = request.headers.get("authorization");
    const c = request.headers.get("cookie");
    if (a) headers.Authorization = a;
    if (c) headers.Cookie = c;

    const response = await fetch(
      `${BACKEND_URL}/api/orders/${params.id}/invoice`,
      { method: "GET", headers, cache: "no-store" }
    );

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await response.text();
      return new NextResponse(html, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition":
            response.headers.get("Content-Disposition") ||
            'inline; filename="invoice.html"',
        },
      });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
