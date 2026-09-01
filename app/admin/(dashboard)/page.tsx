// app/admin/page.tsx
import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
  // Automatically redirect /admin to /admin/client (or your primary admin view)
  redirect('/admin/dashboard');
}