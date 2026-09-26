'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission, AdminUser } from '@/lib/permissions';

interface SidebarProps {
  user: AdminUser | null;
}

interface NavItem {
  name: string;
  path: string;
  icon: string;
  permission?: string;
  badgeKey?: "messages" | "orders" | "withdrawals" | "clients";
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-chart-line' },
  {
  name: "Clients",
  path: "/admin/clients",
  icon: "fa-users",
  permission: "users:read",
  badgeKey: "clients",
},
  {
    name: 'Orders & Escrow',
    path: '/admin/orders',
    icon: 'fa-receipt',
    permission: 'orders:read',
    badgeKey: 'orders',
  },
  {
    name: 'Withdrawals',
    path: '/admin/withdrawals',
    icon: 'fa-wallet',
    permission: 'payouts:read',
    badgeKey: 'withdrawals',
  },
  {
    name: 'Messages',
    path: '/admin/messages',
    icon: 'fa-envelope',
    permission: 'messages:read',
    badgeKey: 'messages',
  },
  { name: 'Profile', path: '/admin/profile', icon: 'fa-user-cog' },
];

export default function AdminSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({
    messages: 0,
    orders: 0,
    withdrawals: 0,
    clients: 0,
  });

  useEffect(() => {
    if (!user) {
      setCounts({ messages: 0, orders: 0, withdrawals: 0, clients: 0 });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;

    async function loadCounts() {
      try {
        const res = await fetch('/api/admin/notifications/counts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));

        if (!cancelled && res.ok && data.success && data.counts) {
          setCounts({
            messages: Number(data.counts.messages) || 0,
            orders: Number(data.counts.orders) || 0,
            withdrawals: Number(data.counts.withdrawals) || 0,
            clients: Number(data.counts.clients) || 0,
          });
        }
      } catch (err) {
        console.error('Sidebar notification counts failed:', err);
      }
    }

    loadCounts();
    const id = window.setInterval(loadCounts, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <h2>Admin Portal</h2>
        {user?.role === 'super_admin' && (
          <span className="badge-super">Super Admin</span>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.permission && !hasPermission(user, item.permission)) {
            return null;
          }

          const isActive = pathname.startsWith(item.path);

         const badgeCount =
  item.badgeKey === "messages"
    ? counts.messages
    : item.badgeKey === "orders"
      ? counts.orders
      : item.badgeKey === "withdrawals"
        ? counts.withdrawals
        : item.badgeKey === "clients"
          ? counts.clients
          : 0;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fas ${item.icon}`} aria-hidden="true"></i>
              <span>{item.name}</span>
              {badgeCount > 0 && (
                <span className="nav-badge">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}