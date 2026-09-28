import "@/styles/pages/post-job.css";
import PostJobClient from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a New Job | MyMarketplace",
  description: "Tell us exactly what you need. Clear details attract the best freelancers.",
};

export default function PostJobPage() {
  return <PostJobClient />;
}