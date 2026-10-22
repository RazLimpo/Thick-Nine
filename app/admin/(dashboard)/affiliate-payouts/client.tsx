// app/admin/affiliate-payouts/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PayoutStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled"
  | string;

interface PayoutRow {
  _id: string;
  amount: number;
  currency?: string;
  method?: string;
  status: PayoutStatus;
  note?: string;
  adminNote?: string;
  processedAt?: string | null;
  createdAt?: string;
  destination?: {
    email?: string;
    accountName?: string;
    bankName?: string;
  };
  user?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    username?: string;
    referralCode?: string;
    wallet?: {
      availableBalance?: number;
      pendingBalance?: number;
      lifetimeWithdrawals?: number;
    };
  };
}

function money(n?: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function statusColor(s: string) {
  switch (s) {
    case "pending":
      return { bg: "#fef3c7", color: "#92400e" };
    case "approved":
      return { bg: "#dbeafe", color: "#1e40af" };
    case "paid":
      return { bg: "#d1fae5", color: "#065f46" };
    case "rejected":
      return { bg: "#fee2e2", color: "#991b1b" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

export default function AdminAffiliatePayoutsClient() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
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
        statusFilter === "all" ? "?status=all" : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/affiliate-payouts${qs}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to load payouts.");
        setPayouts([]);
        return;
      }
      setPayouts(Array.isArray(data.payouts) ? data.payouts : []);
      setSummary({
        pendingCount: data.summary?.pendingCount ?? 0,
        pendingAmount: data.summary?.pendingAmount ?? 0,
      });
    } catch {
      setError("Network error loading payouts.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    id: string,
    action: "approve" | "paid" | "reject"
  ) => {
    if (busyId) return;
    const label =
      action === "paid"
        ? "Mark this payout as PAID? Confirm you already sent funds via Payoneer/bank."
        : action === "reject"
          ? "Reject this request? Balance will be restored to the affiliate."
          : "Approve this request?";
    if (!window.confirm(label)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/affiliate-payouts/${id}`, {
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
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            Affiliate payout queue
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            System B — process <code>AffiliatePayoutRequest</code> (wallet hold)
          </p>
        </div>
        <Link
          href="/admin"
          style={{ alignSelf: "center", color: "#64748b", fontSize: "0.9rem" }}
        >
          ← Admin home
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
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
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Pending amount
          </div>
          <strong style={{ fontSize: "1.25rem" }}>
            {money(summary.pendingAmount)}
          </strong>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
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

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
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
        <p style={{ color: "#64748b" }}>No payout requests in this filter.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {payouts.map((p) => {
            const sc = statusColor(p.status);
            const name =
              p.user?.displayName ||
              p.user?.fullName ||
              p.user?.username ||
              "Affiliate";
            const canAct =
              p.status === "pending" || p.status === "approved";

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
                    <strong style={{ fontSize: "1.1rem" }}>
                      {money(p.amount)}
                    </strong>
                    <span
                      style={{
                        marginLeft: 10,
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: sc.bg,
                        color: sc.color,
                      }}
                    >
                      {p.status}
                    </span>
                    <div style={{ marginTop: 6, fontSize: "0.9rem" }}>
                      {name} · {p.user?.email || "—"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.8rem",
                        color: "#64748b",
                      }}
                    >
                      {p.method || "Payoneer"}
                      {p.destination?.email
                        ? ` · ${p.destination.email}`
                        : ""}
                      {p.destination?.accountName
                        ? ` · ${p.destination.accountName}`
                        : ""}
                      {p.destination?.bankName
                        ? ` · ${p.destination.bankName}`
                        : ""}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                      }}
                    >
                      Requested {formatDate(p.createdAt)}
                      {p.processedAt
                        ? ` · Processed ${formatDate(p.processedAt)}`
                        : ""}
                    </div>
                    {p.note ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: "0.85rem",
                          color: "#475569",
                        }}
                      >
                        Note: {p.note}
                      </div>
                    ) : null}
                    {p.adminNote ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: "0.85rem",
                          color: "#475569",
                        }}
                      >
                        Admin: {p.adminNote}
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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.status === "pending" && (
                          <button
                            type="button"
                            disabled={busyId === p._id}
                            onClick={() => act(p._id, "approve")}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid #93c5fd",
                              background: "#eff6ff",
                              color: "#1e40af",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                            }}
                          >
                            Approve
                          </button>
                        )}
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
