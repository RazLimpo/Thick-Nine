"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const plan = searchParams.get("plan") || "silver";
  const draftId = searchParams.get("draftId") || "";

  const [paymentMethod, setPaymentMethod] = useState<"card" | "payoneer">("card");
  const [isProcessing, setIsProcessing] = useState(false);

  const planDetails: Record<string, { name: string; price: number; features: string[] }> = {
    silver: {
      name: "Silver Plan Upgrade",
      price: 5,
      features: ["Up to 5 Images", "Up to 2 Videos", "Up to 2 Audio Samples", "Enhanced Listing Visibility"],
    },
    gold: {
      name: "Gold Plan Upgrade",
      price: 8,
      features: ["Up to 8 Images", "Up to 4 Videos", "Up to 4 Audio Samples", "Top Search Placement & Badging"],
    },
  };

  const selectedPlanInfo = planDetails[plan] || planDetails["silver"];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (paymentMethod === "payoneer") {
      // 1. Trigger backend endpoint for Payoneer checkout session initialization
      // const res = await fetch("/api/payments/payoneer", { method: "POST", body: JSON.stringify({ draftId, plan }) });
      // const { redirectUrl } = await res.json();
      // window.location.href = redirectUrl;

      setTimeout(() => {
        setIsProcessing(false);
        router.push(`/freelancer-dashboard?status=success&draftId=${draftId}&method=payoneer`);
      }, 2000);
    } else {
      // Direct Card Processing
      setTimeout(() => {
        setIsProcessing(false);
        router.push(`/freelancer-dashboard?status=success&draftId=${draftId}&method=card`);
      }, 2000);
    }
  };

  return (
    <main style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Upgrade Service Listing</h1>
      <p style={{ color: "#666" }}>
        Complete your payment to activate your service listing on the <strong>{selectedPlanInfo.name}</strong>.
      </p>

      {draftId && (
        <div style={{ background: "#f8fafc", padding: "10px 15px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "20px" }}>
          Draft ID: <code>{draftId}</code>
        </div>
      )}

      {/* Plan Summary */}
      <div style={{ border: "1px solid #e2e8f0", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3 style={{ marginTop: 0 }}>Summary</h3>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span>{selectedPlanInfo.name}</span>
          <strong>${selectedPlanInfo.price.toFixed(2)} / mo</strong>
        </div>

        <ul style={{ paddingLeft: "20px", fontSize: "0.9rem", color: "#475569" }}>
          {selectedPlanInfo.features.map((feat, idx) => (
            <li key={idx} style={{ marginBottom: "4px" }}>{feat}</li>
          ))}
        </ul>

        <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "15px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "bold" }}>
          <span>Total Due</span>
          <span>${selectedPlanInfo.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Selection */}
      <form onSubmit={handlePayment}>
        <h3 style={{ fontSize: "1rem", marginBottom: "10px" }}>Select Payment Method</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <label style={{ flex: 1, padding: "12px", border: paymentMethod === "card" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              name="payment"
              value="card"
              checked={paymentMethod === "card"}
              onChange={() => setPaymentMethod("card")}
            />{" "}
            Credit / Debit Card
          </label>

          <label style={{ flex: 1, padding: "12px", border: paymentMethod === "payoneer" ? "2px solid #2563eb" : "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              name="payment"
              value="payoneer"
              checked={paymentMethod === "payoneer"}
              onChange={() => setPaymentMethod("payoneer")}
            />{" "}
            Payoneer
          </label>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          style={{
            width: "100%",
            padding: "12px",
            background: isProcessing ? "#94a3b8" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: isProcessing ? "not-allowed" : "pointer",
          }}
        >
          {isProcessing ? "Processing..." : `Pay $${selectedPlanInfo.price.toFixed(2)} with ${paymentMethod === "payoneer" ? "Payoneer" : "Card"}`}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "15px" }}>
        <Link href="/post-service" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>
          &larr; Back to Service Editor
        </Link>
      </div>
    </main>
  );
}