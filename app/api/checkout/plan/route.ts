import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Extract Authorization header sent by the client
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { message: "Unauthorized. Missing authentication token." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { draftId, plan, cardHolder, cardNumber, expiry, cvv } = body;

    // 2. Validate essential request fields
    if (!draftId || !["silver", "gold"].includes(plan)) {
      return NextResponse.json(
        { message: "Invalid draft or plan selection." },
        { status: 400 }
      );
    }

    if (!cardHolder || !cardNumber || !expiry || !cvv) {
      return NextResponse.json(
        { message: "All payment fields are required." },
        { status: 400 }
      );
    }

    // 3. Proxy request to external decoupled backend API server
    const backendUrl = process.env.BACKEND_API_URL || "https://your-decoupled-backend.com";

    const backendResponse = await fetch(`${backendUrl}/api/checkout/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        draftId,
        plan,
        cardHolder,
        cardNumber,
        expiry,
        cvv,
      }),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data.message || "Payment processing failed on server." },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Plan checkout proxy error:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}