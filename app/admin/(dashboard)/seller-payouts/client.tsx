// app/admin/seller-payouts/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface SellerPayoutRow {
  _id: string;
  amount: number;
  fee?: number;
  net?: number;
  method?: string;
  status: string;
  payoneerEmail?: string;
  note?: string;
  createdAt?: string;
  user?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    username?: string;
    sellerAvailableBalance?: number;
    payoutDetails?: {
      accountEmail?: string;
      payoneerEmail?: string;
      accountName?: string;
      bankName?: string;
    };
  };
}

function money(n?: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminSellerPayoutsClient() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [payouts, setPayouts] = useState<SellerPayoutRow[]>([]);
  const [summary, setSummary] = useState({ pendingCount: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        statusFilter === "all"
          ? "?status=all"
          : statusFilter === "pending"
            ? "?status=pending"
            : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/seller-payouts${qs}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to load seller payouts.");
        setPayouts([]);
        return;
      }
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
      setSummary({
        pendingCount: data.summary?.pendingCount ?? 0,
        pendingAmount: data.summary?.pendingAmount ?? 0,
      });
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "paid" | "reject") => {
    if (busyId) return;
    const msg =
      action === "paid"
        ? "Mark paid only after you sent funds via Payoneer/bank."
        : "Reject and restore this amount to the seller’s available balance?";
    if (!window.confirm(msg)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/seller-payouts/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action,
          adminNote: noteDraft[id] || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.message || "Action failed.");
        return;
      }
      setToast(data.message || "Updated.");
      await load();
    } catch {
      setToast("Network error.");
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Seller payout queue</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Freelancer withdrawals (<code>seller_escrow</code> transactions)
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              setStatusFilter((s) => (s === "pending" ? "all" : "pending"))
            }
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background:
                statusFilter === "pending" ? "#0f172a" : "#059669",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            {statusFilter === "pending" ? (
              <>
                <i className="fas fa-history" style={{ marginRight: 6 }} />
                View history
              </>
            ) : (
              <>
                <i className="fas fa-inbox" style={{ marginRight: 6 }} />
                Back to queue
              </>
            )}
          </button>
          <Link
            href="/admin/affiliate-payouts"
            style={{ color: "#64748b", fontSize: "0.9rem" }}
          >
            Affiliate payouts
          </Link>
          <Link href="/admin" style={{ color: "#64748b", fontSize: "0.9rem" }}>
            ← Admin
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#92400e" }}>Pending</div>
          <strong style={{ fontSize: "1.25rem" }}>{summary.pendingCount}</strong>
        </div>
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Pending amount</div>
          <strong style={{ fontSize: "1.25rem" }}>{money(summary.pendingAmount)}</strong>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="pending">Pending queue</option>
            <option value="completed">Completed (history)</option>
            <option value="rejected">Rejected</option>
            <option value="all">All history</option>
          </select>
          <button
            type="button"
            onClick={() => load()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {statusFilter !== "pending" && (
        <p style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#64748b" }}>
          Showing payout history
          {statusFilter === "completed"
            ? " (completed only)"
            : statusFilter === "rejected"
              ? " (rejected only)"
              : " (all statuses)"}
          . Mark paid / reject only appears on pending items.
        </p>
      )}

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#065f46",
          }}
        >
          {toast}
        </div>
      )}
      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : payouts.length === 0 ? (
        <p style={{ color: "#64748b" }}>No seller payouts in this filter.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {payouts.map((p) => {
            const name =
              p.user?.displayName ||
              p.user?.fullName ||
              p.user?.username ||
              "Seller";
            const dest =
              p.payoneerEmail ||
              p.user?.payoutDetails?.accountEmail ||
              p.user?.payoutDetails?.payoneerEmail ||
              p.user?.email ||
              "—";
            const canAct =
              p.status === "pending_payoneer" || p.status === "pending";

            return (
              <div
                key={p._id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "1.1rem" }}>{money(p.amount)}</strong>
                    <span style={{ marginLeft: 10, fontSize: "0.8rem", color: "#64748b" }}>
                      {p.status}
                    </span>
                    <div style={{ marginTop: 6, fontSize: "0.9rem" }}>
                      {name} · {p.user?.email || "—"}
                    </div>
                    <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#64748b" }}>
                      {p.method || "payoneer"} · {dest}
                      {p.fee ? ` · fee ${money(p.fee)}` : ""}
                      {p.net != null ? ` · net ${money(p.net)}` : ""}
                    </div>
                    <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#94a3b8" }}>
                      {formatDate(p.createdAt)}
                    </div>
                    {p.note ? (
                      <div style={{ marginTop: 6, fontSize: "0.85rem", color: "#475569" }}>
                        {p.note}
                      </div>
                    ) : null}
                  </div>
                  {canAct && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        minWidth: 220,
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Admin note (optional)"
                        value={noteDraft[p._id] || ""}
                        onChange={(e) =>
                          setNoteDraft((prev) => ({
                            ...prev,
                            [p._id]: e.target.value,
                          }))
                        }
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          disabled={busyId === p._id}
                          onClick={() => act(p._id, "paid")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#059669",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Mark paid
                        </button>
                        <button
                          type="button"
                          disabled={busyId === p._id}
                          onClick={() => act(p._id, "reject")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            color: "#991b1b",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
