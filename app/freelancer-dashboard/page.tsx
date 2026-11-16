// app/freelancer-dashboard/page.tsx
import type { Metadata } from "next";
import FreelancerDashboardClient from "./client";

export const metadata: Metadata = {
  title: "Freelancer Dashboard | Thick 9",
  description: "Manage services, orders, earnings, and performance.",
};

export const dynamic = "force-dynamic";

export default function FreelancerDashboardPage() {
  return <FreelancerDashboardClient />;
}
