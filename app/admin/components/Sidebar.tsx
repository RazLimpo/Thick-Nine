'use client';

import React from 'react';
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
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: 'fa-chart-line' },
  { name: 'Clients', path: '/admin/clients', icon: 'fa-users', permission: 'users:read' },
  { name: 'Withdrawals', path: '/admin/withdrawals', icon: 'fa-wallet', permission: 'payouts:read' },
  { name: 'Messages', path: '/admin/messages', icon: 'fa-envelope', permission: 'messages:read' },
  { name: 'Team Roles', path: '/admin/sub-admins', icon: 'fa-user-shield', permission: 'roles:manage' },
  { name: 'Profile', path: '/admin/profile', icon: 'fa-user-cog' },
];

export default function AdminSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <h2>Admin Portal</h2>
        {user?.role === 'super_admin' && <span className="badge-super">Super Admin</span>}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.permission && !hasPermission(user, item.permission)) {
            return null;
          }

          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <i className={`fas ${item.icon}`} aria-hidden="true"></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}