// app/freelancer-clients/page.tsx
import type { Metadata } from "next";
import FreelancerClientsClient from "./client";
import "@/styles/pages/freelancer-clients.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Management | Thick 9",
  description:
    "View and manage clients you have worked with — lifetime value, notes, and order history.",
};

export default function FreelancerClientsPage() {
  return <FreelancerClientsClient />;
}
