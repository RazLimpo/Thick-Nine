import { NextResponse } from "next/server";
import crypto from "crypto";
import Draft from "@/models/Draft";
import Service from "@/models/Service";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-provider-signature"); // Header name varies by provider

    // 1. Verify Request Signature using your Provider Secret Key
    const hash = crypto
      .createHmac("sha512", process.env.PAYMENT_PROVIDER_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // 2. Listen for Successful Charge Event
    if (event.event === "charge.success" || event.status === "successful") {
      const { draftId, userId, targetPlan } = event.data.metadata;

      // 3. Find the draft and publish the service
      const draft = await Draft.findOne({ _id: draftId, userId });
      if (draft) {
        const serviceData = draft.toObject();
        delete serviceData._id;

        await Service.create({
          ...serviceData,
          status: "active",
          selectedPlan: targetPlan,
          isPaid: true,
          paymentReference: event.data.reference,
        });

        await User.findByIdAndUpdate(userId, { "subscription.plan": targetPlan });
        await Draft.findByIdAndDelete(draftId);
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 });
  }
}