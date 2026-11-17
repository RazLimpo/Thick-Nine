// app/jobs/page.tsx — public open jobs board
import JobsBoardClient from "./client";
import { BRAND } from "@/lib/constants";
import "@/styles/pages/jobs.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Find Jobs | ${BRAND.pretty}`,
  description: `Browse open client projects and apply on ${BRAND.pretty}`,
};

export default function JobsPage() {
  return <JobsBoardClient />;
}
