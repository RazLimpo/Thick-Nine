// app/admin/orders/client.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface OrderItem {
  _id: string;
  clientId?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    name?: string;
    email?: string;
  };
  sellerId?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    name?: string;
    email?: string;
  };
  serviceId?: { title?: string } | string;
  subtotal?: number;
  buyerServiceFee?: number;
  sellerPlatformFee?: number;
  grandTotal?: number;
  sellerEarnings?: number;
  netAdminProfit?: number;
  status: string;
  createdAt?: string;
  disputeReason?: string;
  disputedAt?: string | null;
  disputeResolution?: string;
  deliveryNote?: string;
}

interface SummaryData {
  totalOrders: number;
  totalVolume: number;
  grossAdminProfit: number;
  inEscrow: number;
  disputedCount?: number;
}

function money(n?: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function personName(u?: OrderItem['clientId']) {
  if (!u) return '—';
  return u.displayName || u.fullName || u.name || u.email || 'User';
}

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalOrders: 0,
    totalVolume: 0,
    grossAdminProfit: 0,
    inEscrow: 0,
    disputedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('pay_seller');
  const [resolveNote, setResolveNote] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('token');
      if (t) h.Authorization = `Bearer ${t}`;
    }
    return h;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const qs =
        statusFilter && statusFilter !== 'all'
          ? `?status=${encodeURIComponent(statusFilter)}`
          : '';
      const res = await fetch(`/api/admin/orders${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setOrders(data.orders || []);
        setSummary(
          data.summary || {
            totalOrders: 0,
            totalVolume: 0,
            grossAdminProfit: 0,
            inEscrow: 0,
          }
        );
      } else {
        setMsg(data.message || 'Failed to load orders');
      }
    } catch {
      setMsg('Network error loading orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // honor ?status=disputed from notification links
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('status');
      if (s) setStatusFilter(s);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolveDispute = async () => {
    if (!resolveId) return;
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        resolution,
        note: resolveNote.trim(),
      };
      if (resolution === 'partial') {
        body.partialAmount = Number(partialAmount) || 0;
      }
      const res = await fetch(`/api/admin/orders/${resolveId}/resolve-dispute`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setMsg(data.message || 'Resolve failed');
        return;
      }
      setMsg(data.message || 'Dispute resolved');
      setResolveId(null);
      setResolveNote('');
      setPartialAmount('');
      await load();
    } catch {
      setMsg('Network error');
    } finally {
      setBusy(false);
    }
  };

  const resolving = orders.find((o) => o._id === resolveId);

  return (
    <>
      <div className="page-header">
        <h1>Orders & Escrow Oversight</h1>
        <p>
          Monitor order volume, escrow holds, disputes, and commission revenue.
        </p>
      </div>

      {msg && (
        <p style={{ marginBottom: 12, color: '#b45309', fontWeight: 600 }}>
          {msg}
        </p>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Listed Orders</span>
          <p className="metric-value">{summary.totalOrders}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Total Volume</span>
          <p className="metric-value">{money(summary.totalVolume)}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Admin Profit (Fees)</span>
          <p className="metric-value text-green">
            {money(summary.grossAdminProfit)}
          </p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Funds Held in Escrow</span>
          <p className="metric-value text-amber">{money(summary.inEscrow)}</p>
        </div>
        <div className="metric-card">
          <span className="metric-title">Open Disputes</span>
          <p className="metric-value" style={{ color: '#c0392b' }}>
            {summary.disputedCount ?? 0}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ fontSize: '0.9rem' }}>
          Status{' '}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ marginLeft: 8, padding: '8px 12px', borderRadius: 6 }}
          >
            <option value="all">All</option>
            <option value="disputed">Disputed</option>
            <option value="pending">Pending</option>
            <option value="in_escrow">In escrow</option>
            <option value="revision_requested">Revision</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Client</th>
              <th>Seller</th>
              <th>Grand Total</th>
              <th>Seller Earnings</th>
              <th>Admin Revenue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center">
                  Loading transactions...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">
                  No orders recorded yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order._id}
                  style={
                    order.status === 'disputed'
                      ? { background: '#fef2f2' }
                      : undefined
                  }
                >
                  <td className="font-semibold">
                    <Link href={`/orders/${order._id}`}>
                      #{order._id.substring(0, 8)}…
                    </Link>
                  </td>
                  <td>{personName(order.clientId)}</td>
                  <td>{personName(order.sellerId)}</td>
                  <td className="font-semibold">{money(order.grandTotal)}</td>
                  <td className="text-green">{money(order.sellerEarnings)}</td>
                  <td className="text-blue font-semibold">
                    {money(
                      (order.buyerServiceFee || 0) +
                        (order.sellerPlatformFee || 0)
                    )}
                  </td>
                  <td>
                    <span
                      className={`escrow-badge ${
                        order.status === 'completed'
                          ? 'released'
                          : order.status === 'disputed'
                            ? 'held'
                            : 'held'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    {order.status === 'disputed' && order.disputeReason ? (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#7f1d1d',
                          marginTop: 4,
                          maxWidth: 220,
                        }}
                      >
                        {order.disputeReason.slice(0, 120)}
                        {order.disputeReason.length > 120 ? '…' : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {order.status === 'disputed' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResolveId(order._id);
                          setResolution('pay_seller');
                          setResolveNote('');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#c0392b',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Resolve
                      </button>
                    ) : (
                      <Link
                        href={`/orders/${order._id}`}
                        style={{ fontSize: '0.85rem' }}
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {resolveId && resolving && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResolveId(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: '100%',
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Resolve dispute #{resolving._id.slice(-6)}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#555' }}>
              {resolving.disputeReason || 'No reason provided.'}
            </p>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>
              Resolution
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: 10 }}
              >
                <option value="pay_seller">Pay seller (complete order)</option>
                <option value="refund_buyer">Refund buyer (cancel)</option>
                <option value="partial">Partial (complete + note amount)</option>
                <option value="withdrawn">Withdrawn / dismissed (cancel)</option>
              </select>
            </label>
            {resolution === 'partial' && (
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>
                Partial amount (USD)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10 }}
                />
              </label>
            )}
            <label style={{ display: 'block', marginBottom: 12, fontSize: '0.9rem' }}>
              Admin note
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={3}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: 10 }}
                placeholder="Internal note / message to parties…"
              />
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setResolveId(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={resolveDispute}
                style={{
                  background: '#166534',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {busy ? 'Saving…' : 'Confirm resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
