'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  totalClients: number;
  pendingPayouts: number;
  platformRevenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token missing.');
          setLoading(false);
          return;
        }

        // Fetches directly through your Next.js API proxy route: app/api/admin/stats/route.ts
        const res = await fetch('/api/admin/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setStats(data.stats);
        } else {
          setError(data.message || 'Failed to load live metrics.');
        }
      } catch (err: any) {
        console.error('Error loading dashboard stats:', err);
        setError('Network error loading dashboard metrics.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Overview Dashboard</h1>
          <p>Loading real-time platform metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="page-header">
          <h1>Overview Dashboard</h1>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Overview Dashboard</h1>
        <p>Real-time platform metrics and activity status.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Clients</span>
          <p className="metric-value">
            {stats?.totalClients ? stats.totalClients.toLocaleString() : '0'}
          </p>
        </div>

        <div className="metric-card">
          <span className="metric-title">Pending Payouts</span>
          <p className="metric-value">
            ${stats?.pendingPayouts ? stats.pendingPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>

        <div className="metric-card">
          <span className="metric-title">Platform Revenue</span>
          <p className="metric-value">
            ${stats?.platformRevenue ? stats.platformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
}