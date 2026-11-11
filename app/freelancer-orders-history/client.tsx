// app/freelancer-orders-history/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-orders-history.css";

type OrderRow = {
  _id: string;
  status: string;
  packageName?: string;
  amount?: number;
  buyer?: {
    _id?: string | null;
    name?: string;
    avatar?: string;
  };
  service?: { _id?: string; title?: string } | null;
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  orderNumber?: string;
  deliveryNote?: string;
  deliveryFiles?: (
    | string
    | {
        url?: string | null;
        previewUrl?: string | null;
        name?: string;
        mime?: string;
        locked?: boolean;
      }
  )[];
  basePackagePrice?: number;
  subtotal?: number;
  sellerPlatformFee?: number;
  sellerEarnings?: number;
  grandTotal?: number;
  requirements?: string;
  rating?: number;
  buyerRating?: number;
  paymentMethod?: string | null;
  invoiceNumber?: string | null;
};

type UiStatus =
  | "in-progress"
  | "delivered"
  | "completed"
  | "canceled"
  | "disputed"
  | "pending"
  | "revision";

type DatePreset = "all" | "30" | "90" | "year" | "custom";
type TrackerTab =
  | "summary"
  | "timeline"
  | "communication"
  | "files"
  | "invoice";

const PAGE_SIZE = 10;
const FILTERS_KEY = "freelancer-orders-history-filters";

function mapStatus(raw: string, deliveredAt?: string | null): UiStatus {
  const s = (raw || "").toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("disput")) return "disputed";
  if (s.includes("revision")) return "revision";
  if (s === "pending") return "pending";
  if (s.includes("deliver") && !s.includes("escrow")) return "delivered";
  if (deliveredAt && (s === "in_escrow" || s.includes("progress"))) {
    return "delivered";
  }
  if (s === "in_escrow" || s.includes("progress") || s === "active")
    return "in-progress";
  return "pending";
}

function orderUiStatus(o: {
  status: string;
  deliveredAt?: string | null;
}): UiStatus {
  return mapStatus(o.status, o.deliveredAt);
}

