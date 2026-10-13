// app/api/services/draft/update/route.ts
// Next.js App Router — update draft (proxies FormData + auth to Express)

import { NextRequest, NextResponse } from "next/server";
import { validateAddonList } from "@/lib/addon-limits";

const BACKEND_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

export async function PUT(request: NextRequest) {
  if (!BACKEND_URL) {
    console.error("BACKEND_API_URL is not set");
    return NextResponse.json(
      { message: "Server misconfiguration: backend URL missing." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();

    const addonsRaw = formData.get("addons");
    if (addonsRaw && typeof addonsRaw === "string") {
      try {
        const parsedAddons = JSON.parse(addonsRaw);
        const addonError = validateAddonList(parsedAddons);
        if (addonError) {
          return NextResponse.json(
            { success: false, error: addonError },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON format for addons." },
          { status: 400 }
        );
      }
    }

    const authHeader = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    const headers: Record<string, string> = {};
    if (authHeader) headers.Authorization = authHeader;
    if (cookie) headers.Cookie = cookie;
    // Do NOT set Content-Type — fetch will set multipart boundary for FormData

    const response = await fetch(`${BACKEND_URL}/api/services/draft/update`, {
      method: "PUT",
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            data.error ||
            "Failed to update draft on backend server",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Error proxying draft update payload:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
