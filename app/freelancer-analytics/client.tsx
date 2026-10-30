// app/freelancer-analytics/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-analytics.css";

type Period = "30" | "7" | "lifetime";

interface PromoEntry {
  _id?: string;
  name?: string;
  cost?: number;
  views?: number;
  orders?: number;
  notes?: string;
  ended?: boolean;
  createdAt?: string;
}

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
  orderStatus?: Record<string, number>;
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
  goals?: {
    target?: number;
    current?: number;
    percent?: number;
    targetDate?: string | null;
  };
  promos?: PromoEntry[];
  recommendations?: string[];
  level?: string | null;
  benchmarks?: {
    sampleSize?: number;
    peerAvgEarnings?: number;
    peerAvgCompletedOrders?: number;
    peerAvgRating?: number | null;
    yourEarnings?: number;
    yourCompletedOrders?: number;
    yourRating?: number;
    note?: string;
  };
  boostRoas?: {
    serviceId?: string;
    title?: string;
    spend?: number;
    attributedRevenue?: number;
    roas?: number;
    orderCount?: number;
    package?: string | null;
    theoretical?: boolean;
  }[];
}

function money(n?: number) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

function downloadCsv(data: AnalyticsPayload) {
  const rows: string[][] = [
    ["Metric", "Value"],
    ["Period", data.period || ""],
    ["Total earnings", String(data.overview?.totalEarnings ?? "")],
    ["Orders completed", String(data.overview?.ordersCompleted ?? "")],
    ["Average rating", String(data.overview?.averageRating ?? "")],
    ["Active gigs", String(data.overview?.activeGigs ?? "")],
    ["Goal target", String(data.goals?.target ?? "")],
  ];
  (data.earningsByGig || []).forEach((g) => {
    rows.push([
      `Gig: ${g.title || ""}`,
      `${g.earnings}|orders=${g.orders}|conv=${g.conversionRate}`,
    ]);
  });
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `freelancer-analytics-${data.period || "export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Simple SVG bar chart — no chart library */
function BarChart({
  points,
  height = 200,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  if (!points.length) {
    return (
      <div className="chart-placeholder">No data for this period yet.</div>
    );
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const barW = Math.max(12, Math.min(40, Math.floor(560 / points.length) - 6));
  const gap = 6;
  const width = points.length * (barW + gap) + 40;
  return (
    <div className="svg-chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Earnings bar chart"
      >
        {points.map((p, i) => {
          const h = Math.max(2, (p.value / max) * (height - 36));
          const x = 20 + i * (barW + gap);
          const y = height - 24 - h;
          return (
            <g key={p.label + i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill="#d96464"
                opacity={0.9}
              >
                <title>{`${p.label}: ${money(p.value)}`}</title>
              </rect>
              {points.length <= 14 && (
                <text
                  x={x + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {p.label.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal status bars */
function StatusBars({ status }: { status?: Record<string, number> }) {
  const entries = Object.entries(status || {});
  const total = entries.reduce((s, [, v]) => s + Number(v), 0) || 1;
  if (!entries.length) {
    return <div className="chart-placeholder">No order data</div>;
  }
  return (
    <div className="status-bars">
      {entries.map(([k, v]) => {
        const pct = Math.round((Number(v) / total) * 100);
        return (
          <div key={k} className="status-bar-row">
            <span className="status-bar-label">
              {k} ({v})
            </span>
            <div className="status-bar-track">
              <div
                className="status-bar-fill"
                style={{ width: `${pct}%` }}
                title={`${pct}%`}
              />
            </div>
            <span className="status-bar-pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FreelancerAnalyticsClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTarget, setGoalTarget] = useState("6000");
  const [goalDate, setGoalDate] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: "",
    cost: "",
    views: "",
    orders: "",
    notes: "",
  });
  const [promoBusy, setPromoBusy] = useState(false);

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
        headers: authHeaders(),
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
      if (json.goals?.target) setGoalTarget(String(json.goals.target));
      if (json.goals?.targetDate) {
        try {
          setGoalDate(String(json.goals.targetDate).slice(0, 10));
        } catch {
          /* ignore */
        }
      }
    } catch {
      setError("Network error loading analytics.");
    } finally {
      setLoading(false);
    }
  }, [period, router]);

  useEffect(() => {
    load();
  }, [load]);

  const chartPoints = useMemo(() => {
    return (data?.earningsSeries || []).map((p) => ({
      label: p.date,
      value: Number(p.amount) || 0,
    }));
  }, [data?.earningsSeries]);

  const saveGoal = async () => {
    setGoalBusy(true);
    try {
      const res = await fetch("/api/freelancer/analytics/goals", {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          target: Number(goalTarget),
          targetDate: goalDate || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.message || "Could not save goal.");
        return;
      }
      setGoalOpen(false);
      await load();
    } catch {
      alert("Network error saving goal.");
    } finally {
      setGoalBusy(false);
    }
  };

  const savePromo = async () => {
    setPromoBusy(true);
    try {
      const res = await fetch("/api/freelancer/analytics/promos", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: promoForm.name,
          cost: Number(promoForm.cost) || 0,
          views: Number(promoForm.views) || 0,
          orders: Number(promoForm.orders) || 0,
          notes: promoForm.notes,
          ended: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.message || "Could not save promo.");
        return;
      }
      setPromoOpen(false);
      setPromoForm({ name: "", cost: "", views: "", orders: "", notes: "" });
      await load();
    } catch {
      alert("Network error saving promo.");
    } finally {
      setPromoBusy(false);
    }
  };

  const o = data?.overview || {};
  const goalPct = Math.min(100, Number(data?.goals?.percent) || 0);
  const promos = data?.promos || [];

  return (
    <div className="freelancer-analytics-page">
      <div className="dashboard-container">
        <h1>Freelancer Stats and Insights</h1>

        {error && (
          <div className="error-banner">
            {error}{" "}
            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        )}

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
            <p className="empty-hint">Loading metrics…</p>
          ) : (
            <div className="kpi-grid">
              <div className="card">
                <div className="metric-value">{money(o.totalEarnings)}</div>
                <div className="metric-label">Total Earnings (Period)</div>
              </div>
              <div className="card">
                <div className="metric-value">{o.ordersCompleted ?? 0}</div>
                <div className="metric-label">Orders Completed</div>
              </div>
              <div className="card">
                <div className="metric-value">
                  {o.averageRating ? o.averageRating.toFixed(1) : "—"}
                </div>
                <div className="metric-label">Average Rating</div>
              </div>
              <div className="card">
                <div className="metric-value">
                  {o.responseRate != null ? `${o.responseRate}%` : "—"}
                </div>
                <div className="metric-label">Response Rate</div>
              </div>
              <div className="card">
                <div className="metric-value">{o.cancellationRate ?? 0}%</div>
                <div className="metric-label">Cancellation Rate</div>
              </div>
              <div className="card">
                <div className="metric-value">{o.activeGigs ?? 0}</div>
                <div className="metric-label">Active Gigs</div>
              </div>
            </div>
          )}
        </section>

        <hr />

        <section>
          <h3>2. Earnings Analytics</h3>
          <h4>Earnings Over Time</h4>
          <BarChart points={chartPoints} />

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

        <section>
          <h3>3. Order and Delivery Performance</h3>
          <div className="kpi-grid four-col">
            <div className="card">
              <div className="metric-value">{o.orderVolume ?? 0}</div>
              <div className="metric-label">Order Volume</div>
            </div>
            <div className="card">
              <div className="metric-value">{o.completionRate ?? 0}%</div>
              <div className="metric-label">Completion Rate</div>
            </div>
            <div className="card">
              <div className="metric-value">
                {o.avgDeliveryDays != null ? `${o.avgDeliveryDays} days` : "—"}
              </div>
              <div className="metric-label">Avg. Delivery Time</div>
            </div>
            <div className="card">
              <div className="metric-value">{o.lateDeliveryRate ?? 0}%</div>
              <div className="metric-label">Late Delivery Rate</div>
            </div>
          </div>
          <h4>Order Status Breakdown</h4>
          <StatusBars status={data?.orderStatus} />
        </section>

        <hr />

        <section>
          <h3>4. Client Interaction & Ratings</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Client Interaction</h5>
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
                  5★ {data?.ratings?.distribution?.five ?? 0}%
                </span>
                <span className="pill warn">
                  4★ {data?.ratings?.distribution?.four ?? 0}%
                </span>
                <span className="pill warn">
                  ≤3 {data?.ratings?.distribution?.threeOrLess ?? 0}%
                </span>
              </div>
              {data?.ratings?.sampleReview ? (
                <p>“{data.ratings.sampleReview}”</p>
              ) : (
                <p className="empty-hint">No written reviews in this period.</p>
              )}
            </div>
          </div>
        </section>

        <hr />

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
              <div className="metric-label">CTR</div>
            </div>
            <div className="card">
              <div className="metric-value">
                {data?.gigs?.conversionRate ?? 0}%
              </div>
              <div className="metric-label">Conversion Rate</div>
            </div>
          </div>
          <h4>Gig Performance Breakdown</h4>
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

        <section>
          <h3>6. Traffic & Promotion</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Traffic</h5>
              <p className="empty-hint">
                Detailed source breakdown is on each{" "}
                <Link href="/service-management">Service Dashboard</Link>.
                Account views:{" "}
                <strong>{(data?.gigs?.views ?? 0).toLocaleString()}</strong> ·
                clicks:{" "}
                <strong>{(data?.gigs?.clicks ?? 0).toLocaleString()}</strong>
              </p>
            </div>
            <div className="card">
              <h5>Promotion / boost log</h5>
              <p className="empty-hint">
                Log manual boosts until paid campaigns are productized.
              </p>
              {(promos.length === 0 && (
                <p className="empty-hint">No promos logged yet.</p>
              )) || (
                <table className="striped-table">
                  <tbody>
                    {promos.slice(0, 5).map((p, i) => (
                      <tr key={p._id || i}>
                        <td>
                          {p.name}{" "}
                          {p.ended ? (
                            <span className="pill warn">Ended</span>
                          ) : null}
                        </td>
                        <td>
                          {money(p.cost)} · {p.orders || 0} orders
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => setPromoOpen(true)}
              >
                Log a promo
              </button>
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

        <section>
          <h3>8. Benchmarking and Goals</h3>
          <div className="insight-grid">
            <div className="card">
              <h5>Peer benchmarks</h5>
              <p className="empty-hint" style={{ marginTop: 0 }}>
                Anonymous averages for sellers with at least one completed order
                in this period
                {data?.benchmarks?.sampleSize
                  ? ` (n=${data.benchmarks.sampleSize})`
                  : ""}
                .
              </p>
              <table className="striped-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>You</th>
                    <th>Peers</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Earnings</td>
                    <td>{money(data?.benchmarks?.yourEarnings ?? o.totalEarnings)}</td>
                    <td>{money(data?.benchmarks?.peerAvgEarnings)}</td>
                  </tr>
                  <tr>
                    <td>Completed orders</td>
                    <td>{data?.benchmarks?.yourCompletedOrders ?? o.ordersCompleted ?? 0}</td>
                    <td>{data?.benchmarks?.peerAvgCompletedOrders ?? "—"}</td>
                  </tr>
                  <tr>
                    <td>Avg rating</td>
                    <td>
                      {data?.benchmarks?.yourRating != null
                        ? Number(data.benchmarks.yourRating).toFixed(1)
                        : "—"}
                    </td>
                    <td>
                      {data?.benchmarks?.peerAvgRating != null
                        ? Number(data.benchmarks.peerAvgRating).toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card goal-tracker">
              <h5>
                Goal: {money(data?.goals?.target)} earnings
                {data?.goals?.targetDate
                  ? ` by ${String(data.goals.targetDate).slice(0, 10)}`
                  : ""}
              </h5>
              <div className="progress-bar-container">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(goalPct, goalPct > 0 ? 8 : 0)}%` }}
                >
                  {money(data?.goals?.current)} ({goalPct}%)
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => setGoalOpen(true)}
              >
                Set / Edit Goals
              </button>
            </div>
          </div>

          {(data?.boostRoas || []).length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h5>Boost ROAS (theoretical)</h5>
              <p className="empty-hint">
                Spend = package list price. Revenue = completed orders on that
                service during the last boost window. Live card charge comes later.
              </p>
              <div className="table-container">
                <table className="striped-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Spend</th>
                      <th>Revenue</th>
                      <th>ROAS</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.boostRoas || []).map((b, i) => (
                      <tr key={b.serviceId || i}>
                        <td>{b.title || "Service"}</td>
                        <td>{money(b.spend)}</td>
                        <td>{money(b.attributedRevenue)}</td>
                        <td>
                          <strong>
                            {b.roas != null ? `${b.roas}x` : "—"}
                          </strong>
                        </td>
                        <td>{b.orderCount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <hr />

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

      {/* Goal modal */}
      {goalOpen && (
        <div className="fa-modal-overlay" role="dialog" aria-modal="true">
          <div className="fa-modal">
            <h3>Set earnings goal</h3>
            <label>
              Target amount (USD)
              <input
                type="number"
                min={1}
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
              />
            </label>
            <label>
              Target date (optional)
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
              />
            </label>
            <div className="fa-modal-actions">
              <button type="button" onClick={() => setGoalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={goalBusy}
                onClick={saveGoal}
              >
                {goalBusy ? "Saving…" : "Save goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo modal */}
      {promoOpen && (
        <div className="fa-modal-overlay" role="dialog" aria-modal="true">
          <div className="fa-modal">
            <h3>Log a promotion / boost</h3>
            <label>
              Name
              <input
                value={promoForm.name}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. 7-day gig boost"
              />
            </label>
            <label>
              Cost (USD)
              <input
                type="number"
                min={0}
                value={promoForm.cost}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, cost: e.target.value }))
                }
              />
            </label>
            <label>
              Views generated
              <input
                type="number"
                min={0}
                value={promoForm.views}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, views: e.target.value }))
                }
              />
            </label>
            <label>
              Orders generated
              <input
                type="number"
                min={0}
                value={promoForm.orders}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, orders: e.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                rows={3}
                value={promoForm.notes}
                onChange={(e) =>
                  setPromoForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
            <div className="fa-modal-actions">
              <button type="button" onClick={() => setPromoOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={promoBusy}
                onClick={savePromo}
              >
                {promoBusy ? "Saving…" : "Save promo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
