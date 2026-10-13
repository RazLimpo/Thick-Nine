// app/api/services/publish/route.ts

import { NextResponse } from "next/server";
import { validateAddonList } from "@/lib/addon-limits";

const BACKEND_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

export async function POST(req: Request) {
  if (!BACKEND_URL) {
    console.error("BACKEND_API_URL is not set");
    return NextResponse.json(
      { message: "Server misconfiguration: backend URL missing." },
      { status: 500 }
    );
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized. Missing authentication token." },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (body.addons) {
      const addonError = validateAddonList(body.addons);
      if (addonError) {
        return NextResponse.json({ message: addonError }, { status: 400 });
      }
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/services/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Publish proxy error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
