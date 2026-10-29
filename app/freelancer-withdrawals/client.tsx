// app/freelancer-withdrawals/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-withdrawals.css";

type MethodId = "payoneer" | "bank";

interface PayoutDetails {
  method?: string;
  email?: string;
  accountName?: string;
  bankName?: string;
  accountNumberMasked?: string;
}

interface HistoryRow {
  id?: string;
  date?: string;
  tid: string;
  method: string;
  amount: number;
  fee: number;
  net: number;
  status: string;
}

const MIN = 50;

function money(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function calcFee(amount: number, method: MethodId) {
  if (method === "bank") return 5;
  if (method === "payoneer") return Math.min(amount * 0.02, 50);
  return 0;
}

function statusClass(s: string) {
  const x = (s || "").toLowerCase().replace(/\s+/g, "_");
  if (x === "completed" || x === "paid") return "status-completed";
  if (x.includes("pending")) return "status-pending";
  if (x === "failed" || x === "rejected") return "status-failed";
  return "status-pending";
}

export default function FreelancerWithdrawalsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<"form" | "history">("form");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [withdrawnYtd, setWithdrawnYtd] = useState(0);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const [method, setMethod] = useState<MethodId>("payoneer");
  const [amountStr, setAmountStr] = useState("50");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 5;

  const getAuthHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("token");
      if (t) h.Authorization = `Bearer ${t}`;
    }
    return h;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/?auth=login");
        return;
      }
      const res = await fetch("/api/freelancer/withdrawals", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to load withdrawal data.");
        return;
      }
      setAvailable(Number(data.balances?.available) || 0);
      setPending(Number(data.balances?.pendingClearance) || 0);
      setWithdrawnYtd(Number(data.balances?.totalWithdrawnYTD) || 0);
      setPayoutDetails(data.payoutDetails || {});
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      setError("Network error loading withdrawals.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const amount = parseFloat(amountStr) || 0;
  const fee = calcFee(amount, method);
  const net = Math.max(0, amount - fee);

  const canSubmit =
    amount >= MIN && amount <= available && amount > 0 && !busy;

  const recipientLabel = useMemo(() => {
    if (method === "payoneer") {
      return `Payoneer (${payoutDetails.email || "set email in settings"})`;
    }
    const bits = [
      payoutDetails.accountName,
      payoutDetails.bankName,
      payoutDetails.accountNumberMasked,
    ].filter(Boolean);
    return bits.length
      ? `Bank (${bits.join(" · ")})`
      : "Bank (complete details in Freelancer Settings)";
  }, [method, payoutDetails]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return history.filter((tx) => {
      const matchQ =
        !q ||
        tx.tid.toLowerCase().includes(q) ||
        tx.method.toLowerCase().includes(q) ||
        String(tx.amount).includes(q);
      const st = (tx.status || "").toLowerCase();
      const matchS =
        statusFilter === "all" ||
        (statusFilter === "completed" &&
          (st === "completed" || st === "paid")) ||
        (statusFilter === "pending" && st.includes("pending")) ||
        (statusFilter === "failed" &&
          (st === "failed" || st === "rejected"));
      return matchQ && matchS;
    });
  }, [history, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const submit = async () => {
    if (!canSubmit) return;
    if (
      !window.confirm(
        `Withdraw ${money(amount)} via ${method}? Net ~${money(net)} after fees.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/freelancer/withdrawals", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount, method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Withdrawal failed.");
        return;
      }
      setSuccess(data.message || "Withdrawal requested.");
      if (data.balances?.available != null) {
        setAvailable(Number(data.balances.available));
      }
      if (data.withdrawal) {
        setHistory((prev) => [
          {
            tid: data.withdrawal.tid,
            date: data.withdrawal.date,
            method: data.withdrawal.method,
            amount: data.withdrawal.amount,
            fee: data.withdrawal.fee,
            net: data.withdrawal.net,
            status: data.withdrawal.status,
            id: data.withdrawal.id,
          },
          ...prev,
        ]);
      }
      setAmountStr(String(MIN));
      await load();
    } catch {
      setError("Network error submitting withdrawal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="freelancer-withdrawals-page">
      <div className="page-container">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <h1 className="page-title">Payouts &amp; Withdrawal History</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Manage your seller earnings and review past payouts. Platform
              payouts use <strong>Payoneer</strong> or bank transfer (not card
              checkout).
            </p>
          </div>
          <button
            type="button"
            className="btn-action"
            onClick={() =>
              setTab((t) => (t === "history" ? "form" : "history"))
            }
            style={{
              background: tab === "history" ? "#334155" : "var(--primary-color, #d96464)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab === "history" ? (
              <>
                <i className="fas fa-money-check-alt" /> New withdrawal
              </>
            ) : (
              <>
                <i className="fas fa-history" /> View history
              </>
            )}
          </button>
        </div>

        <hr />

        <div className="internal-tabs">
          <button
            type="button"
            className={`internal-tab-button ${tab === "form" ? "active" : ""}`}
            onClick={() => setTab("form")}
          >
            <i className="fas fa-money-check-alt" /> Funds Withdrawal
          </button>
          <button
            type="button"
            className={`internal-tab-button ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            <i className="fas fa-history" /> Withdrawal History
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        {loading ? (
          <p style={{ color: "#718096" }}>Loading balances…</p>
        ) : tab === "form" ? (
          <div className="tab-content">
            <div className="withdrawal-summary-grid">
              <div className="f-card balance-card">
                <h3>
                  <i className="fas fa-wallet" /> Available Balance
                </h3>
                <p className="large-value">{money(available)}</p>
                <span className="sub-text">Ready for withdrawal</span>
              </div>
              <div className="f-card pending-card">
                <h3>
                  <i className="fas fa-clock" /> Pending Clearance
                </h3>
                <p className="large-value">{money(pending)}</p>
                <span className="sub-text">Still in escrow / not released</span>
              </div>
              <div className="f-card withdrawn-card">
                <h3>
                  <i className="fas fa-history" /> Total Withdrawn YTD
                </h3>
                <p className="large-value">{money(withdrawnYtd)}</p>
                <span className="sub-text">Seller payouts this year</span>
              </div>
            </div>

            <hr />

            <h2 className="section-title">
              <i className="fas fa-exchange-alt" /> Initiate Payout
            </h2>

            <div className="withdrawal-step">
              <h4>Step 1: Select Method</h4>
              <p className="step-description">
                Choose where you want funds sent. Destination details come from{" "}
                <Link href="/freelancer-settings#payout-panel">Freelancer Settings → Payout</Link>.
              </p>
              <div className="method-selection-cards">
                <div
                  className={`method-card ${method === "payoneer" ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMethod("payoneer")}
                  onKeyDown={(e) => e.key === "Enter" && setMethod("payoneer")}
                >
                  <i className="fas fa-credit-card method-icon" />
                  <h5>Payoneer</h5>
                  <p className="fee-info">Fee: 2% (max $50) · 2–5 days</p>
                </div>
                <div
                  className={`method-card ${method === "bank" ? "active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setMethod("bank")}
                  onKeyDown={(e) => e.key === "Enter" && setMethod("bank")}
                >
                  <i className="fas fa-university method-icon" />
                  <h5>Bank Transfer</h5>
                  <p className="fee-info">Fee: $5.00 · 1–3 days</p>
                </div>
                <button
                  type="button"
                  className="add-method-btn"
                  onClick={() => router.push("/freelancer-settings#payout-panel")}
                >
                  <i className="fas fa-plus" /> Edit payout details
                </button>
              </div>
            </div>

            <hr />

            <div className="withdrawal-step">
              <h4>Step 2: Enter Amount</h4>
              <p className="step-description">Minimum withdrawal is $50.00.</p>
              <div className="input-group">
                <label htmlFor="withdrawal-amount">Amount to Withdraw (USD)</label>
                <div className="amount-input-wrapper">
                  <span>$</span>
                  <input
                    id="withdrawal-amount"
                    type="number"
                    min={MIN}
                    max={available}
                    step="0.01"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                  />
                </div>
                <p className="input-note">
                  Max available: <span>{money(available)}</span>
                </p>
              </div>
            </div>

            <hr />

            <div className="withdrawal-step">
              <h4>Step 3: Review &amp; Confirm</h4>
              <div className="review-summary-box">
                <dl className="dl-stripped-table">
                  <dt>
                    <i className="fas fa-money-bill-wave" /> Withdrawal Amount
                  </dt>
                  <dd>{money(amount)}</dd>
                  <dt>
                    <i className="fas fa-piggy-bank" /> Processing Fee
                  </dt>
                  <dd style={{ color: "#e74c3c" }}>-{money(fee)}</dd>
                  <dt className="total-row">
                    <i className="fas fa-hand-holding-usd" /> Net Received
                  </dt>
                  <dd className="total-row">{money(net)}</dd>
                </dl>
                <p className="alert-box alert-info">
                  <i className="fas fa-info-circle" /> Funds will be sent to{" "}
                  <strong>{recipientLabel}</strong>. Admin processes Payoneer/bank
                  outside the app, then marks the request paid.
                </p>
              </div>
              <button
                type="button"
                className="btn-action btn-confirm-withdrawal"
                disabled={!canSubmit}
                onClick={submit}
              >
                <i className="fas fa-check-circle" />
                {busy ? "Submitting…" : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        ) : (
          <div className="tab-content">
            <h2 className="section-title">
              <i className="fas fa-list-alt" /> Past Transactions
            </h2>
            <div className="table-controls">
              <input
                type="text"
                placeholder="Search by ID or amount…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="f-table-wrapper">
              <table className="f-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Transaction ID</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Fee</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        No withdrawal transactions found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((tx) => (
                      <tr key={tx.id || tx.tid}>
                        <td>{formatDate(tx.date)}</td>
                        <td>{tx.tid}</td>
                        <td>{tx.method}</td>
                        <td style={{ fontWeight: 700 }}>{money(tx.amount)}</td>
                        <td style={{ color: "#e74c3c" }}>-{money(tx.fee)}</td>
                        <td style={{ fontWeight: 700, color: "#27ae60" }}>
                          {money(tx.net)}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${statusClass(tx.status)}`}
                          >
                            {String(tx.status).replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-action"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="fas fa-chevron-left" /> Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-action"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
