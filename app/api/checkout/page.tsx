import { Suspense } from "react";
import CheckoutClient from "./client";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center" }}>Loading Checkout...</div>}>
      <CheckoutClient />
    </Suspense>
  );
}