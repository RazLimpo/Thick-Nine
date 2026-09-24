'use client';

import React, { useEffect, useState } from 'react';
import '@/styles/pages/admin-portal.css';
import AdminSidebar from './components/Sidebar';
import { AdminUser } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.admin) {
          setCurrentUser({
            id: String(data.admin.id),
            name: data.admin.name,
            email: data.admin.email,
            role: data.admin.role,
            permissions: data.admin.permissions || [],
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="admin-container">
      <AdminSidebar user={currentUser} />
      <main className="admin-main">
        {/* header + body unchanged */}
        <section className="admin-body">{children}</section>
      </main>
    </div>
  );
}