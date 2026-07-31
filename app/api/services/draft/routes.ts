import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/services/draft`, {
      method: "POST",
      body: formData, // Automatic boundary generation for multipart/form-data
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save draft on backend server");
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Error proxying draft payload:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}