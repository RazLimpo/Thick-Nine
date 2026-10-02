// app/service-dashboard/[id]/orders/client.tsx
// Service Order Manager — list of all orders for one service (owner only)

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/service-order-manager.css";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardService {
  _id: string;
  title: string;
  category?: string;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  status?: string;
}

type DashboardOrder = {
  _id: string;
  status: string;
  packageName?: string;
  amount?: number;
  buyer?: {
    _id?: string | null;
    name?: string;
    avatar?: string;
  };
  dueAt?: string | null;
  createdAt?: string;
};

type TabFilter = "all" | "active" | "pending" | "completed" | "disputes";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function shortOrderId(id: string) {
  if (!id) return "—";
  return `#${id.slice(-6).toUpperCase()}`;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMoney(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

/** Map backend status → UI filter bucket */
function statusBucket(status: string): TabFilter {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "cancelled" || s.includes("dispute")) return "disputes";
  if (s === "pending") return "pending";
  // in_escrow, revision_requested, and other in-flight states
  return "active";
}

function statusTagClass(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "revision_requested") return "pending";
  if (s === "in_escrow" || s === "active") return "in-progress";
  if (s === "completed") return "in-progress";
  if (s === "cancelled" || s.includes("dispute")) return "pending";
  return "pending";
}

