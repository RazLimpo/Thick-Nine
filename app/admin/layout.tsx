'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/styles/pages/admin-portal.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-chart-line' },
    { name: 'Clients', path: '/admin/clients', icon: 'fa-users' },
    { name: 'Withdrawals', path: '/admin/withdrawals', icon: 'fa-wallet' },
    { name: 'Profile', path: '/admin/profile', icon: 'fa-user-cog' },
  ];

  return (
    <div className="admin-container">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <h2>Admin Portal</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

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