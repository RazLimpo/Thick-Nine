// app/service-management/page.tsx

import { Metadata } from "next";
import ServiceManagementClient from "./client";

export const metadata: Metadata = {
  title: "Service Management | Thick Nine",
  description: "Track, edit, and optimize your freelance service offerings.",
};

export default function ServiceManagementPage() {
  return <ServiceManagementClient />;
}