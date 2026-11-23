// app/client-profile/[id]/page.tsx
import type { Metadata } from "next";
import ClientProfileClient from "./client";
import "@/styles/pages/client-profile.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Profile | Thick 9",
  description: "Public client profile, project preferences, and trust signals.",
};

export default function ClientProfilePage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  return <ClientProfileClient params={params} />;
}
