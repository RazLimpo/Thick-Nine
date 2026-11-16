// app/post-job/page.tsx
import PostJobClient from "./client";
import "@/styles/pages/post-job.css";

export const dynamic = "force-dynamic";

export default function PostJobPage() {
  return <PostJobClient />;
}
