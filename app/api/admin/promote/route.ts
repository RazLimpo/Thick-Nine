import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/* ---------- POST: Promote User to Admin ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, secretKey } = body;

    if (!email || !secretKey) {
      return NextResponse.json(
        { success: false, message: "Email and secretKey are required" },
        { status: 400 }
      );
    }

    // Proxy the promotion request directly to your Render Express backend
    const backendRes = await fetch(`${API_BASE_URL}/api/auth/promote-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, secretKey }),
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}