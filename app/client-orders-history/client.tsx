// app/client-orders-history/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/client-orders-history.css";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type SellerInfo = {
  _id?: string | null;
  name?: string;
  avatar?: string;
  username?: string | null;
};

type ServiceInfo = {
  _id?: string;
  title?: string;
  category?: string;
  image?: string | null;
} | null;

export type ClientOrder = {
  _id: string;
  status: string;
  packageName?: string;
  amount?: number;
  subtotal?: number | null;
  basePackagePrice?: number | null;
  grandTotal?: number | null;
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  completedAt?: string | null;
  orderNumber?: string | null;
  invoiceNumber?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  refundAmount?: number | null;
  buyerRating?: number | null;
  buyerReview?: string;
  ratedAt?: string | null;
  requirements?: string;
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
  selectedAddons?: { title?: string; price?: number }[];
  disputeReason?: string | null;
  seller?: SellerInfo;
  service?: ServiceInfo;
};

type UiStatus =
  | "pending"
  | "in-progress"
  | "delivered"
  | "completed"
  | "canceled"
  | "disputed"
  | "revision";

type ModalTab =
  | "summary"
  | "tracker"
  | "communication"
  | "files"
  | "invoice";

const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) h.Authorization = `Bearer ${token}`;
  }
  return h;
}

function mapStatus(raw: string, deliveredAt?: string | null): UiStatus {
  const s = (raw || "").toLowerCase();
  if (s.includes("disput")) return "disputed";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("complete")) return "completed";
  if (s.includes("revision")) return "revision";
  if (s.includes("deliver") && !s.includes("escrow")) return "delivered";
  // Backend often keeps in_escrow after delivery; treat as delivered for buyer UX
  if (deliveredAt && (s === "in_escrow" || s.includes("progress"))) {
    return "delivered";
  }
  if (s === "pending") return "pending";
  if (s === "in_escrow" || s.includes("progress") || s === "active")
    return "in-progress";
  return "pending";
}

function orderUiStatus(o: { status: string; deliveredAt?: string | null }): UiStatus {
  return mapStatus(o.status, o.deliveredAt);
}

function statusLabel(ui: UiStatus): string {
  const map: Record<UiStatus, string> = {
    pending: "Pending",
    "in-progress": "In Progress",
    delivered: "Delivered",
    completed: "Completed",
    canceled: "Canceled",
    disputed: "Disputed",
    revision: "Revision",
  };
  return map[ui] || ui;
}

function statusClass(ui: UiStatus): string {
  if (ui === "in-progress") return "status-in-progress";
  if (ui === "revision") return "status-in-progress";
  return `status-${ui}`;
}

