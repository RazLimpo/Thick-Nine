import { Suspense } from "react";
import PlanCheckoutClient from "./client";

export default function PlanCheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading Checkout...</div>}>
      <PlanCheckoutClient />
    </Suspense>
  );
}