import type { Metadata } from "next";
import FreelancerPartnersClient from "./client";

export const metadata: Metadata = {
  title: "Marketing Partners | Thick 9",
  description: "Manage Affiliate Group partnerships that promote your services.",
};

export default function FreelancerPartnersPage() {
  return <FreelancerPartnersClient />;
}
