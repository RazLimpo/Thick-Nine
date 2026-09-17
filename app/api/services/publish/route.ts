// app/api/services/publish/route.ts

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Extract Authorization header sent by client
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized. Missing authentication token." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // 2. Forward request to Express backend API
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