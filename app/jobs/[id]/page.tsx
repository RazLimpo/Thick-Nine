// app/jobs/[id]/page.tsx
import JobDetailsClient from "./client";
import { BRAND } from "@/lib/constants";
import "@/styles/pages/job-details.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> | { id: string } };

export async function generateMetadata({ params }: Props) {
  await Promise.resolve(params);
  return {
    title: `Job details | ${BRAND.pretty}`,
    description: `View job details and submit a proposal on ${BRAND.pretty}`,
  };
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await Promise.resolve(params);
  return <JobDetailsClient jobId={id} />;
}
