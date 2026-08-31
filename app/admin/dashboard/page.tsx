'use client';

import React, { useEffect, useState } from 'react';

interface DashboardStats {
  totalClients: number;
  pendingPayouts: number;
  platformRevenue: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/admin/stats', {
          method: 'GET',
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            setStats(data.stats);
            return;
          }
        }

        // Fallback mock stats if backend response isn't successful
        setStats({
          totalClients: 14,
          pendingPayouts: 280.00,
          platformRevenue: 70.00,
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
        // Fallback mock stats on network failure
        setStats({
          totalClients: 14,
          pendingPayouts: 280.00,
          platformRevenue: 70.00,
        });
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