// app/admin/profile-reports/page.tsx
import AdminProfileReportsClient from "./client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile reports | Admin",
  description: "Review user-submitted profile reports",
};

export default function AdminProfileReportsPage() {
  return <AdminProfileReportsClient />;
}
