// app/client-settings/page.tsx
import { Metadata } from "next";
import ClientSettingsClient from "./client";

export const metadata: Metadata = {
  title: "Client Settings | Thick 9",
  description:
    "Manage your client profile, security, billing preferences, and notifications.",
};

export default function ClientSettingsPage() {
  return <ClientSettingsClient />;
}
