// app/freelancer-analytics/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-analytics.css";

type Period = "30" | "7" | "lifetime";

interface AnalyticsPayload {
  period?: string;
  overview?: {
    totalEarnings?: number;
    ordersCompleted?: number;
    averageRating?: number;
    responseRate?: number | null;
    cancellationRate?: number;
    activeGigs?: number;
    orderVolume?: number;
    completionRate?: number;
    avgDeliveryDays?: number | null;
    lateDeliveryRate?: number;
    availableBalance?: number;
  };
  earningsSeries?: { date: string; amount: number }[];
  earningsByGig?: {
    title?: string;
    earnings?: number;
    orders?: number;
    conversionRate?: number;
    performance?: string;
    views?: number;
    clicks?: number;
  }[];
  topClients?: { name?: string; revenue?: number; orders?: number }[];
  orderStatus?: {
    pending?: number;
    active?: number;
    completed?: number;
    cancelled?: number;
    disputed?: number;
  };
  clients?: {
    repeatClients?: number;
    repeatRate?: number;
    uniqueClients?: number;
  };
  ratings?: {
    overall?: number;
    distribution?: { five?: number; four?: number; threeOrLess?: number };
    sampleReview?: string | null;
  };
  gigs?: {
    views?: number;
    clicks?: number;
    ctr?: number;
    conversionRate?: number;
    breakdown?: AnalyticsPayload["earningsByGig"];
  };
  goals?: { target?: number; current?: number; percent?: number };
  recommendations?: string[];
  level?: string | null;
}

