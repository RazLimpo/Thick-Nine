// app/client-orders-history/page.tsx
import { Metadata } from "next";
import { Suspense } from "react";
import ClientOrdersHistoryClient from "./client";

export const metadata: Metadata = {
  title: "Order History | Thick 9",
  description: "Track and manage your purchases as a client.",
};

export default function ClientOrdersHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="order-management-page-container" style={{ padding: 40 }}>
          Loading order history…
        </div>
      }
    >
      <ClientOrdersHistoryClient />
    </Suspense>
  );
}
