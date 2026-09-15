// app/api/services/publish/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // Or your custom auth handler
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import Draft from "@/models/Draft";

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { draftId, serviceStatus } = body;

    // Fetch fresh user data from DB to check active subscription
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    // Fetch the draft to read media counts and requested plan details
    const draft = await Draft.findById(draftId);
    if (!draft || draft.userId.toString() !== user._id.toString()) {
      return NextResponse.json({ message: "Invalid or unauthorized draft." }, { status: 403 });
    }

    // 2. Independently Determine Allowed Plan
    const requestedPlan = draft.selectedPlan || "free";
    const now = new Date();
    
    // Check if user has an active, unexpired paid subscription
    const hasActiveSubscription = 
      user.subscription &&
      user.subscription.plan === requestedPlan &&
      user.subscription.status === "active" &&
      new Date(user.subscription.expiresAt) > now;

    let authorizedPlan = "free";

    if (requestedPlan !== "free") {
      if (!hasActiveSubscription) {
        return NextResponse.json(
          { 
            message: `You do not have an active ${requestedPlan.toUpperCase()} subscription. Please complete checkout to upgrade.`,
            requiresCheckout: true,
            redirectUrl: `/checkout/plan?plan=${requestedPlan}&draftId=${draftId}`
          },
          { status: 402 }
        );
      }
      authorizedPlan = requestedPlan;
    }

    // 3. Enforce Media Limits Server-Side
    const PLAN_LIMITS = {
      free: { images: 3, videos: 0, audio: 0 },
      silver: { images: 10, videos: 1, audio: 1 },
      gold: { images: 20, videos: 3, audio: 3 },
    };

    const limits = PLAN_LIMITS[authorizedPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    if (
      (draft.images?.length || 0) > limits.images ||
      (draft.videos?.length || 0) > limits.videos ||
      (draft.audio?.length || 0) > limits.audio
    ) {
      return NextResponse.json(
        { 
          message: `Your draft exceeds the allowed media uploads for the ${authorizedPlan.toUpperCase()} plan.` 
        },
        { status: 422 }
      );
    }

    // 4. Verify Publishing Permissions
    if (user.isBanned || !user.canPublishServices) {
      return NextResponse.json(
        { message: "Your account does not have permission to publish services." },
        { status: 403 }
      );
    }

    // Proceed to create/publish service with verified 'authorizedPlan'...
    
  } catch (error: any) {
    console.error("Publish validation error:", error);
    return NextResponse.json({ message: "Server error during validation." }, { status: 500 });
  }
}