function formatMoney(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function isOverdue(order: OrderRow): boolean {
  const ui = orderUiStatus(order);
  if (ui === "completed" || ui === "canceled") return false;
  if (!order.dueAt) return false;
  try {
    return new Date(order.dueAt).getTime() < Date.now();
  } catch {
    return false;
  }
}

function showToast(
  msg: string,
  type: "success" | "removed" | "info" = "success"
) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const iconName =
    type === "removed"
      ? "fa-exclamation-triangle"
      : type === "info"
        ? "fa-info-circle"
        : "fa-check-circle";
  const icon = document.createElement("i");
  icon.className = `fas ${iconName}`;
  const span = document.createElement("span");
  span.textContent = String(msg ?? "");
  el.appendChild(icon);
  el.appendChild(document.createTextNode(" "));
  el.appendChild(span);
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function csvEscape(val: unknown): string {
  let s = String(val ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FreelancerOrdersHistoryClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [listTruncated, setListTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerOrder, setTrackerOrder] = useState<OrderRow | null>(null);
  const [trackerTab, setTrackerTab] = useState<TrackerTab>("summary");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTERS_KEY);
      if (raw) {
        const f = JSON.parse(raw);
        if (f.search != null) setSearch(String(f.search));
        if (f.statusFilter) setStatusFilter(String(f.statusFilter));
        if (f.sortBy) setSortBy(String(f.sortBy));
        if (f.serviceFilter) setServiceFilter(String(f.serviceFilter));
        if (f.datePreset) setDatePreset(f.datePreset as DatePreset);
        if (f.customFrom) setCustomFrom(String(f.customFrom));
        if (f.customTo) setCustomTo(String(f.customTo));
      }
    } catch {
      /* ignore */
    }
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({
          search,
          statusFilter,
          sortBy,
          serviceFilter,
          datePreset,
          customFrom,
          customTo,
        })
      );
    } catch {
      /* ignore */
    }
  }, [
    filtersReady,
    search,
    statusFilter,
    sortBy,
    serviceFilter,
    datePreset,
    customFrom,
    customTo,
  ]);

  const getAuthHeaders = (): Record<string, string> => {
    const h: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/mine?limit=500", {
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/?auth=login");
        return;
      }
      if (!res.ok) {
        setOrders([]);
        showToast(data.message || "Failed to load history", "removed");
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setListTruncated(Boolean(data.meta?.truncated));
    } catch {
      setOrders([]);
      setListTruncated(false);
      showToast("Network error loading history", "removed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const id = o.service?._id || o.packageName || o.service?.title;
      const label = o.packageName || o.service?.title || "Service";
      if (id) map.set(String(id), label);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const repeatBuyerIds = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const id = o.buyer?._id;
      if (!id) return;
      counts.set(String(id), (counts.get(String(id)) || 0) + 1);
    });
    const repeat = new Set<string>();
    counts.forEach((n, id) => {
      if (n >= 2) repeat.add(id);
    });
    return repeat;
  }, [orders]);

  const inDateRange = useCallback(
    (iso?: string | null) => {
      if (datePreset === "all") return true;
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return false;

      if (datePreset === "30") return t >= startOfDaysAgo(30).getTime();
      if (datePreset === "90") return t >= startOfDaysAgo(90).getTime();
      if (datePreset === "year") return t >= startOfDaysAgo(365).getTime();
      if (datePreset === "custom") {
        if (customFrom) {
          const from = new Date(customFrom);
          from.setHours(0, 0, 0, 0);
          if (t < from.getTime()) return false;
        }
        if (customTo) {
          const to = new Date(customTo);
          to.setHours(23, 59, 59, 999);
          if (t > to.getTime()) return false;
        }
        return true;
      }
      return true;
    },
    [datePreset, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (!inDateRange(o.createdAt)) return false;

      const ui = orderUiStatus(o);
      const name = (o.buyer?.name || "").toLowerCase();
      const id = (o.orderNumber || o._id || "").toLowerCase();
      const svc = (o.packageName || o.service?.title || "").toLowerCase();
      const matchQ =
        !q || name.includes(q) || id.includes(q) || svc.includes(q);

      let matchS = true;
      if (statusFilter === "in-progress") {
        matchS =
          ui === "in-progress" || ui === "pending" || ui === "revision";
      } else if (statusFilter === "delivered") {
        matchS = ui === "delivered";
      } else if (statusFilter === "completed") {
        matchS = ui === "completed";
      } else if (statusFilter === "canceled") {
        matchS = ui === "canceled";
      } else if (statusFilter === "disputed") {
        matchS = ui === "disputed";
      }

      let matchSvc = true;
      if (serviceFilter !== "all") {
        const key = String(
          o.service?._id || o.packageName || o.service?.title || ""
        );
        matchSvc = key === serviceFilter;
      }

      return matchQ && matchS && matchSvc;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "date-desc") {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
      if (sortBy === "date-asc") {
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      }
      if (sortBy === "payout-desc") {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      }
      if (sortBy === "payout-asc") {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      return 0;
    });

    return list;
  }, [orders, search, statusFilter, sortBy, serviceFilter, inDateRange]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    sortBy,
    serviceFilter,
    datePreset,
    customFrom,
    customTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    let completed = 0;
    let totalEarned = 0;
    let pendingPayouts = 0;
    const ratings: number[] = [];
    orders.forEach((o) => {
      const ui = orderUiStatus(o);
      // Net seller payout only (API amount is sellerEarnings)
      const amt = Number(
        o.sellerEarnings != null ? o.sellerEarnings : o.amount
      ) || 0;
      if (ui === "completed") {
        completed += 1;
        totalEarned += amt;
      }
      if (ui === "in-progress" || ui === "delivered" || ui === "revision") {
        pendingPayouts += amt;
      }
      const r = Number(o.rating ?? o.buyerRating);
      if (Number.isFinite(r) && r > 0) ratings.push(r);
    });
    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : "—";
    return { completed, totalEarned, pendingPayouts, rating: avgRating };
  }, [orders]);

  const earningsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (orderUiStatus(o) !== "completed") return;
      const d = o.deliveredAt || o.updatedAt || o.createdAt;
      if (!d) return;
      const dt = new Date(d);
      if (!Number.isFinite(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + (Number(o.amount) || 0));
    });
    const keys = Array.from(map.keys()).sort();
    const last = keys.slice(-6);
    const max = Math.max(1, ...last.map((k) => map.get(k) || 0));
    return last.map((k) => ({
      key: k,
      label: k.slice(5) + "/" + k.slice(2, 4),
      value: map.get(k) || 0,
      pct: ((map.get(k) || 0) / max) * 100,
    }));
  }, [orders]);

  const openTracker = (order: OrderRow, tab: TrackerTab = "timeline") => {
    setTrackerOrder(order);
    setTrackerTab(tab);
    setTrackerOpen(true);
  };

  const closeTracker = () => {
    setTrackerOpen(false);
    setTrackerOrder(null);
    setActionBusy(false);
  };

  const postOrderAction = async (
    orderId: string,
    path: string,
    body?: Record<string, unknown>
  ) => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        showToast(
          data.message || data.msg || `Action failed (${res.status})`,
          "removed"
        );
        return false;
      }
      showToast(data.message || "Updated successfully");
      await loadOrders();
      return true;
    } catch {
      showToast("Network error", "removed");
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeliver = async () => {
    if (!trackerOrder) return;
    const note = window.prompt("Delivery note for the buyer (optional):");
    if (note === null) return;
    const ok = await postOrderAction(trackerOrder._id, "deliver", {
      deliveryNote: note.trim(),
    });
    if (ok) {
      setTrackerOrder((prev) =>
        prev
          ? {
              ...prev,
              deliveredAt: new Date().toISOString(),
              deliveryNote: note.trim(),
            }
          : prev
      );
    }
  };

  const handleRemind = async () => {
    if (!trackerOrder) return;
    await postOrderAction(trackerOrder._id, "remind");
  };

  const handleExtend = async () => {
    if (!trackerOrder) return;
    const reason = window.prompt("Why do you need more time?");
    if (reason === null) return;
    const dateStr = window.prompt(
      "Proposed new due date (YYYY-MM-DD) — optional:"
    );
    if (dateStr === null) return;
    const body: Record<string, unknown> = { reason: reason.trim() };
    if (dateStr.trim()) body.proposedDate = dateStr.trim();
    await postOrderAction(trackerOrder._id, "extend", body);
  };

  const handleInvoice = () => {
    if (!trackerOrder) return;
    window.open(`/api/orders/${trackerOrder._id}/invoice`, "_blank");
  };

  const contactClient = async (order: OrderRow) => {
    const recipientId = order.buyer?._id;
    if (!recipientId) {
      showToast("Buyer id missing for this order", "removed");
      return;
    }
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          orderId: order._id,
          initialMessage: `Hi! Regarding order ${
            order.orderNumber || `#${order._id.slice(-6)}`
          }.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not open chat", "removed");
        return;
      }
      const cid = data.conversationId || data.conversation?._id;
      router.push(cid ? `/messages?c=${cid}` : "/messages");
    } catch {
      showToast("Network error", "removed");
    }
  };

  const handleExport = () => {
    if (!filtered.length) {
      showToast("No orders to export", "removed");
      return;
    }
    const header = [
      "Order ID",
      "Order Number",
      "Buyer",
      "Service",
      "Status",
      "Payout",
      "Due At",
      "Created At",
      "Delivered At",
    ];
    const rows = filtered.map((o) => [
      o._id,
      o.orderNumber || "",
      o.buyer?.name || "",
      o.packageName || o.service?.title || "",
      o.status,
      String(o.amount ?? ""),
      o.dueAt || "",
      o.createdAt || "",
      o.deliveredAt || "",
    ]);
    downloadCsv(
      `order-history-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows]
    );
    showToast(`Exported ${filtered.length} order(s)`, "success");
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortBy("date-desc");
    setServiceFilter("all");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
    showToast("Filters cleared", "info");
  };

  /** Manage / Track → open modal; not /orders detail */
  const actionLabel = (ui: UiStatus) => {
    if (ui === "pending") {
      return { text: "Manage Order", icon: "fas fa-cogs" };
    }
    if (ui === "in-progress" || ui === "delivered" || ui === "revision") {
      return { text: "Track", icon: "fas fa-compass" };
    }
    if (ui === "completed") {
      return { text: "View Record", icon: "fas fa-receipt" };
    }
    return { text: "View Details", icon: "fas fa-eye" };
  };

  return (
    <>
      <div className="orders-history-page">
        <div className="page-container">
          <div className="oh-page-header-row">
            <div>
              <h1 className="page-title">
                <i className="fas fa-history" /> Order History
              </h1>
              <p className="page-subtitle">
                A comprehensive record of all your service transactions, active
                and completed.
              </p>
            </div>
            <div className="oh-header-actions">
              <Link
                href="/freelancer-orders"
                className="btn-action btn-oh-primary"
              >
                <i className="fas fa-tasks" /> Active queue
              </Link>
              <button
                type="button"
                className="btn-action btn-dark-gray"
                onClick={handleExport}
              >
                <i className="fas fa-file-export" /> Export CSV
              </button>
            </div>
          </div>

          {listTruncated && (
            <div className="alert-box oh-truncated-note" style={{ marginBottom: 16 }}>
              Showing your most recent orders only (limit reached). Older
              orders are not loaded in this list or CSV export yet.
            </div>
          )}

          <div
            className="order-summary-overview"
            id="freelancer-overview-cards"
          >
            <div style={{ width: "100%" }}>
              <h2 className="overview-header">
                <i className="fas fa-chart-line" /> My Performance Overview
              </h2>
            </div>

            <div className="summary-card card-jobs-completed">
              <div className="card-value-section">
                <p className="card-value">{stats.completed}</p>
              </div>
              <div className="card-label-section">
                <i className="fas fa-briefcase" /> Jobs Completed
              </div>
            </div>
            <div className="summary-card card-total-earned">
              <div className="card-value-section">
                <p className="card-value">{formatMoney(stats.totalEarned)}</p>
              </div>
              <div className="card-label-section">
                <i className="fas fa-dollar-sign" /> Total Earned
              </div>
            </div>
            <div className="summary-card card-average-rating">
              <div className="card-value-section">
                <p className="card-value">{stats.rating}</p>
              </div>
              <div className="card-label-section">
                <i className="fas fa-star" /> Average Rating
              </div>
            </div>
            <div className="summary-card card-pending-payouts">
              <div className="card-value-section">
                <p className="card-value">
                  {formatMoney(stats.pendingPayouts)}
                </p>
              </div>
              <div className="card-label-section">
                <i className="fas fa-hourglass-half" /> Pending Payouts
              </div>
            </div>

            {earningsByMonth.length > 0 && (
              <div className="oh-earnings-chart" style={{ width: "100%" }}>
                <h3 className="oh-chart-title">
                  <i className="fas fa-chart-bar" /> Earnings (last months)
                </h3>
                <div className="oh-chart-bars">
                  {earningsByMonth.map((m) => (
                    <div
                      key={m.key}
                      className="oh-chart-col"
                      title={formatMoney(m.value)}
                    >
                      <div className="oh-chart-bar-wrap">
                        <div
                          className="oh-chart-bar"
                          style={{ height: `${Math.max(6, m.pct)}%` }}
                        />
                      </div>
                      <span className="oh-chart-label">{m.label}</span>
                      <span className="oh-chart-val">
                        {formatMoney(m.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ width: "100%" }}>
              <h2 className="latest-orders-header">
                <i className="fas fa-clipboard-list" /> Latest Orders
              </h2>
            </div>
          </div>

          <hr />

          <div className="order-controls">
            <input
              type="text"
              id="order-search"
              className="order-input-filter"
              placeholder="Search by Order ID, Client, or Service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              id="status-filter"
              className="order-select-filter"
              title="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="in-progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
              <option value="disputed">Disputed</option>
            </select>
            <select
              className="order-select-filter"
              title="Filter by Service"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="all">All Services</option>
              {serviceOptions.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="order-select-filter"
              title="Date range"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
            >
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="year">Last 12 months</option>
              <option value="custom">Custom range</option>
            </select>
            <select
              id="sort-by"
              className="order-select-filter"
              title="Sort Order"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date-desc">Date Placed (Newest)</option>
              <option value="payout-desc">Payout (High to Low)</option>
              <option value="date-asc">Date Placed (Oldest)</option>
              <option value="payout-asc">Payout (Low to High)</option>
            </select>
            <button
              type="button"
              className="btn-action btn-secondary"
              onClick={clearFilters}
              title="Clear saved filters"
            >
              <i className="fas fa-undo" /> Reset
            </button>
          </div>

          {datePreset === "custom" && (
            <div className="oh-custom-dates">
              <label>
                From{" "}
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                To{" "}
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="order-list-wrapper">
            <table className="order-table">
              <thead>
                <tr>
                  <th />
                  <th>Order ID</th>
                  <th>Service Name</th>
                  <th>Client</th>
                  <th>Date Placed</th>
                  <th>Due Date</th>
                  <th>Payout</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="freelancer-order-table-body">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: 30 }}
                    >
                      Loading history…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-state oh-empty">
                      <p>
                        {orders.length === 0
                          ? "No orders yet. When buyers purchase your services, they will appear here."
                          : "No orders match your current filters."}
                      </p>
                      <div className="oh-empty-actions">
                        {orders.length === 0 ? (
                          <>
                            <Link
                              href="/service-management"
                              className="btn-action btn-oh-primary"
                            >
                              Manage services
                            </Link>
                            <Link
                              href="/freelancer-orders"
                              className="btn-action btn-dark-gray"
                            >
                              Active queue
                            </Link>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-action btn-secondary"
                            onClick={clearFilters}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((order) => {
                    const ui = orderUiStatus(order);
                    const oid =
                      order.orderNumber ||
                      `#${String(order._id).slice(-6)}`;
                    const act = actionLabel(ui);
                    const overdue = isOverdue(order);
                    const isRepeat =
                      order.buyer?._id &&
                      repeatBuyerIds.has(String(order.buyer._id));
                    const open = expandedId === order._id;
                    return (
                      <React.Fragment key={order._id}>
                        <tr
                          data-order-id={order._id}
                          className={
                            overdue ? "oh-row-overdue" : undefined
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className="oh-expand-btn"
                              title="Quick actions"
                              onClick={() =>
                                setExpandedId(open ? null : order._id)
                              }
                            >
                              <i
                                className={`fas fa-chevron-${
                                  open ? "up" : "down"
                                }`}
                              />
                            </button>
                          </td>
                          <td>
                            {/* Order ID → Order Details page */}
                            <Link
                              href={`/orders/${order._id}`}
                              className="clickable-id"
                              title="Open order details"
                            >
                              {oid}
                            </Link>
                          </td>
                          <td>
                            {order.service?._id ? (
                              <Link
                                href={`/services/details/${order.service._id}`}
                                className="clickable-service"
                              >
                                {order.packageName ||
                                  order.service?.title ||
                                  "Service"}
                              </Link>
                            ) : (
                              <span className="clickable-service">
                                {order.packageName ||
                                  order.service?.title ||
                                  "Service"}
                              </span>
                            )}
                          </td>
                          <td>
                            {order.buyer?._id ? (
                              <Link
                                href={`/freelancer-profile?id=${order.buyer._id}`}
                                className="clickable-client"
                                title="View client profile"
                              >
                                <Image
                                  src={
                                    order.buyer?.avatar ||
                                    "/default-avatar.png"
                                  }
                                  alt={order.buyer?.name || "Client"}
                                  width={30}
                                  height={30}
                                  className="client-avatar"
                                  unoptimized
                                />
                                <span>
                                  {order.buyer?.name || "Client"}
                                </span>
                                {isRepeat ? (
                                  <span
                                    className="oh-repeat-badge"
                                    title="Repeat client"
                                  >
                                    Repeat
                                  </span>
                                ) : null}
                              </Link>
                            ) : (
                              <span className="clickable-client">
                                <Image
                                  src={
                                    order.buyer?.avatar ||
                                    "/default-avatar.png"
                                  }
                                  alt={order.buyer?.name || "Client"}
                                  width={30}
                                  height={30}
                                  className="client-avatar"
                                  unoptimized
                                />
                                {order.buyer?.name || "Client"}
                              </span>
                            )}
                          </td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td
                            className={
                              overdue ? "oh-due-overdue" : undefined
                            }
                          >
                            <i
                              className={
                                overdue
                                  ? "fas fa-exclamation-triangle"
                                  : "fas fa-calendar-alt"
                              }
                              style={{
                                marginRight: 5,
                                color: overdue ? "#c0392b" : "#34495e",
                              }}
                            />
                            {formatDate(order.dueAt)}
                            {overdue ? (
                              <span className="oh-overdue-tag">
                                {" "}
                                Overdue
                              </span>
                            ) : null}
                          </td>
                          <td
                            style={{
                              fontWeight: "bold",
                              color: "var(--oh-success, #27ae60)",
                            }}
                          >
                            {formatMoney(order.amount)}
                          </td>
                          <td>
                            <span className={`status-badge status-${ui}`}>
                              {ui.replace("-", " ").toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-action btn-dark-gray btn-track-details"
                              onClick={() =>
                                openTracker(
                                  order,
                                  ui === "completed" ||
                                    ui === "canceled" ||
                                    ui === "disputed"
                                    ? "summary"
                                    : "timeline"
                                )
                              }
                            >
                              <i className={act.icon} /> {act.text}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="oh-expand-row">
                            <td colSpan={9}>
                              <div className="oh-quick-actions">
                                <button
                                  type="button"
                                  className="btn-action btn-oh-primary"
                                  onClick={() => contactClient(order)}
                                >
                                  <i className="fas fa-comment-dots" />{" "}
                                  Contact
                                </button>
                                <button
                                  type="button"
                                  className="btn-action btn-secondary"
                                  onClick={() =>
                                    openTracker(order, "timeline")
                                  }
                                >
                                  <i className="fas fa-compass" /> Tracker
                                </button>
                                <Link
                                  href={`/orders/${order._id}`}
                                  className="btn-action btn-dark-gray"
                                >
                                  <i className="fas fa-external-link-alt" />{" "}
                                  Full details
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button
              id="prev-page"
              className="btn-action btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fas fa-chevron-left" /> Previous
            </button>
            <span id="page-info">
              Page {page} of {totalPages} · {filtered.length} order
              {filtered.length === 1 ? "" : "s"}
            </span>
            <button
              id="next-page"
              className="btn-action btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {/* Professional seller tracker modal */}
      {trackerOpen && trackerOrder && (
        <div
          className="f-modal oh-modal"
          id="order-tracker-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTracker();
          }}
        >
          <div className="modal-content large-modal detailed-order-modal-content buyer-tracker-modal seller-tracker-modal">
            <div className="btm-header">
              <div className="btm-header-left">
                <div className="btm-brand" aria-label="Thick 9">
                  <span className="btm-logo-mark">T9</span>
                  <span className="btm-logo-text">Thick 9</span>
                </div>
                <span className="btm-header-divider" aria-hidden />
                <div className="btm-seller">
                  <Image
                    src={
                      trackerOrder.buyer?.avatar || "/default-avatar.png"
                    }
                    alt=""
                    width={40}
                    height={40}
                    className="btm-seller-avatar"
                    unoptimized
                  />
                  <div className="btm-seller-meta">
                    <div className="btm-seller-name">
                      {trackerOrder.buyer?.name || "Client"}
                    </div>
                    <span className="btm-seller-role">Buyer</span>
                  </div>
                </div>
              </div>

              <div className="btm-header-center">
                <span className="btm-order-id">
                  ORDER{" "}
                  {trackerOrder.orderNumber ||
                    `#${String(trackerOrder._id).slice(-6).toUpperCase()}`}
                </span>
                <h3 className="btm-service-title">
                  {trackerOrder.service?.title ||
                    trackerOrder.packageName ||
                    "Service"}
                </h3>
                <span
                  className={`btm-status-chip status-${orderUiStatus(
                    trackerOrder
                  )}`}
                >
                  {orderUiStatus(trackerOrder)
                    .replace("-", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>

              <div className="btm-header-right">
                <span className="btm-amount">
                  {formatMoney(
                    trackerOrder.sellerEarnings ?? trackerOrder.amount
                  )}
                </span>
                <button
                  type="button"
                  className="btm-btn-outline"
                  onClick={() => contactClient(trackerOrder)}
                >
                  Message
                </button>
                <button
                  type="button"
                  className="btm-close"
                  onClick={closeTracker}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="btm-meta-strip">
              <span>
                <i className="far fa-calendar" /> Placed{" "}
                {formatDate(trackerOrder.createdAt)}
              </span>
              <span>
                <i className="far fa-clock" /> Due{" "}
                {formatDate(trackerOrder.dueAt)}
              </span>
              <span>
                <i className="fas fa-wallet" /> Your payout{" "}
                {formatMoney(
                  trackerOrder.sellerEarnings ?? trackerOrder.amount
                )}
              </span>
              <span>
                <i className="fas fa-shield-alt" /> Escrow protected
              </span>
            </div>

            <div className="modal-tabs btm-tabs">
              {(
                [
                  ["summary", "Summary"],
                  ["timeline", "Progress"],
                  ["communication", "Messages"],
                  ["files", "Files"],
                  ["invoice", "Invoice"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`tab-button${
                    trackerTab === key ? " active" : ""
                  }`}
                  onClick={() => setTrackerTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="tab-content-container btm-body">
              {trackerTab === "summary" && (
                <div className="tab-pane active">
                  <div className="summary-columns-container">
                    <div className="summary-column">
                      <h4>Order summary</h4>
                      <table className="summary-table stripped-table">
                        <tbody>
                          <tr>
                            <th>Client</th>
                            <td>{trackerOrder.buyer?.name || "—"}</td>
                          </tr>
                          <tr>
                            <th>Service</th>
                            <td>
                              {trackerOrder.service?.title ||
                                trackerOrder.packageName ||
                                "—"}
                            </td>
                          </tr>
                          <tr>
                            <th>Requirements</th>
                            <td>{trackerOrder.requirements || "—"}</td>
                          </tr>
                          <tr>
                            <th>Due</th>
                            <td>{formatDate(trackerOrder.dueAt)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="summary-column">
                      <h4>Payout details</h4>
                      <table className="stripped-table price-breakdown-table">
                        <tbody>
                          <tr>
                            <th>Service / subtotal</th>
                            <td>
                              {formatMoney(
                                trackerOrder.subtotal ??
                                  trackerOrder.basePackagePrice
                              )}
                            </td>
                          </tr>
                          <tr>
                            <th>Platform fee</th>
                            <td>
                              −
                              {formatMoney(
                                trackerOrder.sellerPlatformFee
                              ).replace("$", "")}
                            </td>
                          </tr>
                          <tr className="total-row">
                            <th>Net payout</th>
                            <td>
                              <strong>
                                {formatMoney(
                                  trackerOrder.sellerEarnings ??
                                    trackerOrder.amount
                                )}
                              </strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {trackerTab === "timeline" && (
                <div className="tab-pane active">
                  <div
                    className="order-timeline"
                    id="timeline-steps-container"
                  >
                    {buildTimeline(trackerOrder).map((step, i) => (
                      <div
                        key={i}
                        className={`timeline-item ${step.status}`}
                      >
                        <div className="timeline-dot-container">
                          <div className="timeline-dot" />
                        </div>
                        <div className="timeline-content">
                          <h4 className="timeline-title">{step.title}</h4>
                          {step.date && (
                            <p className="timeline-date">{step.date}</p>
                          )}
                          {step.detail && (
                            <p className="timeline-detail">{step.detail}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trackerTab === "communication" && (
                <div className="tab-pane active">
                  <h4>Messages</h4>
                  <p className="btm-muted">
                    Message {trackerOrder.buyer?.name || "the client"} about
                    this order.
                  </p>
                  <button
                    type="button"
                    className="btm-btn btm-btn-dark"
                    onClick={() => contactClient(trackerOrder)}
                  >
                    Open messages
                  </button>
                </div>
              )}

              {trackerTab === "files" && (
                <div className="tab-pane active">
                  <h4>Delivery files</h4>
                  {trackerOrder.deliveryNote && (
                    <p className="btm-delivery-note">
                      <strong>Note:</strong> {trackerOrder.deliveryNote}
                    </p>
                  )}
                  {(trackerOrder.deliveryFiles || []).length === 0 ? (
                    <p className="btm-muted">
                      No delivery files submitted yet.
                    </p>
                  ) : (
                    <ul className="btm-file-list">
                      {(trackerOrder.deliveryFiles || []).map((f, i) => {
                        const isStr = typeof f === "string";
                        const name = isStr
                          ? f.split("/").pop() || `File ${i + 1}`
                          : f.name || `File ${i + 1}`;
                        const href = isStr
                          ? f
                          : f.url || f.previewUrl || null;
                        return (
                          <li key={i}>
                            <i className="fas fa-file-download" />{" "}
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {name}
                              </a>
                            ) : (
                              name
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {trackerTab === "invoice" && (
                <div className="tab-pane active">
                  <h4>Invoice</h4>
                  <p className="btm-muted">
                    Buyer total: {formatMoney(trackerOrder.grandTotal)}
                  </p>
                  <p className="btm-muted">
                    Your payout:{" "}
                    {formatMoney(
                      trackerOrder.sellerEarnings ?? trackerOrder.amount
                    )}
                  </p>
                  <button
                    type="button"
                    className="btm-btn btm-btn-dark"
                    onClick={handleInvoice}
                  >
                    Download invoice
                  </button>
                </div>
              )}
            </div>

            <div className="btm-footer">
              <div className="btm-footer-actions">
                {(() => {
                  const ui = orderUiStatus(trackerOrder);
                  const canDeliverApi =
                    ui === "in-progress" || ui === "revision";
                  const canRemind = ui === "pending";
                  const canExtend = ui === "in-progress";
                  return (
                    <>
                      <button
                        type="button"
                        className="btm-btn btm-btn-green"
                        disabled={actionBusy || !canDeliverApi}
                        onClick={handleDeliver}
                      >
                        Submit delivery
                      </button>
                      <button
                        type="button"
                        className="btm-btn btm-btn-dark"
                        disabled={actionBusy || !canExtend}
                        onClick={handleExtend}
                      >
                        Request extension
                      </button>
                      <button
                        type="button"
                        className="btm-btn btm-btn-outline"
                        disabled={actionBusy || !canRemind}
                        onClick={handleRemind}
                      >
                        Send reminder
                      </button>
                      <button
                        type="button"
                        className="btm-btn btm-btn-outline"
                        onClick={() => contactClient(trackerOrder)}
                      >
                        Message buyer
                      </button>
                    </>
                  );
                })()}
                <Link
                  href={`/orders/${trackerOrder._id}`}
                  className="btm-footer-link"
                >
                  Open full order details →
                </Link>
              </div>
              <p className="btm-footer-caption">
                After you deliver, the buyer can accept, request revision, or
                open a dispute. Completing the order credits your available
                balance.
              </p>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </>
  );
}
