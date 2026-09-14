// app/api/admin/promote/route.ts

import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

export const runtime = "nodejs";

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}

/* ---------- POST: Promote Existing User to Super Admin ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    // IMPORTANT:
    // This must be a server-only environment variable.
    // Never use NEXT_PUBLIC_ADMIN_SECRET_KEY.
    const secretKey = process.env.ADMIN_SECRET_KEY;

    if (!secretKey) {
      console.error("ADMIN_SECRET_KEY is missing from the Next.js environment.");

      return NextResponse.json(
        {
          success: false,
          message: "Admin promotion is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const backendRes = await fetch(
      `${API_BASE_URL}/api/auth/promote-admin`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          secretKey,
        }),
        cache: "no-store",
      }
    );

    const data = await backendRes.json().catch(() => ({
      success: false,
      message: "Invalid response from backend.",
    }));

    return NextResponse.json(data, {
      status: backendRes.status,
    });
  } catch (error) {
    console.error("Next.js Super Admin promotion error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to contact the backend promotion service.",
      },
      { status: 500 }
    );
  }
}