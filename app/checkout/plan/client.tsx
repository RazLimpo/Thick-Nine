// app/checkout/plan/client.tsx


"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import '../../../styles/pages/checkout-plan.css';


export default function PlanCheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const plan = searchParams.get("plan") || "silver";
  const draftId = searchParams.get("draftId") || "";

  const [isProcessing, setIsProcessing] = useState(false);

  // Card details state
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

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

    setTimeout(() => {
      setIsProcessing(false);
      router.push(`/freelancer-dashboard?status=success&draftId=${draftId}&plan=${plan}`);
    }, 2000);
  };

  return (
    <main className="checkout-main">
      <h1>Upgrade Service Listing</h1>
      <p className="checkout-subtitle">
        Complete your payment to activate your service listing on the <strong>{selectedPlanInfo.name}</strong>.
      </p>

      {draftId && (
        <div className="draft-info">
          Draft ID: <code>{draftId}</code>
        </div>
      )}

      {/* Plan Summary - Glassmorphism */}
      <div className="plan-summary glassmorphism">
        <h3>Summary</h3>
        <div className="summary-row">
          <span>{selectedPlanInfo.name}</span>
          <strong>${selectedPlanInfo.price.toFixed(2)} / mo</strong>
        </div>

        <ul className="features-list">
          {selectedPlanInfo.features.map((feat, idx) => (
            <li key={idx}>{feat}</li>
          ))}
        </ul>

        <hr className="divider" />

        <div className="total-row">
          <span>Total Due</span>
          <span>${selectedPlanInfo.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handlePayment} className="payment-form">
        <h3>Card Information</h3>
        
        <div className="form-group">
          <label>Name on Card</label>
          <input
            type="text"
            required
            placeholder="John Doe"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Card Number</label>
          <input
            type="text"
            required
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Expiration (MM/YY)</label>
            <input
              type="text"
              required
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>CVV / CVC</label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={isProcessing} className="pay-button">
          {isProcessing ? "Processing Card..." : `Pay $${selectedPlanInfo.price.toFixed(2)}`}
        </button>
      </form>

      <div className="back-link">
        <Link href="/post-service">
          &larr; Back to Service Editor
        </Link>
      </div>
    </main>
  );
}