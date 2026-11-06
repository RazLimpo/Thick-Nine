import type { Metadata } from "next";
import AffiliateTeamsClient from "./client";

export const metadata: Metadata = {
  title: "Affiliate Groups | Thick 9",
  description: "Create promotion groups, invite affiliates, and partner with freelancers.",
};

export default function AffiliateTeamsPage() {
  return <AffiliateTeamsClient />;
}
