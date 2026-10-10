// app/freelancer-orders-history/page.tsx
import { Metadata } from "next";
import FreelancerOrdersHistoryClient from "./client";

export const metadata: Metadata = {
  title: "Order History | Thick Nine",
  description: "Full record of your past and completed service orders.",
};

export default function FreelancerOrdersHistoryPage() {
  return <FreelancerOrdersHistoryClient />;
}
