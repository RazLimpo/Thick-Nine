'use client';

import React, { useEffect, useState } from 'react';

interface OrderItem {
  _id: string;
  clientId?: { name?: string; email?: string };
  sellerId?: { name?: string; email?: string };
  subtotal: number;
  buyerServiceFee: number;
  sellerPlatformFee: number;
  grandTotal: number;
  sellerEarnings: number;
  netAdminProfit: number;
  status: string;
  createdAt: string;
}

interface SummaryData {
  totalOrders: number;
  totalVolume: number;
  grossAdminProfit: number;
  inEscrow: number;
}

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalOrders: 0,
    totalVolume: 0,
    grossAdminProfit: 0,
    inEscrow: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminOrders() {
      try {
        const res = await fetch('/api/admin/orders');
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
          setSummary(data.summary || { totalOrders: 0, totalVolume: 0, grossAdminProfit: 0, inEscrow: 0 });
        }
      } catch (err) {
        console.error('Error loading admin orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminOrders();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Orders & Escrow Oversight</h1>
        <p>Monitor platform order volume, escrow holds, and net commission revenue.</p>
      </div>

      {/* Financial Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Orders</span>
          <p className="metric-value">{summary.totalOrders}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Total Volume</span>
          <p className="metric-value">${summary.totalVolume.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Admin Profit (Fees)</span>
          <p className="metric-value text-green">${summary.grossAdminProfit.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Funds Held in Escrow</span>
          <p className="metric-value text-amber">${summary.inEscrow.toFixed(2)}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Client</th>
              <th>Seller</th>
              <th>Grand Total</th>
              <th>Seller Split (85%)</th>
              <th>Admin Revenue</th>
              <th>Escrow Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center">Loading transactions...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">No orders recorded yet.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td className="font-semibold">#{order._id.substring(0, 8)}...</td>
                  <td>{order.clientId?.name || 'Client'}</td>
                  <td>{order.sellerId?.name || 'Seller'}</td>
                  <td className="font-semibold">${order.grandTotal?.toFixed(2)}</td>
                  <td className="text-green">${order.sellerEarnings?.toFixed(2)}</td>
                  <td className="text-blue font-semibold">
                    ${((order.buyerServiceFee || 0) + (order.sellerPlatformFee || 0)).toFixed(2)}
                  </td>
                  <td>
                    <span className={`escrow-badge ${order.status === 'completed' ? 'released' : 'held'}`}>
                      {order.status === 'completed' ? 'Released' : 'Held in Escrow'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}