function money(n?: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function downloadCsv(data: AnalyticsPayload) {
  const rows: string[][] = [
    ["Metric", "Value"],
    ["Period", data.period || ""],
    ["Total earnings", String(data.overview?.totalEarnings ?? "")],
    ["Orders completed", String(data.overview?.ordersCompleted ?? "")],
    ["Average rating", String(data.overview?.averageRating ?? "")],
    ["Active gigs", String(data.overview?.activeGigs ?? "")],
    ["Completion rate %", String(data.overview?.completionRate ?? "")],
  ];
  (data.earningsByGig || []).forEach((g) => {
    rows.push([
      `Gig: ${g.title || ""}`,
      `${g.earnings}|orders=${g.orders}|conv=${g.conversionRate}`,
    ]);
  });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `freelancer-analytics-${data.period || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FreelancerAnalyticsClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        router.push("/?auth=login");
        return;
      }
      const res = await fetch(`/api/freelancer/analytics?period=${period}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || "Failed to load analytics.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading analytics.");
    } finally {
      setLoading(false);
    }
  }, [period, router]);

  useEffect(() => {
    load();
  }, [load]);

  const o = data?.overview || {};
  const goalPct = Math.min(100, Number(data?.goals?.percent) || 0);

  return (
    <div className="freelancer-analytics-page">
      <div className="dashboard-container">
        <h1>Freelancer Stats and Insights</h1>

        {error && (
          <div className="error-banner">
            {error}{" "}
            <button type="button" onClick={load} style={{ marginLeft: 8 }}>
              Retry
            </button>
          </div>
        )}

        {/* 1. Overview */}
        <section>
          <h3>1. Overview Dashboard</h3>
          <div className="period-row">
            <label htmlFor="time-selector">Time Period:</label>
            <select
              id="time-selector"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="30">Last 30 Days</option>
              <option value="7">Last Week</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          {loading ? (
            <p className="loading-state empty-hint">Loading metrics…</p>
          ) : (
            <div className="kpi-grid">
              <div className="card" title="Earnings in selected period">
                <div className="metric-value">{money(o.totalEarnings)}</div>
                <div className="metric-label">Total Earnings (Period)</div>
              </div>
              <div className="card" title="Completed orders">
                <div className="metric-value">{o.ordersCompleted ?? 0}</div>
                <div className="metric-label">Orders Completed</div>
              </div>
              <div className="card" title="Average buyer rating">
                <div className="metric-value">
                  {o.averageRating ? o.averageRating.toFixed(1) : "—"}
                </div>
                <div className="metric-label">Average Rating</div>
              </div>
              <div className="card" title="Profile response rate if set">
                <div className="metric-value">
                  {o.responseRate != null ? `${o.responseRate}%` : "—"}
                </div>
                <div className="metric-label">Response Rate</div>
              </div>
              <div className="card" title="Cancelled / total orders">
                <div className="metric-value">{o.cancellationRate ?? 0}%</div>
                <div className="metric-label">Cancellation Rate</div>
              </div>
              <div className="card" title="Active listed services">
                <div className="metric-value">{o.activeGigs ?? 0}</div>
                <div className="metric-label">Active Gigs</div>
              </div>
            </div>
          )}
        </section>

        <hr />

        {/* 2. Earnings */}
        <section>
          <h3>2. Earnings Analytics</h3>
          <h4>Earnings Over Time</h4>
          <div className="chart-placeholder">
            {(data?.earningsSeries?.length ?? 0) === 0 ? (
              "No completed earnings in this period yet."
            ) : (
              <div style={{ width: "100%", fontSize: "0.85rem" }}>
                {(data?.earningsSeries || []).slice(-14).map((p) => (
                  <div
                    key={p.date}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <span>{p.date}</span>
                    <strong>{money(p.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="insight-grid" style={{ marginTop: 20 }}>
            <div className="card">
              <h5>Earnings Breakdown by Gig</h5>
              <div className="table-container">
                <table className="striped-table">
                  <tbody>
                    {(data?.earningsByGig || []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="empty-hint">
                          No gig earnings yet.
                        </td>
                      </tr>
                    ) : (
                      (data?.earningsByGig || []).slice(0, 8).map((g, i) => (
                        <tr key={i}>
                          <td>{g.title || "Service"}</td>
                          <td>{money(g.earnings)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h5>Top Clients by Revenue</h5>
              <div className="table-container">
                <table className="striped-table">
                  <tbody>
                    {(data?.topClients || []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="empty-hint">
                          No client revenue yet.
                        </td>
                      </tr>
                    ) : (
                      (data?.topClients || []).map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td>{money(c.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: 10, textAlign: "right" }}>
                Available balance: <strong>{money(o.availableBalance)}</strong>
              </p>
            </div>
          </div>
        </section>

        <hr />

        {/* 3. Order performance */}
        <section>
          <h3>3. Order and Delivery Performance</h3>
          <div className="kpi-grid four-col">
            <div className="card">
              <div className="metric-value">{o.orderVolume ?? 0}</div>
              <div className="metric-label order-volume">Order Volume</div>
            </div>
            <div className="card">
              <div className="metric-value">{o.completionRate ?? 0}%</div>
              <div className="metric-label completion-rate">Completion Rate</div>
            </div>
            <div className="card">
              <div className="metric-value">
                {o.avgDeliveryDays != null ? `${o.avgDeliveryDays} days` : "—"}
              </div>
              <div className="metric-label delivery-time">Avg. Delivery Time</div>
            </div>
            <div className="card">
              <div className="metric-value">{o.lateDeliveryRate ?? 0}%</div>
              <div className="metric-label late-rate">Late Delivery Rate</div>
            </div>
          </div>
          <h4>Order Status Breakdown</h4>
          <div className="chart-placeholder">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {Object.entries(data?.orderStatus || {}).map(([k, v]) => (
                <span key={k} className="pill good">
                  {k}: {v}
                </span>
              ))}
              {!data?.orderStatus && (
                <span className="empty-hint">No order data</span>
              )}
            </div>
          </div>
        </section>

        <hr />

        {/* 4. Clients & ratings */}
        <section>
          <h3>4. Client Interaction & Ratings</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Client Interaction</h5>
              <div className="table-container">
                <table className="striped-table">
                  <tbody>
                    <tr>
                      <td>Unique Clients</td>
                      <td>{data?.clients?.uniqueClients ?? 0}</td>
                    </tr>
                    <tr>
                      <td>Repeat Clients</td>
                      <td>{data?.clients?.repeatClients ?? 0}</td>
                    </tr>
                    <tr>
                      <td>Repeat Rate</td>
                      <td>{data?.clients?.repeatRate ?? 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h5>Ratings and Reviews</h5>
              <p>
                Overall:{" "}
                <strong>
                  {data?.ratings?.overall
                    ? `${data.ratings.overall} Stars`
                    : "—"}
                </strong>
              </p>
              <div style={{ marginBottom: 10 }}>
                <span className="pill good">
                  5 Stars: {data?.ratings?.distribution?.five ?? 0}%
                </span>
                <span className="pill warn">
                  4 Stars: {data?.ratings?.distribution?.four ?? 0}%
                </span>
                <span className="pill warn">
                  ≤3: {data?.ratings?.distribution?.threeOrLess ?? 0}%
                </span>
              </div>
              {data?.ratings?.sampleReview ? (
                <p>Review highlight: “{data.ratings.sampleReview}”</p>
              ) : (
                <p className="empty-hint">No written reviews in this period.</p>
              )}
            </div>
          </div>
        </section>

        <hr />

        {/* 5. Gig performance */}
        <section>
          <h3>5. Gig Performance Insights</h3>
          <div className="kpi-grid small-cards">
            <div className="card">
              <div className="metric-value">
                {(data?.gigs?.views ?? 0).toLocaleString()}
              </div>
              <div className="metric-label">Views</div>
            </div>
            <div className="card">
              <div className="metric-value">{data?.gigs?.ctr ?? 0}%</div>
              <div className="metric-label">Click-Through Rate (CTR)</div>
            </div>
            <div className="card">
              <div className="metric-value">
                {data?.gigs?.conversionRate ?? 0}%
              </div>
              <div className="metric-label">Conversion Rate</div>
            </div>
          </div>

          <h4 style={{ marginTop: 28 }}>Gig Performance Breakdown</h4>
          <div className="table-container">
            <table className="gig-performance-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Service</th>
                  <th>Earnings</th>
                  <th>Orders</th>
                  <th>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {(data?.gigs?.breakdown || data?.earningsByGig || []).length ===
                0 ? (
                  <tr>
                    <td colSpan={5} className="empty-hint">
                      No services yet.{" "}
                      <Link href="/service-management">Manage services</Link>
                    </td>
                  </tr>
                ) : (
                  (data?.gigs?.breakdown || data?.earningsByGig || []).map(
                    (g, i) => (
                      <tr key={i}>
                        <td>
                          {g.performance === "TOP PERFORMER" ? (
                            <span className="pill good">TOP PERFORMER</span>
                          ) : g.performance === "UNDERPERFORMING" ? (
                            <span className="pill warn">UNDERPERFORMING</span>
                          ) : (
                            "Average"
                          )}
                        </td>
                        <td>{g.title || "Service"}</td>
                        <td className="performance-metric">
                          {money(g.earnings)}
                        </td>
                        <td>{g.orders ?? 0}</td>
                        <td className="performance-metric">
                          {g.conversionRate ?? 0}%
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <hr />

        {/* 6–8 simplified / linked */}
        <section>
          <h3>6. Traffic & Promotion</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Traffic</h5>
              <p className="empty-hint">
                Per-service traffic sources live on each{" "}
                <Link href="/service-management">Service Dashboard</Link>{" "}
                (views / analytics). Aggregate platform search vs external needs
                ServiceView logs across all gigs — use individual dashboards for
                detail.
              </p>
            </div>
            <div className="card">
              <h5>Promotion</h5>
              <p className="empty-hint">
                Boost campaigns are not tracked in v1. Use service dashboard
                coupons and promotion tips instead.
              </p>
              <Link
                href="/service-management"
                className="action-call-highlight"
              >
                <i className="fas fa-external-link-alt" /> Open Service Management
              </Link>
            </div>
          </div>
        </section>

        <hr />

        <section>
          <h3>7. Performance Snapshot</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Account</h5>
              <table className="striped-table">
                <tbody>
                  <tr>
                    <td>Level</td>
                    <td>{data?.level || "—"}</td>
                  </tr>
                  <tr>
                    <td>Available balance</td>
                    <td>{money(o.availableBalance)}</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ marginTop: 12 }}>
                <Link href="/freelancer-withdrawals">Withdraw earnings →</Link>
              </p>
            </div>
            <div className="card">
              <h5>Quick links</h5>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  <Link href="/freelancer-orders">Active orders</Link>
                </li>
                <li>
                  <Link href="/freelancer-orders-history">Order history</Link>
                </li>
                <li>
                  <Link href="/service-management">Services</Link>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <hr />

        {/* Goals */}
        <section>
          <h3>8. Benchmarking and Goals</h3>
          <div className="card goal-tracker">
            <h5>
              Period goal: {money(data?.goals?.target)} earnings
            </h5>
            <div className="progress-bar-container">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(goalPct, goalPct > 0 ? 8 : 0)}%` }}
              >
                {money(data?.goals?.current)} ({goalPct}%)
              </div>
            </div>
            <p className="empty-hint">
              Goal target is a simple $6,000 default for the selected period —
              edit later when you store custom goals on the profile.
            </p>
          </div>
        </section>

        <hr />

        {/* Reports */}
        <section>
          <h3>9. Reports & Recommendations</h3>
          <div className="insight-grid">
            <div className="report-card">
              <h5>Export & Reporting</h5>
              <button
                type="button"
                className="btn-primary"
                disabled={!data}
                onClick={() => data && downloadCsv(data)}
              >
                Download Report (CSV)
              </button>
            </div>
            <div className="advice-box">
              <h5>Actionable Recommendations</h5>
              <ol>
                {(data?.recommendations || []).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
