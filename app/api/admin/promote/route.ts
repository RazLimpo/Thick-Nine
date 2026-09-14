// app/api/admin/promote/route.ts

import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}

/* ---------- POST: Promote Configured User to Super Admin ---------- */
export async function POST() {
  try {
    const configuredEmail =
      process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL?.toLowerCase().trim();

    const secretKey = process.env.ADMIN_SECRET_KEY;

    if (!configuredEmail) {
      console.error(
        "SUPER_ADMIN_BOOTSTRAP_EMAIL is missing from the Next.js environment."
      );

      return NextResponse.json(
        {
          success: false,
          message: "Super Admin promotion email is not configured.",
        },
        { status: 500 }
      );
    }

    if (!secretKey) {
      console.error(
        "ADMIN_SECRET_KEY is missing from the Next.js environment."
      );

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
          email: configuredEmail,
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