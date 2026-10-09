// app/freelancer-orders/page.tsx
import { Metadata } from "next";
import FreelancerOrdersClient from "./client";

export const metadata: Metadata = {
  title: "Sales & Order Management | Thick Nine",
  description: "Manage all your active and pending orders as a freelancer.",
};

export default function FreelancerOrdersPage() {
  return <FreelancerOrdersClient />;
}
