// app/api/services/draft/update/route.ts

import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/services/draft/update`, {
      method: "PUT",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update draft on backend server");
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Error proxying draft update payload:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}