function formatMoney(n?: number | null) {
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

function orderDisplayId(o: ClientOrder) {
  if (o.orderNumber) return o.orderNumber;
  return `#${String(o._id).slice(-6).toUpperCase()}`;
}

function showToast(
  message: string,
  type: "success" | "removed" | "info" = "success"
) {
  const container = document.getElementById("toast-container");
  if (!container) {
    // Fallback: create container
    const c = document.createElement("div");
    c.id = "toast-container";
    document.body.appendChild(c);
    return showToast(message, type);
  }
  const el = document.createElement("div");
  el.className = `toast ${type === "removed" ? "removed" : ""}`;
  el.innerHTML = `<i class="fas ${
    type === "removed" ? "fa-exclamation-circle" : "fa-check-circle"
  }"></i><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function buildTimeline(order: ClientOrder) {
  const ui = orderUiStatus(order);
  const steps: {
    title: string;
    date?: string;
    detail?: string;
    state: "completed" | "active" | "pending";
  }[] = [
    {
      title: "Order placed & paid",
      date: formatDate(order.createdAt),
      state: "completed",
    },
    {
      title: "Freelancer working",
      detail: "Your order is in progress.",
      state:
        ui === "pending"
          ? "pending"
          : ui === "in-progress" || ui === "revision"
            ? "active"
            : "completed",
    },
    {
      title: "Delivered for review",
      date: order.deliveredAt ? formatDate(order.deliveredAt) : undefined,
      detail: order.deliveryNote || undefined,
      state:
        ui === "delivered"
          ? "active"
          : ui === "completed" || ui === "disputed"
            ? "completed"
            : "pending",
    },
    {
      title:
        ui === "disputed"
          ? "Dispute opened"
          : ui === "canceled"
            ? "Order canceled"
            : "Completed",
      date: order.completedAt ? formatDate(order.completedAt) : undefined,
      state:
        ui === "completed" || ui === "disputed" || ui === "canceled"
          ? "completed"
          : "pending",
    },
  ];
  return steps;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ClientOrdersHistoryClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);

  // Modal
  const [activeOrder, setActiveOrder] = useState<ClientOrder | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("summary");
  const [actionBusy, setActionBusy] = useState(false);
  const [rateValue, setRateValue] = useState(5);
  const [rateReview, setRateReview] = useState("");

  /* ---------- load ---------- */
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/?auth=login");
        return;
      }
      const res = await fetch("/api/orders/purchases?limit=100", {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.msg || `HTTP ${res.status}`);
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  /* ---------- categories from data ---------- */
  const categories = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const c = o.service?.category;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [orders]);

  /* ---------- filter + sort ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const ui = orderUiStatus(o);
      if (statusFilter !== "all" && ui !== statusFilter) return false;
      if (
        categoryFilter !== "all" &&
        (o.service?.category || "").toLowerCase() !== categoryFilter.toLowerCase()
      )
        return false;

      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86400000 - 1;
        const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        if (created > to) return false;
      }

      if (!q) return true;
      const hay = [
        orderDisplayId(o),
        o._id,
        o.service?.title,
        o.packageName,
        o.seller?.name,
        o.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "date-asc")
        return (
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
        );
      if (sortBy === "price-desc")
        return (b.grandTotal ?? b.amount ?? 0) - (a.grandTotal ?? a.amount ?? 0);
      if (sortBy === "price-asc")
        return (a.grandTotal ?? a.amount ?? 0) - (b.grandTotal ?? b.amount ?? 0);
      if (sortBy === "status-alpha")
        return orderUiStatus(a).localeCompare(orderUiStatus(b));
      // date-desc default
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return list;
  }, [orders, search, statusFilter, categoryFilter, dateFrom, dateTo, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, dateFrom, dateTo, sortBy]);

  /* ---------- overview stats (all purchases, not filtered) ---------- */
  const stats = useMemo(() => {
    const total = orders.length;
    let completed = 0;
    let spent = 0;
    orders.forEach((o) => {
      const ui = orderUiStatus(o);
      if (ui === "completed") {
        completed += 1;
        spent += o.grandTotal ?? o.amount ?? 0;
      }
    });
    const successRate = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, spent, successRate };
  }, [orders]);

  /* ---------- actions ---------- */
  const openModal = (order: ClientOrder, tab: ModalTab = "summary") => {
    setActiveOrder(order);
    setModalTab(tab);
    setRateValue(order.buyerRating || 5);
    setRateReview(order.buyerReview || "");
  };

  const closeModal = () => {
    setActiveOrder(null);
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
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        showToast(
          data.message || data.msg || `Action failed (HTTP ${res.status})`,
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

  const handleComplete = async () => {
    if (!activeOrder) return;
    const ok = await postOrderAction(activeOrder._id, "complete");
    if (ok) {
      setActiveOrder((prev) =>
        prev ? { ...prev, status: "completed" } : prev
      );
    }
  };

  const handleDispute = async () => {
    if (!activeOrder) return;
    const reason = window.prompt("Briefly describe the issue for the dispute:");
    if (!reason || !reason.trim()) return;
    const ok = await postOrderAction(activeOrder._id, "dispute", {
      reason: reason.trim(),
    });
    if (ok) {
      setActiveOrder((prev) =>
        prev ? { ...prev, status: "disputed", disputeReason: reason.trim() } : prev
      );
    }
  };
  const handleRevision = async () => {
    if (!activeOrder) return;
    const note = window.prompt(
      "What should the freelancer change? (optional but recommended)"
    );
    if (note === null) return; // dismissed
    const ok = await postOrderAction(activeOrder._id, "revision", {
      note: (note || "").trim(),
    });
    if (ok) {
      setActiveOrder((prev) =>
        prev ? { ...prev, status: "revision_requested" } : prev
      );
    }
  };

  const handleCancel = async () => {
    if (!activeOrder) return;
    if (activeOrder.deliveredAt) {
      showToast(
        "Delivery already submitted — use Revision or Dispute instead of cancel.",
        "removed"
      );
      return;
    }
    const okConfirm = window.confirm(
      "Cancel this order? Refunds follow platform policy. This cannot be undone from here."
    );
    if (!okConfirm) return;
    const reason = window.prompt("Optional reason for cancellation:") || "";
    const ok = await postOrderAction(activeOrder._id, "cancel", {
      reason: reason.trim(),
    });
    if (ok) {
      setActiveOrder((prev) =>
        prev ? { ...prev, status: "cancelled" } : prev
      );
    }
  };


  const handleRate = async () => {
    if (!activeOrder) return;
    const ok = await postOrderAction(activeOrder._id, "rate", {
      rating: rateValue,
      review: rateReview.trim(),
    });
    if (ok) {
      setActiveOrder((prev) =>
        prev
          ? {
              ...prev,
              buyerRating: rateValue,
              buyerReview: rateReview.trim(),
              ratedAt: new Date().toISOString(),
            }
          : prev
      );
    }
  };

  const handleContact = async (order: ClientOrder) => {
    const sellerId = order.seller?._id;
    if (!sellerId) {
      showToast("Freelancer profile missing", "removed");
      return;
    }
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientId: sellerId,
          orderId: order._id,
          initialMessage: `Hi! About order ${orderDisplayId(order)}…`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.conversationId) {
        router.push(`/messages?c=${data.conversationId}`);
      } else {
        router.push("/messages");
      }
    } catch {
      router.push("/messages");
    }
  };

  const handleReorder = (order: ClientOrder) => {
    const sid = order.service?._id;
    if (sid) {
      router.push(`/services/details/${sid}`);
    } else {
      showToast("Service no longer available", "removed");
    }
  };

  const handleDownloadInvoice = (order: ClientOrder) => {
    const ui = orderUiStatus(order);
    if (ui !== "completed" && !order.invoiceNumber) {
      showToast("Invoice is available after the order is completed", "info");
      return;
    }
    window.open(`/api/orders/${order._id}/invoice`, "_blank");
  };

  const exportCsv = () => {
    const header = [
      "Order ID",
      "Service",
      "Freelancer",
      "Date",
      "Due",
      "Total",
      "Status",
      "Payment",
    ];
    const rows = filtered.map((o) => [
      orderDisplayId(o),
      o.service?.title || o.packageName || "",
      o.seller?.name || "",
      formatDate(o.createdAt),
      formatDate(o.dueAt),
      String(o.grandTotal ?? o.amount ?? ""),
      orderUiStatus(o),
      o.paymentStatus || o.paymentMethod || "",
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `client-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionButton = (order: ClientOrder) => {
    const ui = orderUiStatus(order);
    let label = "Details";
    let tab: ModalTab = "summary";
    if (
      ui === "in-progress" ||
      ui === "delivered" ||
      ui === "disputed" ||
      ui === "revision"
    ) {
      label = "Track";
      tab = "tracker";
    } else if (ui === "completed") {
      label = order.buyerRating ? "Details" : "Review";
      tab = order.buyerRating ? "summary" : "tracker";
    }
    return (
      <button
        type="button"
        className="btn-action btn-track-details"
        onClick={() => openModal(order, tab)}
      >
        {label}
      </button>
    );
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="order-management-page-container">
        <h2 className="page-title">📦 Order History & Tracker</h2>
        <p style={{ color: "#718096" }}>Loading your purchases…</p>
      </div>
    );
  }

  return (
    <div className="order-management-page-container">
      <h2 className="page-title">📦 Order History & Tracker</h2>

      {error && (
        <div className="alert-box" style={{ marginBottom: 16 }}>
          {error}{" "}
          <button type="button" className="btn-action" onClick={loadOrders}>
            Retry
          </button>
        </div>
      )}

      {/* Overview cards */}
      <div className="order-summary-overview" id="order-overview-cards">
        <div className="summary-card total-orders-card">
          <div className="card-content-top">
            <span className="card-value">{stats.total}</span>
            <div className="graph-placeholder" />
          </div>
          <div className="card-content-bottom">
            <i className="fas fa-list-alt card-icon" />
            <span className="card-label">Total Orders</span>
          </div>
        </div>
        <div className="summary-card completed-card">
          <div className="card-content-top">
            <span className="card-value">{formatMoney(stats.spent)}</span>
            <div className="graph-placeholder" />
          </div>
          <div className="card-content-bottom">
            <i className="fas fa-wallet card-icon" />
            <span className="card-label">Total Spent</span>
          </div>
        </div>
        <div className="summary-card spending-card">
          <div className="card-content-top">
            <span className="card-value">{stats.successRate}%</span>
            <div className="graph-placeholder" />
          </div>
          <div className="card-content-bottom">
            <i className="fas fa-trophy card-icon" />
            <span className="card-label">Success Rate</span>
          </div>
        </div>
        <div className="summary-card success-rate-card">
          <div className="card-content-top">
            <span className="card-value">{stats.completed}</span>
            <div className="graph-placeholder" />
          </div>
          <div className="card-content-bottom">
            <i className="fas fa-check-circle card-icon" />
            <span className="card-label">Completed Orders</span>
          </div>
        </div>
      </div>
      <hr />

      {/* Filters */}
      <div className="order-filter-bar">
        <div className="filter-group">
          <input
            type="text"
            id="order-search"
            placeholder="Order ID, Service, Freelancer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <i className="fas fa-search search-icon-order" />
        </div>
        <select
          id="status-filter"
          className="order-select-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="revision">Revision</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
          <option value="disputed">Disputed</option>
        </select>
        <select
          id="category-filter"
          className="order-select-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="filter-group-date">
          <label htmlFor="date-range-start">Date From:</label>
          <input
            type="date"
            id="date-range-start"
            className="order-input-filter"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="filter-group-date">
          <label htmlFor="date-range-end">Date To:</label>
          <input
            type="date"
            id="date-range-end"
            className="order-input-filter"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <div className="order-sort-bar">
        <select
          id="sort-by"
          className="order-select-filter"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date-desc">Date Placed (Newest)</option>
          <option value="date-asc">Date Placed (Oldest)</option>
          <option value="price-desc">Price (High to Low)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="status-alpha">Status (A–Z)</option>
        </select>
        <button
          type="button"
          id="export-history-btn"
          className="btn-action"
          onClick={exportCsv}
          title="Export filtered list as CSV"
        >
          <i className="fas fa-file-export" /> Export
        </button>
      </div>
      <hr />

      {/* Table */}
      <div className="order-list-wrapper">
        <table className="order-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Service Name</th>
              <th>Freelancer</th>
              <th>Date Placed</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "#718096" }}>
                  No orders found matching your criteria.
                </td>
              </tr>
            ) : (
              pageRows.map((order) => {
                const ui = orderUiStatus(order);
                const sellerId = order.seller?._id;
                const serviceId = order.service?._id;
                return (
                  <tr key={order._id} data-order-id={order._id}>
                    <td>
                      <button
                        type="button"
                        className="clickable-order-id"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                        }}
                        onClick={() => {
                          const ui = orderUiStatus(order);
                          openModal(
                            order,
                            ui === "in-progress" ||
                              ui === "delivered" ||
                              ui === "revision" ||
                              ui === "disputed"
                              ? "tracker"
                              : "summary"
                          );
                        }}
                      >
                        {orderDisplayId(order)}
                      </button>
                    </td>
                    <td>
                      {serviceId ? (
                        <Link href={`/services/details/${serviceId}`}>
                          {order.service?.title || order.packageName || "Service"}
                        </Link>
                      ) : (
                        order.service?.title || order.packageName || "Service"
                      )}
                    </td>
                    <td>
                      {sellerId ? (
                        <Link
                          href={`/freelancer-profile?id=${sellerId}`}
                          className="freelancer-info"
                        >
                          <Image
                            src={order.seller?.avatar || "/default-avatar.png"}
                            alt=""
                            width={30}
                            height={30}
                            className="freelancer-avatar"
                            unoptimized
                          />
                          <span>{order.seller?.name || "Freelancer"}</span>
                        </Link>
                      ) : (
                        <span className="freelancer-info">
                          {order.seller?.name || "Freelancer"}
                        </span>
                      )}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{formatDate(order.dueAt)}</td>
                    <td>{formatMoney(order.grandTotal ?? order.amount)}</td>
                    <td>
                      <span
                        className={`payment-status payment-${(
                          order.paymentStatus || "paid"
                        ).toLowerCase()}`}
                      >
                        {(order.paymentStatus || "paid").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(ui)}`}>
                        {statusLabel(ui)}
                      </span>
                    </td>
                    <td>{actionButton(order)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          id="prev-page"
          className="btn-action"
          disabled={pageSafe <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          « Previous
        </button>
        <span id="page-info">
          Page {pageSafe} of {totalPages}
        </span>
        <button
          type="button"
          id="next-page"
          className="btn-action"
          disabled={pageSafe >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next »
        </button>
      </div>

      {/* Tracker modal */}
      {activeOrder && (
        <div
          id="tracker-modal-backdrop"
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="modal-content detailed-order-modal-content buyer-tracker-modal">
            <button
              type="button"
              className="close-modal-btn tracker-close-btn"
              onClick={closeModal}
              aria-label="Close"
            >
              ×
            </button>
            <div className="modal-header">
              <h3 id="modal-order-title">
                Order <span>{orderDisplayId(activeOrder)}</span>:{" "}
                <span>
                  {activeOrder.service?.title || activeOrder.packageName || "Service"}
                </span>
              </h3>
              <p className="due-date-info">
                Status:{" "}
                <span
                  className={`status-badge ${statusClass(
                    orderUiStatus(activeOrder)
                  )}`}
                >
                  {statusLabel(orderUiStatus(activeOrder))}
                </span>{" "}
                | Due: <span>{formatDate(activeOrder.dueAt)}</span>
              </p>
              <button
                type="button"
                id="reorder-btn"
                className="btn-action"
                onClick={() => handleReorder(activeOrder)}
              >
                <i className="fas fa-redo" /> Reorder
              </button>
            </div>

            <div className="modal-tabs">
              {(
                [
                  ["summary", "Summary", "fa-info-circle"],
                  ["tracker", "Progress Tracker", "fa-map-marker-alt"],
                  ["communication", "Messages", "fa-comments"],
                  ["files", "Delivery & Files", "fa-file-download"],
                  ["invoice", "Invoice", "fa-file-invoice-dollar"],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  className={`tab-button ${modalTab === id ? "active" : ""}`}
                  onClick={() => setModalTab(id)}
                >
                  <i className={`fas ${icon}`} /> {label}
                </button>
              ))}
            </div>

            <div id="modal-content-area" className="tab-content-container">
              {/* Summary */}
              {modalTab === "summary" && (
                <div className="tab-pane active" id="tab-summary">
                  <div className="summary-columns-container">
                    <div className="summary-column">
                      <h4>Order Summary</h4>
                      <table className="summary-table stripped-table">
                        <tbody>
                          <tr>
                            <th>
                              <i className="fas fa-user-tie" /> Freelancer
                            </th>
                            <td>
                              {activeOrder.seller?.name || "—"}{" "}
                              {activeOrder.seller?._id && (
                                <Link
                                  href={`/freelancer-profile?id=${activeOrder.seller._id}`}
                                  target="_blank"
                                >
                                  View Profile
                                </Link>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <th>
                              <i className="fas fa-box-open" /> Package
                            </th>
                            <td>{activeOrder.packageName || "—"}</td>
                          </tr>
                          <tr>
                            <th>
                              <i className="fas fa-clipboard-list" /> Requirements
                            </th>
                            <td id="summary-description">
                              {activeOrder.requirements || "—"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="summary-column">
                      <h4>Price Breakdown</h4>
                      <div id="summary-price-breakdown">
                        <table className="stripped-table price-breakdown-table">
                          <tbody>
                            <tr>
                              <th>Subtotal</th>
                              <td>
                                <strong>
                                  {formatMoney(
                                    activeOrder.subtotal ??
                                      activeOrder.basePackagePrice ??
                                      activeOrder.amount
                                  )}
                                </strong>
                              </td>
                            </tr>
                            {(activeOrder.selectedAddons || []).map((a, i) => (
                              <tr key={i}>
                                <th>{a.title || "Add-on"}</th>
                                <td>{formatMoney(a.price)}</td>
                              </tr>
                            ))}
                            <tr className="total-row">
                              <th>Total Paid</th>
                              <td>
                                <strong style={{ color: "#2c3e50" }}>
                                  {formatMoney(
                                    activeOrder.grandTotal ?? activeOrder.amount
                                  )}
                                </strong>
                              </td>
                            </tr>
                            <tr>
                              <th>Payment Method</th>
                              <td>{activeOrder.paymentMethod || "—"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {orderUiStatus(activeOrder) === "disputed" && (
                    <div id="dispute-status-alert" className="alert-box">
                      <i className="fas fa-exclamation-triangle" /> This order is
                      in dispute
                      {activeOrder.disputeReason
                        ? `: ${activeOrder.disputeReason}`
                        : "."}{" "}
                      <Link href={`/orders/${activeOrder._id}`}>
                        Open full order page
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Tracker */}
              {modalTab === "tracker" && (
                <div className="tab-pane active" id="tab-tracker">
                  <div
                    className="order-timeline"
                    id="timeline-steps-container"
                  >
                    {buildTimeline(activeOrder).map((step, idx) => (
                      <div
                        key={idx}
                        className={`timeline-item ${step.state}`}
                      >
                        <div className="timeline-dot-container">
                          <div className="timeline-dot" />
                        </div>
                        <div className="timeline-content">
                          <h4 className="timeline-title">{step.title}</h4>
                          {step.date && (
                            <p className="timeline-date">
                              <i className="fas fa-calendar-alt" /> {step.date}
                            </p>
                          )}
                          {step.detail && (
                            <p className="timeline-detail">{step.detail}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="tracker-action-area buyer-action-grid">
                    {(() => {
                      const ui = orderUiStatus(activeOrder);
                      const hasDelivery = !!activeOrder.deliveredAt;
                      const canRevise =
                        hasDelivery &&
                        (ui === "delivered" ||
                          ui === "in-progress" ||
                          ui === "revision");
                      const canComplete =
                        hasDelivery &&
                        ui !== "completed" &&
                        ui !== "canceled" &&
                        ui !== "disputed";
                      const canDispute =
                        ui !== "completed" &&
                        ui !== "canceled" &&
                        ui !== "disputed";
                      const canCancel =
                        !hasDelivery &&
                        ui !== "completed" &&
                        ui !== "canceled" &&
                        ui !== "disputed";
                      return (
                        <>
                          <button
                            type="button"
                            className="btn-action btn-buyer-primary"
                            disabled={actionBusy || !canRevise}
                            title={
                              canRevise
                                ? "Ask the freelancer to change the delivery"
                                : "Available after the freelancer delivers"
                            }
                            onClick={handleRevision}
                          >
                            <i className="fas fa-undo" /> Request Revision
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-buyer-success"
                            disabled={actionBusy || !canComplete}
                            title={
                              canComplete
                                ? "Accept delivery and close the order"
                                : "Available after delivery is submitted"
                            }
                            onClick={handleComplete}
                          >
                            <i className="fas fa-check" /> Mark As Complete
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-danger-text"
                            disabled={actionBusy || !canDispute}
                            title="Escalate if work is unsatisfactory"
                            onClick={handleDispute}
                          >
                            <i className="fas fa-gavel" /> Open Dispute
                          </button>
                          <button
                            type="button"
                            className="btn-action btn-danger-text"
                            disabled={actionBusy || !canCancel}
                            title={
                              canCancel
                                ? "Cancel before delivery is submitted"
                                : "After delivery, use Revision or Dispute"
                            }
                            onClick={handleCancel}
                          >
                            <i className="fas fa-times" /> Cancel Order
                          </button>
                          <Link
                            href={`/orders/${activeOrder._id}`}
                            className="btn-action btn-buyer-ghost"
                          >
                            <i className="fas fa-external-link-alt" /> Full order
                            page
                          </Link>
                        </>
                      );
                    })()}
                  </div>

                  {/* Rating after complete */}
                  {(orderUiStatus(activeOrder) === "completed" ||
                    orderUiStatus(activeOrder) === "delivered") && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #eee" }}>
                      <h4>Rate this order</h4>
                      {activeOrder.buyerRating != null && activeOrder.ratedAt ? (
                        <p>
                          You rated this <strong>{activeOrder.buyerRating}/5</strong>
                          {activeOrder.buyerReview
                            ? ` — “${activeOrder.buyerReview}”`
                            : ""}
                        </p>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setRateValue(n)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "1.4rem",
                                  color: n <= rateValue ? "#f59e0b" : "#cbd5e1",
                                }}
                                aria-label={`${n} stars`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={rateReview}
                            onChange={(e) => setRateReview(e.target.value)}
                            placeholder="Optional review…"
                            rows={3}
                            style={{
                              width: "100%",
                              padding: 10,
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              marginBottom: 8,
                            }}
                          />
                          <button
                            type="button"
                            className="btn-action"
                            disabled={actionBusy}
                            onClick={handleRate}
                          >
                            Submit rating
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              {modalTab === "communication" && (
                <div className="tab-pane active" id="tab-communication">
                  <h4>Communication</h4>
                  <p style={{ color: "#718096", marginBottom: 12 }}>
                    Continue the conversation in your messages inbox (order-linked
                    when available).
                  </p>
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => handleContact(activeOrder)}
                  >
                    <i className="fas fa-comments" /> Open Messages
                  </button>
                </div>
              )}

              {/* Files */}
              {modalTab === "files" && (
                <div className="tab-pane active" id="tab-files">
                  <h4>Delivery Files</h4>
                  {(() => {
                    const files = activeOrder.deliveryFiles || [];
                    const anyLocked = files.some(
                      (f) =>
                        typeof f !== "string" &&
                        (f.locked || !f.url || f.url === f.previewUrl)
                    );
                    const incomplete =
                      orderUiStatus(activeOrder) !== "completed";
                    return (
                      <>
                        {(incomplete || anyLocked) && files.length > 0 && (
                          <p
                            className="alert-box"
                            style={{ marginBottom: 12 }}
                          >
                            Preview files may remain watermarked until you mark
                            the order complete. Final downloads unlock after
                            completion.
                          </p>
                        )}
                        {files.length === 0 ? (
                          <p style={{ color: "#718096" }}>
                            No files have been delivered yet.
                          </p>
                        ) : (
                          <ul id="delivery-files-list">
                            {files.map((f, i) => {
                              const isStr = typeof f === "string";
                              const name = isStr
                                ? f.split("/").pop() || `File ${i + 1}`
                                : f.name || `File ${i + 1}`;
                              const href = isStr
                                ? f
                                : f.url || f.previewUrl || null;
                              const locked = !isStr && !!f.locked;
                              return (
                                <li key={i} style={{ marginBottom: 8 }}>
                                  <i className="fas fa-file-download" />{" "}
                                  {href ? (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {name}
                                      {locked ? " (preview)" : ""}
                                    </a>
                                  ) : (
                                    <span>
                                      {name} (locked until complete)
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                  {activeOrder.deliveryNote && (
                    <p style={{ marginTop: 12 }}>
                      <strong>Note:</strong> {activeOrder.deliveryNote}
                    </p>
                  )}
                </div>
              )}

              {/* Invoice */}
              {modalTab === "invoice" && (
                <div className="tab-pane active" id="tab-invoice">
                  <h4>Invoice & Payment</h4>
                  <button
                    type="button"
                    id="download-invoice-btn"
                    className="btn-action"
                    onClick={() => handleDownloadInvoice(activeOrder)}
                  >
                    <i className="fas fa-file-pdf" /> Download Invoice
                  </button>
                  <p style={{ marginTop: 12 }}>
                    Payment Method:{" "}
                    <span>{activeOrder.paymentMethod || "—"}</span>
                  </p>
                  <p>
                    Payment / order date:{" "}
                    <span>{formatDate(activeOrder.createdAt)}</span>
                  </p>
                  {activeOrder.invoiceNumber && (
                    <p>
                      Invoice #: <span>{activeOrder.invoiceNumber}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="btn-action btn-contact"
                onClick={() => handleContact(activeOrder)}
              >
                Contact Freelancer
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </div>
  );
}
