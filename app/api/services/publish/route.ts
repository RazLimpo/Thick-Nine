// app/api/services/publish/route.ts

import { NextResponse } from "next/server";
import { validateAddonList } from "@/lib/addon-limits";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized. Missing authentication token." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // 1. Validate add-ons array before proxying
    if (body.addons) {
      const addonError = validateAddonList(body.addons);
      if (addonError) {
        return NextResponse.json({ message: addonError }, { status: 400 });
      }
    }

    // 2. Forward to Express backend
    const backendUrl = process.env.BACKEND_API_URL || "https://your-decoupled-backend.com";

    const backendResponse = await fetch(`${backendUrl}/api/services/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Publish proxy error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}