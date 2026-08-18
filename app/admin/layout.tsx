// app/admin/layout.tsx
'use client';

import React from 'react';
import '@/styles/pages/admin-portal.css';
import AdminSidebar from './components/Sidebar'; // <-- IMPORT ADDED HERE

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  
  // TEMPORARY MOCK USER
  // Replace this later with your actual global auth state (e.g., from context, Redux, or a fetch hook)
  const currentUser = {
    id: '1',
    name: 'Super Admin',
    email: 'admin@thicknine.com',
    role: 'super_admin' as const, 
    permissions: [],
  };

  return (
    <div className="admin-container">
      
      {/* SIDEBAR COMPONENT INJECTED HERE */}
      <AdminSidebar user={currentUser} />

      {/* MAIN CONTENT WORKSPACE */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-search">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Global admin search..." className="search-input" />
          </div>
          <div className="admin-badge">Admin System</div>
        </header>

        <section className="admin-body">
          {children}
        </section>
      </main>
    </div>
  );
}