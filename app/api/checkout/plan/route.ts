import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Or your custom session handler
import { authOptions } from "@/lib/auth";
import Draft from "@/models/Draft";
import Service from "@/models/Service";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
    }

    const { draftId, plan, cardHolder, cardNumber, expiry, cvv } = await req.json();

    // 2. Basic Server Input Validation
    if (!draftId || !["silver", "gold"].includes(plan)) {
      return NextResponse.json({ message: "Invalid draft or plan selection." }, { status: 400 });
    }

    if (!cardHolder || !cardNumber || !expiry || !cvv) {
      return NextResponse.json({ message: "All payment fields are required." }, { status: 400 });
    }

    // 3. Verify Draft Ownership
    const draft = await Draft.findOne({ _id: draftId, userId: session.user.id });
    if (!draft) {
      return NextResponse.json({ message: "Draft not found or unauthorized access." }, { status: 404 });
    }

    // 4. PROCESS PAYMENT WITH YOUR GATEWAY HERE
    // e.g., const paymentResult = await customGateway.charge({ amount, cardNumber, ... })
    // For demo/custom mock gateways, ensure verification passes before DB updates:
    const paymentSuccess = true; 

    if (!paymentSuccess) {
      return NextResponse.json({ message: "Payment transaction declined." }, { status: 402 });
    }

    // 5. Convert Draft to Published Service
    const draftData = draft.toObject();
    delete draftData._id; // Remove draft ID to generate a new Service ID

    const publishedService = await Service.create({
      ...draftData,
      status: "active",
      selectedPlan: plan,
      isPaid: true,
      paidAt: new Date(),
    });

    // 6. Update User's Active Subscription & Delete Converted Draft
    await User.findByIdAndUpdate(session.user.id, {
      "subscription.plan": plan,
      "subscription.status": "active",
      "subscription.updatedAt": new Date(),
    });

    await Draft.findByIdAndDelete(draftId);

    return NextResponse.json({
      success: true,
      serviceId: publishedService._id,
      redirectUrl: "/freelancer-dashboard?status=success",
    });
  } catch (error: any) {
    console.error("Plan checkout error:", error);
    return NextResponse.json({ message: error.message || "Payment processing failed." }, { status: 500 });
  }
}