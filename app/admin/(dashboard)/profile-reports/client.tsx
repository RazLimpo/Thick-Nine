// app/admin/profile-reports/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned" | string;

interface ReportRow {
  _id: string;
  reason?: string;
  details?: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt?: string;
  reviewedAt?: string | null;
  reporterId?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    role?: string;
  };
  targetUserId?: {
    _id?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  };
  reviewedBy?: {
    fullName?: string;
    displayName?: string;
  };
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function nameOf(u?: {
  fullName?: string;
  displayName?: string;
  email?: string;
}) {
  return u?.displayName || u?.fullName || u?.email || "—";
}

function statusStyle(s: string) {
  switch (s) {
    case "pending":
      return { bg: "#fef3c7", color: "#92400e" };
    case "reviewed":
      return { bg: "#dbeafe", color: "#1e40af" };
    case "dismissed":
      return { bg: "#f1f5f9", color: "#475569" };
    case "actioned":
      return { bg: "#d1fae5", color: "#065f46" };
    default:
      return { bg: "#f1f5f9", color: "#475569" };
  }
}

function profileHref(u?: { _id?: string; role?: string }) {
  if (!u?._id) return "#";
  const role = String(u.role || "").toLowerCase();
  if (role === "freelancer") return `/freelancer-profile?id=${u._id}`;
  if (role === "affiliate") return `/affiliate-profile?id=${u._id}`;
  return `/client-profile/${u._id}`;
}

export default function AdminProfileReportsClient() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
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
          : `?status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(`/api/admin/profile-reports${qs}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to load reports.");
        setReports([]);
        return;
      }
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setPendingCount(Number(data.summary?.pendingCount) || 0);
    } catch {
      setError("Network error loading reports.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/profile-reports/${id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          adminNote: noteDraft[id] || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(data.message || "Update failed.");
        return;
      }
      setToast(`Marked as ${status}.`);
      await load();
    } catch {
      setToast("Network error.");
    } finally {
      setBusyId(null);
      window.setTimeout(() => setToast(null), 2800);
    }
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Profile reports</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            User reports from client / freelancer profiles. Pending:{" "}
            <strong>{pendingCount}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["pending", "reviewed", "actioned", "dismissed", "all"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border:
                  statusFilter === s
                    ? "1px solid #d96464"
                    : "1px solid #e2e8f0",
                background: statusFilter === s ? "#d96464" : "#fff",
                color: statusFilter === s ? "#fff" : "#334155",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "#1e293b",
            color: "#fff",
            borderRadius: 8,
            fontSize: "0.9rem",
          }}
        >
          {toast}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading reports…</p>
      ) : error ? (
        <p style={{ color: "#b91c1c" }}>{error}</p>
      ) : reports.length === 0 ? (
        <p style={{ color: "#64748b" }}>No reports in this filter.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {reports.map((r) => {
            const st = statusStyle(r.status);
            return (
              <article
                key={r._id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: st.bg,
                        color: st.color,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {r.status}
                    </span>
                    <span
                      style={{
                        marginLeft: 10,
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {r.reason || "other"}
                    </span>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: "0.8rem",
                        color: "#64748b",
                      }}
                    >
                      {formatDate(r.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.88rem", textAlign: "right" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Reporter: </span>
                      <Link href={profileHref(r.reporterId)}>
                        {nameOf(r.reporterId)}
                      </Link>
                      {r.reporterId?.role ? (
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          ({r.reporterId.role})
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Target: </span>
                      <Link href={profileHref(r.targetUserId)}>
                        {nameOf(r.targetUserId)}
                      </Link>
                      {r.targetUserId?.role ? (
                        <span style={{ color: "#94a3b8" }}>
                          {" "}
                          ({r.targetUserId.role})
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#334155",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {r.details || "No details provided."}
                </p>

                {r.adminNote ? (
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.85rem",
                      color: "#64748b",
                    }}
                  >
                    Admin note: {r.adminNote}
                    {r.reviewedBy
                      ? ` · by ${nameOf(r.reviewedBy)}`
                      : ""}
                    {r.reviewedAt ? ` · ${formatDate(r.reviewedAt)}` : ""}
                  </p>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Admin note (optional)"
                    value={noteDraft[r._id] || ""}
                    onChange={(e) =>
                      setNoteDraft((prev) => ({
                        ...prev,
                        [r._id]: e.target.value,
                      }))
                    }
                    style={{
                      flex: "1 1 200px",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => act(r._id, "reviewed")}
                    style={btnStyle("#3b82f6")}
                  >
                    Reviewed
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => act(r._id, "actioned")}
                    style={btnStyle("#059669")}
                  >
                    Actioned
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r._id}
                    onClick={() => act(r._id, "dismissed")}
                    style={btnStyle("#64748b")}
                  >
                    Dismiss
                  </button>
                  {r.targetUserId?._id ? (
                    <Link
                      href={`/admin/clients`}
                      style={{
                        ...btnStyle("#d96464"),
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      Clients admin
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.85rem",
  };
}
