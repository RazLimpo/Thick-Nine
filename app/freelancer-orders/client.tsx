// app/freelancer-orders/client.tsx
// Global freelancer order management — all seller orders

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-orders.css";

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
  orderNumber?: string;
};

type ModalMode = "remind" | "deliver" | "extend" | "revision" | null;

function showToast(msg: string, type: "success" | "removed" | "info" = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon =
    type === "removed"
      ? "fa-exclamation-triangle"
      : type === "info"
        ? "fa-info-circle"
        : "fa-check-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatMoney(n?: number) {
  if (typeof n !== "number") return "—";
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

function formatCountdown(dueAt?: string | null) {
  if (!dueAt) return { text: "—", urgent: false };
  try {
    const due = new Date(dueAt).getTime();
    const now = Date.now();
    const ms = due - now;
    if (ms <= 0) return { text: "Overdue", urgent: true };
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days >= 1) return { text: `${days}d ${hours % 24}h`, urgent: days < 1 };
    return { text: `${hours}h left`, urgent: hours < 6 };
  } catch {
    return { text: "—", urgent: false };
  }
}

function statusClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("revision")) return "revision";
  if (s.includes("progress") || s === "in_escrow" || s === "active")
    return "in-progress";
  if (s.includes("complete") || s === "delivered") return "completed";
  if (s.includes("cancel")) return "cancelled";
  return "pending";
}

