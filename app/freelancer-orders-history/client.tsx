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
  deliveryFiles?: string[];
  basePackagePrice?: number;
  subtotal?: number;
  sellerPlatformFee?: number;
  sellerEarnings?: number;
  grandTotal?: number;
  requirements?: string;
};

type UiStatus =
  | "in-progress"
  | "delivered"
  | "completed"
  | "canceled"
  | "disputed"
  | "pending"
  | "revision";

const PAGE_SIZE = 10;

function mapStatus(raw: string): UiStatus {
  const s = (raw || "").toLowerCase();
  if (s.includes("complete")) return "completed";
  if (s.includes("cancel")) return "canceled";
  if (s.includes("disput")) return "disputed";
  if (s.includes("revision")) return "revision";
  if (s === "pending") return "pending";
  if (s.includes("deliver") && !s.includes("escrow")) return "delivered";
  if (s === "in_escrow" || s.includes("progress") || s === "active")
    return "in-progress";
  return "pending";
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

function showToast(msg: string, type: "success" | "removed" | "info" = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon =
    type === "removed"
      ? "fa-exclamation-triangle"
      : type === "info"
        ? "fa-info-circle"
        : "fa-check-circle";
  el.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function buildTimeline(order: OrderRow) {
  const ui = mapStatus(order.status);
  const steps: { title: string; date?: string; status: string; detail?: string }[] =
    [
      {
        title: "Order Placed & Confirmed",
        date: formatDate(order.createdAt),
        status: "completed",
      },
    ];

  if (ui === "canceled") {
    steps.push({
      title: "Order Canceled",
      date: formatDate(order.updatedAt),
      status: "canceled",
      detail: "This order was cancelled.",
    });
    return steps;
  }

  steps.push({
    title: "Work in progress",
    date:
      ui === "pending"
        ? undefined
        : formatDate(order.updatedAt || order.createdAt),
    status:
      ui === "pending"
        ? "pending"
        : ui === "in-progress" || ui === "revision"
          ? "active"
          : "completed",
    detail:
      ui === "revision"
        ? "Revision requested by buyer."
        : ui === "pending"
          ? "Waiting on requirements / start."
          : undefined,
  });

  if (order.deliveredAt || ui === "delivered" || ui === "completed") {
    steps.push({
      title: "Delivery submitted",
      date: formatDate(order.deliveredAt || order.updatedAt),
      status: ui === "completed" ? "completed" : "active",
      detail: order.deliveryNote || undefined,
    });
  } else {
    steps.push({
      title: "Final delivery",
      status: "pending",
    });
  }

  if (ui === "completed") {
    steps.push({
      title: "Completed & closed",
      date: formatDate(order.updatedAt),
      status: "completed",
    });
  } else {
    steps.push({
      title: "Closeout",
      status: "pending",
    });
  }

  return steps;
}

export default function FreelancerOrdersHistoryClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);

  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerOrder, setTrackerOrder] = useState<OrderRow | null>(null);
  const [trackerTab, setTrackerTab] = useState<
    "summary" | "timeline" | "communication" | "files" | "invoice"
  >("summary");

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
      const res = await fetch("/api/orders/mine?limit=200", {
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
    } catch {
      setOrders([]);
      showToast("Network error loading history", "removed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const ui = mapStatus(o.status);
      const name = (o.buyer?.name || "").toLowerCase();
      const id = (o.orderNumber || o._id || "").toLowerCase();
      const svc = (o.packageName || o.service?.title || "").toLowerCase();
      const matchQ = !q || name.includes(q) || id.includes(q) || svc.includes(q);
      let matchS = true;
      if (statusFilter === "in-progress") {
        matchS = ui === "in-progress" || ui === "pending" || ui === "revision";
      } else if (statusFilter === "delivered") {
        matchS = ui === "delivered";
      } else if (statusFilter === "completed") {
        matchS = ui === "completed";
      } else if (statusFilter === "canceled") {
        matchS = ui === "canceled";
      } else if (statusFilter === "disputed") {
        matchS = ui === "disputed";
      }
      return matchQ && matchS;
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
  }, [orders, search, statusFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    let completed = 0;
    let totalEarned = 0;
    let pendingPayouts = 0;
    orders.forEach((o) => {
      const ui = mapStatus(o.status);
      const amt = Number(o.amount) || 0;
      if (ui === "completed") {
        completed += 1;
        totalEarned += amt;
      }
      if (ui === "in-progress" || ui === "delivered" || ui === "revision") {
        pendingPayouts += amt;
      }
    });
    return { completed, totalEarned, pendingPayouts, rating: "—" };
  }, [orders]);

  const openTracker = (order: OrderRow) => {
    setTrackerOrder(order);
    setTrackerTab("summary");
    setTrackerOpen(true);
  };

  const closeTracker = () => {
    setTrackerOpen(false);
    setTrackerOrder(null);
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

  const actionLabel = (ui: UiStatus) => {
    if (ui === "in-progress" || ui === "delivered" || ui === "revision" || ui === "pending") {
      return { text: "Manage Order", icon: "fas fa-cogs", manage: true };
    }
    if (ui === "completed") {
      return { text: "View Record", icon: "fas fa-receipt", manage: false };
    }
    return { text: "View Details", icon: "fas fa-eye", manage: false };
  };

  return (
    <>
      <div className="orders-history-page">
      <div className="page-container">
        <h1 className="page-title">
          <i className="fas fa-history" /> Order History
        </h1>
        <p className="page-subtitle">
          A comprehensive record of all your service transactions, active and
          completed.
        </p>

        <div className="order-summary-overview" id="freelancer-overview-cards">
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
              <p className="card-value">{formatMoney(stats.pendingPayouts)}</p>
            </div>
            <div className="card-label-section">
              <i className="fas fa-hourglass-half" /> Pending Payouts
            </div>
          </div>

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
        </div>

        <div className="order-list-wrapper">
          <table className="order-table">
            <thead>
              <tr>
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
                  <td colSpan={8} style={{ textAlign: "center", padding: 30 }}>
                    Loading history…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="empty-state"
                    style={{ textAlign: "center", padding: 30 }}
                  >
                    No orders match your current filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((order) => {
                  const ui = mapStatus(order.status);
                  const oid =
                    order.orderNumber || `#${String(order._id).slice(-6)}`;
                  const act = actionLabel(ui);
                  return (
                    <tr key={order._id} data-order-id={order._id}>
                      <td>
                        <button
                          type="button"
                          className="clickable-id"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => openTracker(order)}
                          title="Quick View Order Progress"
                        >
                          {oid}
                        </button>
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
                        <span className="clickable-client">
                          <Image
                            src={
                              order.buyer?.avatar || "/default-avatar.png"
                            }
                            alt={order.buyer?.name || "Client"}
                            width={30}
                            height={30}
                            className="client-avatar"
                            unoptimized
                          />
                          {order.buyer?.name || "Client"}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <i
                          className="fas fa-calendar-alt"
                          style={{ marginRight: 5, color: "#34495e" }}
                        />
                        {formatDate(order.dueAt)}
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: "var(--success-color)",
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
                        {act.manage ? (
                          <Link
                            href={`/orders/${order._id}`}
                            className="btn-action btn-dark-gray btn-track-details"
                            style={{ textDecoration: "none" }}
                          >
                            <i className={act.icon} /> {act.text}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="btn-action btn-dark-gray btn-track-details"
                            onClick={() => openTracker(order)}
                          >
                            <i className={act.icon} /> {act.text}
                          </button>
                        )}
                      </td>
                    </tr>
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
            Page {page} of {totalPages}
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

      {/* Order tracker modal */}
      <div
        className={`f-modal oh-modal${trackerOpen ? "" : " hidden"}`}
        id="order-tracker-modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeTracker();
        }}
      >
        {trackerOrder && (
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2 className="modal-title">
                <i className="fas fa-compass" /> Order Tracker{" "}
                <span id="tracker-order-id" className="text-secondary">
                  {trackerOrder.orderNumber ||
                    `#${String(trackerOrder._id).slice(-6)}`}
                </span>
              </h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={closeTracker}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="tracker-tabs-container">
                <div className="tracker-tabs">
                  {(
                    [
                      ["summary", "fa-info-circle", "Summary"],
                      ["timeline", "fa-stream", "Progress Tracker"],
                      ["communication", "fa-comments", "Messages"],
                      ["files", "fa-box-open", "Delivery & Files"],
                      ["invoice", "fa-file-invoice-dollar", "Invoice"],
                    ] as const
                  ).map(([key, icon, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`tracker-tab-btn${
                        trackerTab === key ? " active" : ""
                      }`}
                      data-tab={key}
                      onClick={() => setTrackerTab(key)}
                    >
                      <i className={`fas ${icon}`} /> {label}
                    </button>
                  ))}
                </div>

                <div id="tracker-tab-content">
                  {trackerTab === "summary" && (
                    <div className="tracker-tab-pane active" id="tab-summary">
                      <div className="tracker-summary-grid">
                        <div id="summary-order-details">
                          <h4 className="section-title">
                            <i className="fas fa-clipboard-list" /> Order Summary
                          </h4>
                          <dl
                            className="dl-stripped-table"
                            id="summary-details-table"
                          >
                            <dt>Service:</dt>
                            <dd>
                              {trackerOrder.packageName ||
                                trackerOrder.service?.title ||
                                "—"}
                            </dd>
                            <dt>Client:</dt>
                            <dd>{trackerOrder.buyer?.name || "—"}</dd>
                            <dt>Date Placed:</dt>
                            <dd>{formatDate(trackerOrder.createdAt)}</dd>
                            <dt>Due Date:</dt>
                            <dd>{formatDate(trackerOrder.dueAt)}</dd>
                            <dt>Status:</dt>
                            <dd>
                              <span
                                className={`status-badge status-${mapStatus(
                                  trackerOrder.status
                                )}`}
                              >
                                {mapStatus(trackerOrder.status)
                                  .replace("-", " ")
                                  .toUpperCase()}
                              </span>
                            </dd>
                          </dl>
                        </div>
                        <div id="summary-price-breakdown">
                          <h4 className="section-title">
                            <i className="fas fa-dollar-sign" /> Payout Details
                          </h4>
                          <dl
                            className="dl-stripped-table"
                            id="payout-details-table"
                          >
                            <dt>Service Price:</dt>
                            <dd>
                              {formatMoney(
                                trackerOrder.subtotal ??
                                  trackerOrder.basePackagePrice
                              )}
                            </dd>
                            <dt className="total-row">Platform Fee:</dt>
                            <dd className="total-row">
                              −
                              {formatMoney(
                                trackerOrder.sellerPlatformFee
                              ).replace("$", "")}
                            </dd>
                            <dt className="payout-row">Net Payout:</dt>
                            <dd className="payout-row">
                              {formatMoney(
                                trackerOrder.sellerEarnings ??
                                  trackerOrder.amount
                              )}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  )}

                  {trackerTab === "timeline" && (
                    <div className="tracker-tab-pane" id="tab-timeline">
                      <h5 className="tab-pane-title">Order Milestones</h5>
                      <div id="timeline-steps-container">
                        {buildTimeline(trackerOrder).map((step, i) => (
                          <div
                            key={i}
                            className={`timeline-item ${step.status}`}
                          >
                            <div className="timeline-dot-container">
                              <span className="timeline-dot" />
                            </div>
                            <div className="timeline-content">
                              <h5 style={{ marginTop: 0 }}>{step.title}</h5>
                              <p
                                className="text-secondary"
                                style={{ fontSize: "0.9em", margin: "5px 0" }}
                              >
                                {step.date ? (
                                  <strong>{step.date}</strong>
                                ) : (
                                  "Expected Soon"
                                )}
                              </p>
                              {step.detail ? (
                                <p style={{ margin: 0, color: "#777" }}>
                                  {step.detail}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trackerTab === "communication" && (
                    <div className="tracker-tab-pane" id="tab-communication">
                      <h5 className="tab-pane-title">Recent Chat History</h5>
                      <div className="chat-window">
                        Open the full conversation with{" "}
                        {trackerOrder.buyer?.name || "the client"} for this
                        order.
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            className="btn-action btn-oh-primary"
                            onClick={() => contactClient(trackerOrder)}
                          >
                            <i className="fas fa-comment-dots" /> Open Messages
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {trackerTab === "files" && (
                    <div className="tracker-tab-pane" id="tab-files">
                      <h5 className="tab-pane-title">Delivery & Revisions</h5>
                      <ul id="delivery-files-list">
                        {trackerOrder.deliveryNote ? (
                          <li>
                            <strong>Note:</strong> {trackerOrder.deliveryNote}
                          </li>
                        ) : null}
                        {(trackerOrder.deliveryFiles || []).length > 0 ? (
                          (trackerOrder.deliveryFiles || []).map((f, i) => (
                            <li key={i}>
                              <i className="fas fa-file-archive" />{" "}
                              <a href={f} target="_blank" rel="noreferrer">
                                {f.split("/").pop() || "File"}
                              </a>
                            </li>
                          ))
                        ) : (
                          <li>No final delivery files submitted yet.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {trackerTab === "invoice" && (
                    <div className="tracker-tab-pane" id="tab-invoice">
                      <h5 className="tab-pane-title">Invoice Record</h5>
                      <p>
                        Invoice details for Order{" "}
                        {trackerOrder.orderNumber ||
                          `#${String(trackerOrder._id).slice(-6)}`}
                        .
                      </p>
                      <p>
                        Total paid (buyer):{" "}
                        {formatMoney(trackerOrder.grandTotal)}
                      </p>
                      <p>
                        Your payout:{" "}
                        {formatMoney(
                          trackerOrder.sellerEarnings ?? trackerOrder.amount
                        )}
                      </p>
                      <button
                        type="button"
                        className="btn-action btn-secondary"
                        onClick={() =>
                          showToast("PDF invoice export coming soon", "info")
                        }
                      >
                        <i className="fas fa-download" /> Download Invoice (PDF)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="tracker-footer-actions">
              <button
                type="button"
                className="btn-action btn-oh-primary btn-contact"
                id="tracker-contact-client"
                onClick={() => contactClient(trackerOrder)}
              >
                <i className="fas fa-comment-dots" /> Contact Client
              </button>
              <Link
                href={`/orders/${trackerOrder._id}`}
                className="btn-action btn-dark-gray"
                id="full-management-link"
              >
                <i className="fas fa-external-link-alt" /> Go to Full Management
                Page
              </Link>
            </div>
          </div>
        )}
      </div>

      <div id="toast-container" />
    </>
  );
}
