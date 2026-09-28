import "@/styles/pages/job-details.css";
import JobDetailsClient from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Job Details: Build Custom E-commerce Platform | MyMarketPlace",
  description: "View project requirements, client details, and submit a proposal.",
};

interface JobDetailsPageProps {
  params: {
    id: string;
  };
}

export default function JobDetailsPage({ params }: JobDetailsPageProps) {
  return <JobDetailsClient jobId={params.id} />;
}