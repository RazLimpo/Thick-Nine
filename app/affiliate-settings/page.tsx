// app/affiliate-settings/page.tsx
import { Metadata } from "next";
import AffiliateSettingsClient from "./client";

export const metadata: Metadata = {
  title: "Ambassador Settings | Thick 9",
  description:
    "Manage affiliate profile, payouts, tracking, security, and marketing assets.",
};

export default function AffiliateSettingsPage() {
  return <AffiliateSettingsClient />;
}