function statusLabel(status: string) {
  const s = (status || "").toLowerCase().replace(/_/g, " ");
  if (!s) return "Pending";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function primaryAction(status: string): {
  label: string;
  mode: ModalMode;
} {
  const s = (status || "").toLowerCase();
  if (
    s.includes("requirement") ||
    s === "pending" ||
    s.includes("wait")
  ) {
    return { label: "Remind Buyer", mode: "remind" };
  }
  if (s.includes("revision")) {
    return { label: "Submit Revision", mode: "revision" };
  }
  if (s.includes("progress") || s === "in_escrow" || s === "active") {
    return { label: "Deliver Work", mode: "deliver" };
  }
  return { label: "Manage", mode: null };
}

export default function FreelancerOrdersClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [extendDate, setExtendDate] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getAuthHeaders = (json = false): Record<string, string> => {
    const h: Record<string, string> = { Accept: "application/json" };
    if (json) h["Content-Type"] = "application/json";
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Prefer seller-wide list; fall back to empty
      const res = await fetch("/api/orders/mine?limit=100", {
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
        // Fallback: try generic
        const res2 = await fetch("/api/orders?as=seller&limit=100", {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const data2 = await res2.json().catch(() => ({}));
        const list = Array.isArray(data2.orders)
          ? data2.orders
          : Array.isArray(data2)
            ? data2
            : [];
        setOrders(list);
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrders([]);
      showToast("Could not load orders", "removed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const name = (o.buyer?.name || "").toLowerCase();
      const id = (o.orderNumber || o._id || "").toLowerCase();
      const pkg = (o.packageName || o.service?.title || "").toLowerCase();
      const st = (o.status || "").toLowerCase();
      const matchQ =
        !q || name.includes(q) || id.includes(q) || pkg.includes(q);
      let matchS = true;
      if (statusFilter === "new") {
        matchS =
          st.includes("pending") ||
          st.includes("requirement") ||
          st.includes("wait");
      } else if (statusFilter === "in-progress") {
        matchS =
          st.includes("progress") ||
          st === "in_escrow" ||
          st === "active";
      } else if (statusFilter === "revision") {
        matchS = st.includes("revision");
      }
      return matchQ && matchS;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    let active = 0;
    let earnings = 0;
    orders.forEach((o) => {
      const s = (o.status || "").toLowerCase();
      if (
        s.includes("progress") ||
        s === "in_escrow" ||
        s === "active" ||
        s.includes("revision") ||
        s.includes("pending")
      ) {
        active += 1;
      }
      if (s.includes("complete") || s === "delivered") {
        earnings += Number(o.amount) || 0;
      }
    });
    return {
      active,
      earnings,
      avgDelivery: "—", // needs completed-order duration data
    };
  }, [orders]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAction = (order: OrderRow, mode: ModalMode) => {
    if (!mode) {
      router.push(`/orders/${order._id}`);
      return;
    }
    setActiveOrder(order);
    setModalMode(mode);
    setDeliveryNote("");
    setExtendDate("");
    setExtendReason("");
    setRevisionNote("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setActiveOrder(null);
  };

  const submitAction = async () => {
    if (!activeOrder || !modalMode) return;
    setSubmitting(true);
    try {
      let url = "";
      let body: Record<string, unknown> = {};
      if (modalMode === "remind") {
        url = `/api/orders/${activeOrder._id}/remind`;
        body = {};
      } else if (modalMode === "deliver") {
        url = `/api/orders/${activeOrder._id}/deliver`;
        body = { deliveryNote, deliveryFiles: [] };
      } else if (modalMode === "extend") {
        url = `/api/orders/${activeOrder._id}/extend`;
        body = { proposedDate: extendDate, reason: extendReason };
      } else if (modalMode === "revision") {
        url = `/api/orders/${activeOrder._id}/deliver`;
        body = {
          deliveryNote: revisionNote || "Revision submitted",
          isRevision: true,
        };
      }

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Action failed", "removed");
        return;
      }
      showToast("Action applied successfully");
      closeModal();
      await loadOrders();
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = () => {
    if (modalMode === "remind") return "Send Reminder";
    if (modalMode === "deliver") return "Deliver Order";
    if (modalMode === "extend") return "Request Extension";
    if (modalMode === "revision") return "Submit Revision";
    return "Order Action";
  };

  return (
    <>
      <main className="mgmt-container">
        <p>Manage and control all your orders.</p>

        <div className="freelancer-order-management-page">
          <h1 className="page-title">Sales & Order Management</h1>

          <div className="overview-cards-container">
            <div className="f-card earnings-card">
              <h3>Net Earnings (Mo)</h3>
              <p className="large-value" id="net-earnings">
                {formatMoney(stats.earnings)}
              </p>
              <span className="sub-text">From completed orders</span>
            </div>
            <div className="f-card active-card">
              <h3>Active Orders</h3>
              <p className="large-value" id="active-orders-count">
                {stats.active}
              </p>
              <span className="sub-text">Projects in progress</span>
            </div>
            <div className="f-card delivery-card">
              <h3>Avg. Delivery Time</h3>
              <p className="large-value" id="avg-delivery-time">
                {stats.avgDelivery}
              </p>
              <span className="sub-text">When history data is available</span>
            </div>
          </div>

          <hr />

          <div className="orders-table-section">
            <h2>Active Orders Queue</h2>

            <div className="toolbar">
              <div className="search-bar-wrapper">
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="table-filters">
                <select
                  id="f-status-filter"
                  className="f-select-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="revision">Revision</option>
                </select>
              </div>
            </div>

            <section className="orders-display-area">
              <div className="orders-header">
                <span />
                <span>Buyer / Order ID</span>
                <span>Service Package</span>
                <span>Due Date</span>
                <span>Countdown</span>
                <span>Total</span>
                <span>Status</span>
                <span style={{ textAlign: "right" }}>Action</span>
              </div>

              {loading ? (
                <p style={{ padding: 24, color: "#94a3b8", textAlign: "center" }}>
                  Loading orders…
                </p>
              ) : filtered.length === 0 ? (
                <p style={{ padding: 24, color: "#94a3b8", textAlign: "center" }}>
                  No orders match your filters.
                </p>
              ) : (
                filtered.map((order) => {
                  const action = primaryAction(order.status);
                  const cd = formatCountdown(order.dueAt);
                  const oid = order.orderNumber || `#${order._id.slice(-6)}`;
                  return (
                    <div
                      key={order._id}
                      className="order-row item"
                      data-status={statusClass(order.status)}
                    >
                      <span className="check-cell">
                        <input
                          type="checkbox"
                          className="order-checkbox"
                          checked={selected.has(order._id)}
                          onChange={() => toggleSelect(order._id)}
                        />
                      </span>
                      <div className="buyer-cell">
                        <Image
                          src={order.buyer?.avatar || "/default-avatar.png"}
                          alt={order.buyer?.name || "Buyer"}
                          width={42}
                          height={42}
                          unoptimized
                        />
                        <div>
                          <span className="buyer-name">
                            {order.buyer?.name || "Client"}
                          </span>
                          <span className="order-id">{oid}</span>
                        </div>
                      </div>
                      <span className="pkg-title">
                        {order.packageName ||
                          order.service?.title ||
                          "Service package"}
                      </span>
                      <span className="date-cell">
                        {formatDate(order.dueAt || order.createdAt)}
                      </span>
                      <span
                        className={`timer-cell${cd.urgent ? " text-danger" : ""}`}
                      >
                        {cd.text !== "—" && (
                          <i
                            className={
                              cd.urgent
                                ? "fas fa-bolt"
                                : "far fa-clock"
                            }
                          />
                        )}{" "}
                        {cd.text}
                      </span>
                      <span className="amount-cell">
                        {formatMoney(order.amount)}
                      </span>
                      <span>
                        <span
                          className={`status-tag ${statusClass(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </span>
                      <div className="action-cell">
                        <button
                          type="button"
                          className="btn-manage"
                          onClick={() => openAction(order, action.mode)}
                        >
                          {action.label}
                        </button>
                        <Link
                          href={`/orders/${order._id}`}
                          className="btn-manage"
                          style={{
                            marginTop: 6,
                            textAlign: "center",
                            textDecoration: "none",
                            display: "block",
                          }}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Action modal */}
      <div
        id="action-modal"
        className={`overlay${modalOpen ? " show" : ""}`}
        style={{ display: modalOpen ? "flex" : "none" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div
          className="overlay-content glass-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 id="modal-title">
              <i className="fas fa-tasks" /> {modalTitle()}
            </h2>
            <button
              type="button"
              className="close-modal-x"
              onClick={closeModal}
            >
              &times;
            </button>
          </div>

          {modalMode === "remind" && (
            <div id="section-remind" className="action-section">
              <p>
                This will nudge{" "}
                <strong id="dynamic-buyer-name">
                  {activeOrder?.buyer?.name || "the buyer"}
                </strong>{" "}
                to provide the required details to start the countdown.
              </p>
            </div>
          )}

          {modalMode === "deliver" && (
            <div id="section-delivery" className="action-section">
              <p>
                Confirm delivery for this order. Add a note the buyer will see.
              </p>
              <textarea
                placeholder="Add a note for the buyer..."
                className="modal-textarea"
                rows={4}
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </div>
          )}

          {modalMode === "revision" && (
            <div id="section-request" className="action-section">
              <p>Submit your revised work with a short note.</p>
              <textarea
                placeholder="What did you update?"
                className="modal-textarea"
                rows={3}
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
            </div>
          )}

          {modalMode === "extend" && (
            <div id="section-request" className="action-section">
              <p id="request-description">
                Explain why you need more time and propose a new date.
              </p>
              <div className="input-group">
                <label>Proposed New Date</label>
                <input
                  type="date"
                  className="modal-input"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                />
              </div>
              <textarea
                placeholder="Reason for request..."
                className="modal-textarea"
                rows={3}
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline close-modal"
              onClick={closeModal}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              id="main-action-submit"
              onClick={submitAction}
              disabled={submitting}
            >
              {submitting ? "Working…" : "Confirm Action"}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      <div
        id="bulk-action-bar"
        className={`bulk-bar glass-card${selected.size > 0 ? " show" : ""}`}
      >
        <span id="selected-count">
          {selected.size} {selected.size === 1 ? "order" : "orders"} selected
        </span>
        <div className="bulk-btns">
          <button
            type="button"
            className="btn-bulk"
            onClick={() => showToast("Bulk messaging coming soon", "info")}
          >
            <i className="fas fa-envelope" /> Message All
          </button>
          <button
            type="button"
            className="btn-bulk"
            onClick={() => showToast("Export coming soon", "info")}
          >
            <i className="fas fa-file-export" /> Export Data
          </button>
          <button
            type="button"
            className="btn-bulk text-danger"
            onClick={() => {
              setSelected(new Set());
              showToast("Selection cleared", "info");
            }}
          >
            <i className="fas fa-archive" /> Clear
          </button>
        </div>
      </div>

      <div id="toast-container" />
    </>
  );
}
