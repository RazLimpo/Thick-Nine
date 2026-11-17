// app/jobs/create/page.tsx
import PostJobClient from "./client";
import { BRAND } from "@/lib/constants";
import "@/styles/pages/post-job.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Post a Job | ${BRAND.pretty}`,
  description: `Describe your project and hire freelancers on ${BRAND.pretty}`,
};

export default function PostJobPage() {
  return <PostJobClient />;
}
