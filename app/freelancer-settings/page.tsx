// app/freelancer-settings/page.tsx
import { Metadata } from "next";
import FreelancerSettingsClient from "./client";

export const metadata: Metadata = {
  title: "Freelancer Settings | Thick Nine",
  description: "Manage your freelancer profile, payouts, security, and preferences.",
};

export default function FreelancerSettingsPage() {
  return <FreelancerSettingsClient />;
}
