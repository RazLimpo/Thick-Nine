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
  badgeKey?: 'messages'; // extend later: 'orders' | 'withdrawals'
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-chart-line' },
  { name: 'Clients', path: '/admin/clients', icon: 'fa-users', permission: 'users:read' },
  { name: 'Orders & Escrow', path: '/admin/orders', icon: 'fa-receipt', permission: 'orders:read' },
  { name: 'Withdrawals', path: '/admin/withdrawals', icon: 'fa-wallet', permission: 'payouts:read' },
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
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !hasPermission(user, 'messages:read')) {
      setMessageUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;

    async function loadUnread() {
      try {
        const res = await fetch('/api/admin/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.success) {
          setMessageUnreadCount(Number(data.count) || 0);
        }
      } catch (err) {
        console.error('Sidebar unread messages failed:', err);
      }
    }

    loadUnread();
    const id = window.setInterval(loadUnread, 60000);
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
            item.badgeKey === 'messages' ? messageUnreadCount : 0;

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