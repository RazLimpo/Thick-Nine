import "@/styles/pages/jobs.css";
import JobsClient from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Projects | MyMarketplace",
  description: "Browse thousands of available freelance projects and find your next opportunity.",
};

export default function JobsPage() {
  return <JobsClient />;
}