function statusLabel(status: string) {
  const s = (status || "").toLowerCase().replace(/_/g, " ");
  if (!s) return "Pending";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Primary action button label for a given status */
function primaryActionLabel(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "Remind Buyer";
  if (s === "in_escrow") return "Deliver Work";
  if (s === "revision_requested") return "Submit Revision";
  if (s === "completed" || s === "cancelled") return "View Details";
  return "Manage";
}

/** Secondary link under the primary button (optional) */
function secondaryActionLabel(status: string): string | null {
  const s = (status || "").toLowerCase();
  if (s === "in_escrow") return "Request Extension";
  return null;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ServiceOrderManagerClient({
  serviceId,
}: {
  serviceId: string;
}) {
  const router = useRouter();

  const [service, setService] = useState<DashboardService | null>(null);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<TabFilter>("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "remind" | "deliver" | "extend" | "info" | null
  >(null);
  const [modalTitle, setModalTitle] = useState("Order Actions");
  const [modalBuyer, setModalBuyer] = useState("the buyer");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  /* ---------- auth ---------- */
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  /* ---------- load service context ---------- */
  const loadService = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/${serviceId}/manage`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/?auth=login");
          return;
        }
        throw new Error(data.message || "Failed to load service.");
      }
      setService(data.service || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load service.");
    }
  }, [serviceId, router]);

  /* ---------- load orders ---------- */
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/orders?limit=100`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/?auth=login");
          return;
        }
        throw new Error(data.message || "Failed to load orders.");
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, router]);

  useEffect(() => {
    loadService();
    loadOrders();
  }, [loadService, loadOrders]);

  /* ---------- counts for tabs ---------- */
  const counts = useMemo(() => {
    const c = {
      all: orders.length,
      active: 0,
      pending: 0,
      completed: 0,
      disputes: 0,
    };
    orders.forEach((o) => {
      const b = statusBucket(o.status);
      c[b] += 1;
    });
    return c;
  }, [orders]);

  /* ---------- filtered list ---------- */
  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const bucket = statusBucket(o.status);
      if (filter !== "all" && bucket !== filter) return false;
      if (!q) return true;
      const idMatch = o._id.toLowerCase().includes(q);
      const nameMatch = (o.buyer?.name || "").toLowerCase().includes(q);
      const shortMatch = shortOrderId(o._id).toLowerCase().includes(q);
      return idMatch || nameMatch || shortMatch;
    });
  }, [orders, filter, search]);

  /* ---------- selection / bulk bar ---------- */
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      visibleOrders.forEach((o) => {
        if (checked) next.add(o._id);
        else next.delete(o._id);
      });
      return next;
    });
  };

  const allVisibleSelected =
    visibleOrders.length > 0 &&
    visibleOrders.every((o) => selected.has(o._id));

  /* ---------- modal actions (UI only for now) ---------- */
  const openAction = (order: DashboardOrder, actionText: string) => {
    setActiveOrderId(order._id);
    setModalBuyer(order.buyer?.name || "the buyer");

    if (actionText.includes("Remind")) {
      setModalMode("remind");
      setModalTitle("Send Requirement Reminder");
    } else if (
      actionText.includes("Deliver") ||
      actionText.includes("Revision")
    ) {
      setModalMode("deliver");
      setModalTitle(
        actionText.includes("Revision")
          ? "Submit Revised Work"
          : "Deliver Final Assets"
      );
    } else if (actionText.includes("Extension") || actionText.includes("Extend")) {
      setModalMode("extend");
      setModalTitle("Request Time Extension");
    } else {
      // View Details → single order page
      router.push(`/orders/${order._id}`);
      return;
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode(null);
    setActiveOrderId(null);
  };

  const confirmModal = () => {
    // No backend endpoints yet for remind / deliver / extend
    closeModal();
    alert(
      "This action is ready in the UI. Backend endpoints will be wired next."
    );
  };

  /* ---------- render states ---------- */
  const thumb = service?.images?.[0] || "/default-service.png";

  if (error && !service) {
    return (
      <main className="order-mgmt-container">
        <nav className="breadcrumb">
          <Link href={`/service-dashboard/${serviceId}`}>
            <i className="fas fa-arrow-left" /> Back to Service Dashboard
          </Link>
        </nav>
        <p style={{ color: "#b91c1c" }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="order-mgmt-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href={`/service-dashboard/${serviceId}`}>
          <i className="fas fa-arrow-left" /> Back to Service Dashboard
        </Link>
      </nav>

      {/* Service context header */}
      <header className="service-context-header glass-card">
        <div className="context-flex">
          <Image
            src={thumb}
            alt={service?.title || "Service"}
            width={80}
            height={60}
            style={{ objectFit: "cover", borderRadius: 12 }}
          />
          <div className="context-text">
            <span className="category-tag">
              {service?.category || "Service"}
            </span>
            <h1>{service?.title || "Loading…"}</h1>
            <p>Manage all orders and transaction history for this specific service.</p>
          </div>
          <div className="context-stats">
            <div className="stat-pill">
              <strong>Orders:</strong> {orders.length}
            </div>
            <div className="stat-pill">
              <strong>Rating:</strong>{" "}
              <i className="fas fa-star" />{" "}
              {(service?.rating ?? 0).toFixed(1)}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs + search */}
      <section className="order-filter-section">
        <div className="tabs-container glass-card">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["pending", "Pending"],
              ["completed", "Completed"],
              ["disputes", "Disputes"],
            ] as [TabFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`tab-btn${filter === key ? " active" : ""}`}
              data-filter={key}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="count">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="search-bar-wrapper">
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Search by Order ID or Buyer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      {/* Bulk bar */}
      <div
        id="bulk-action-bar"
        className={`bulk-bar glass-card${selected.size > 0 ? " show" : ""}`}
      >
        <span id="selected-count">{selected.size} item(s) selected</span>
        <div className="bulk-btns">
          <button type="button" className="btn-bulk" disabled>
            <i className="fas fa-envelope" /> Message All
          </button>
          <button type="button" className="btn-bulk" disabled>
            <i className="fas fa-file-export" /> Export Data
          </button>
          <button type="button" className="btn-bulk text-danger" disabled>
            <i className="fas fa-archive" /> Archive
          </button>
        </div>
      </div>

      {/* Orders list */}
      <section className="orders-display-area">
        {/* Header row */}
        <div className="order-row header">
          <span className="check-cell">
            <input
              type="checkbox"
              id="select-all"
              checked={allVisibleSelected}
              onChange={(e) => toggleAllVisible(e.target.checked)}
              aria-label="Select all visible"
            />
          </span>
          <span>Buyer</span>
          <span>Package</span>
          <span>Date</span>
          <span>Timer</span>
          <span>Amount</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <p style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>
            Loading orders…
          </p>
        ) : visibleOrders.length === 0 ? (
          <p style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>
            No orders match this filter.
          </p>
        ) : (
          visibleOrders.map((order) => {
            const primary = primaryActionLabel(order.status);
            const secondary = secondaryActionLabel(order.status);
            return (
              <div
                key={order._id}
                className="order-row item"
                data-status={statusBucket(order.status)}
              >
                <span className="check-cell">
                  <input
                    type="checkbox"
                    className="order-checkbox"
                    checked={selected.has(order._id)}
                    onChange={() => toggleOne(order._id)}
                    aria-label={`Select order ${order._id}`}
                  />
                </span>

                <div className="buyer-cell">
                  <Image
                    src={order.buyer?.avatar || "/default-avatar.png"}
                    alt={order.buyer?.name || "Client"}
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div>
                    <span className="buyer-name">
                      {order.buyer?.name || "Client"}
                    </span>
                    <span className="order-id">{shortOrderId(order._id)}</span>
                  </div>
                </div>

                <span className="pkg-cell">
                  {order.packageName || "Package"}
                </span>
                <span className="date-cell">{formatDate(order.createdAt)}</span>
                <span className="timer-cell">—</span>
                <span className="amount-cell">
                  {formatMoney(order.amount)}
                </span>
                <span>
                  <span
                    className={`status-tag ${statusTagClass(order.status)}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </span>
                <div className="action-cell text-right">
                  {primary === "View Details" ? (
                    <Link
                      href={`/orders/${order._id}`}
                      className="btn-manage"
                      style={{
                        display: "inline-block",
                        textDecoration: "none",
                      }}
                    >
                      View Details
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-manage"
                        onClick={() => openAction(order, primary)}
                      >
                        {primary}
                      </button>
                      {secondary && (
                        <button
                          type="button"
                          className="btn-link-extend"
                          onClick={() => openAction(order, secondary)}
                          style={{
                            display: "block",
                            marginTop: 6,
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--primary-color, #d96464)",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {secondary}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

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
              <i className="fas fa-tasks" /> {modalTitle}
            </h2>
            <button type="button" className="close-modal" onClick={closeModal}>
              &times;
            </button>
          </div>

          {modalMode === "remind" && (
            <div id="section-remind" className="action-section">
              <p>
                This will nudge <strong id="dynamic-buyer-name">{modalBuyer}</strong>{" "}
                to provide the required details to start the order.
              </p>
              <p style={{ fontSize: "0.85rem", color: "#888", marginTop: 8 }}>
                Reminder API not wired yet.
              </p>
            </div>
          )}

          {modalMode === "deliver" && (
            <div id="section-delivery" className="action-section">
              <p>
                Upload your final assets below. Ensure all files are in the
                requested format.
              </p>
              <div className="upload-zone">
                <i className="fas fa-cloud-upload-alt" />
                <p>Delivery upload will be enabled when the API is ready.</p>
              </div>
              <textarea
                placeholder="Add a note for the buyer..."
                className="modal-textarea"
                rows={4}
              />
            </div>
          )}

          {modalMode === "extend" && (
            <div id="section-request" className="action-section">
              <p id="request-description">
                Explain why you are requesting more time.
              </p>
              <div className="input-group">
                <label>Proposed New Date (Optional)</label>
                <input type="date" className="modal-input" />
              </div>
              <textarea
                placeholder="Reason for request..."
                className="modal-textarea"
                rows={3}
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline close-modal"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              id="main-action-submit"
              onClick={confirmModal}
            >
              Confirm Action
            </button>
          </div>
        </div>
      </div>

      <div id="toast-container" />
    </main>
  );
}
