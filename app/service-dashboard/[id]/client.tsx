// app/service-dashboard/[id]/client.tsx

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/service-dashboard.css";

interface DashboardService {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  subCategory?: string;
  price?: number;
  images?: string[];
  status: "active" | "paused" | "draft" | string;
  views?: number;
  orders?: number;
  rating?: number;
  reviewsCount?: number;
  tags?: string[];
  packages?: Record<string, unknown>;
  updatedAt?: string;
  createdAt?: string;
}

export default function ServiceDashboardClient({
  serviceId,
}: {
  serviceId: string;
}) {
  const router = useRouter();
  const [service, setService] = useState<DashboardService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Action");
  const [modalMode, setModalMode] = useState<"info" | "pause" | "delete" | null>(
    null
  );

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const loadService = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [serviceId, router]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  const togglePause = async () => {
    if (!service) return;
    const next = service.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/services/${service._id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to update status.");
        return;
      }
      setService((prev) => (prev ? { ...prev, status: next } : prev));
      setModalOpen(false);
    } catch {
      alert("Network error while updating status.");
    }
  };

  const openShare = (type: "fb" | "tw" | "li" | "link") => {
    if (typeof window === "undefined" || !service) return;
    const url = `\( {window.location.origin}/services/details/ \){service._id}`;
    const text = encodeURIComponent(service.title);
    if (type === "link") {
      navigator.clipboard?.writeText(url);
      alert("Public link copied.");
      return;
    }
    const map = {
      fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      tw: `https://twitter.com/intent/tweet?url=\( {encodeURIComponent(url)}&text= \){text}`,
      li: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(map[type], "_blank", "noopener,noreferrer");
  };

  const formatDate = (iso?: string) => {
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
  };

  if (loading) {
    return (
      <main className="mgmt-container">
        <p style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          Loading service dashboard…
        </p>
      </main>
    );
  }

  if (error || !service) {
    return (
      <main className="mgmt-container">
        <nav className="breadcrumb">
          <Link href="/service-management">
            <i className="fas fa-arrow-left" /> Back to All Services
          </Link>
        </nav>
        <p style={{ color: "#b91c1c" }}>{error || "Service not found."}</p>
      </main>
    );
  }

  const thumb = service.images?.[0] || "/default-service.png";
  const isLive = service.status === "active";
  const rating = service.rating ?? 0;
  const reviews = service.reviewsCount ?? 0;
  const views = service.views ?? 0;
  const ordersCount = service.orders ?? 0;

  return (
    <main className="mgmt-container">
      <nav className="breadcrumb">
        <Link href="/service-management">
          <i className="fas fa-arrow-left" /> Back to All Services
        </Link>
      </nav>

      <p>Manage, edit and control this service.</p>

      <section className="performance-glass">
        <div className="service-meta">
          <Image
            src={thumb}
            alt={service.title}
            width={120}
            height={80}
            style={{ objectFit: "cover", borderRadius: 12 }}
          />
          <div className="meta-info">
            <span className="status-badge">
              {isLive ? "Live" : service.status === "paused" ? "Paused" : service.status}
            </span>
            <h1>{service.title}</h1>
            <div className="quick-stats">
              <span>
                <i className="fas fa-star" /> {rating.toFixed(1)} ({reviews} reviews)
              </span>
              <span>
                <i className="fas fa-clock" /> Last updated: {formatDate(service.updatedAt)}
              </span>
            </div>
          </div>
          <div className="social-share-box">
            <p>Share Service:</p>
            <div className="share-icons">
              <button type="button" className="share-btn fb" onClick={() => openShare("fb")}>
                <i className="fab fa-facebook-f" />
              </button>
              <button type="button" className="share-btn tw" onClick={() => openShare("tw")}>
                <i className="fab fa-x-twitter" />
              </button>
              <button type="button" className="share-btn li" onClick={() => openShare("li")}>
                <i className="fab fa-linkedin-in" />
              </button>
              <button type="button" className="share-btn link" onClick={() => openShare("link")}>
                <i className="fas fa-link" />
              </button>
            </div>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric">
            <span className="label">Total Views</span>
            <span className="number">{views.toLocaleString()}</span>
            <span className="trend">All time</span>
          </div>
          <div className="metric">
            <span className="label">Service Clicks</span>
            <span className="number">—</span>
            <span className="trend">Not tracked yet</span>
          </div>
          <div className="metric">
            <span className="label">Orders</span>
            <span className="number highlight-num">{ordersCount}</span>
            <span className="trend">Recorded</span>
          </div>
          <div className="metric">
            <span className="label">Listed Price</span>
            <span className="number">
              {typeof service.price === "number" ? `$${service.price}` : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Analytics — visual shell; live data limited to views for now */}
      <section className="analytics-detail-section">
        <div className="section-header">
          <h3>
            <i className="fas fa-chart-line" /> Performance Deep Dive
          </h3>
          <select className="analytics-filter" defaultValue="30" disabled>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
          </select>
        </div>

        <div className="analytics-main-grid">
          <div className="chart-container glass-card">
            <h4>Views overview</h4>
            <div className="visual-chart-placeholder">
              <div className="chart-bars">
                <div className="bar" style={{ height: "40%" }}>
                  <span>Mon</span>
                </div>
                <div className="bar" style={{ height: "60%" }}>
                  <span>Tue</span>
                </div>
                <div className="bar" style={{ height: "45%" }}>
                  <span>Wed</span>
                </div>
                <div className="bar" style={{ height: "80%" }}>
                  <span>Thu</span>
                </div>
                <div className="bar active" style={{ height: "95%" }}>
                  <span>Fri</span>
                </div>
                <div className="bar" style={{ height: "70%" }}>
                  <span>Sat</span>
                </div>
                <div className="bar" style={{ height: "55%" }}>
                  <span>Sun</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 8 }}>
              Daily trend charts will appear when analytics tracking is enabled.
            </p>
          </div>

          <div className="analytics-sidebar">
            <div className="glass-card small-stat">
              <h4>Traffic Sources</h4>
              <ul className="source-list">
                <li>
                  <span>Tracking</span> <strong>Soon</strong>
                </li>
              </ul>
            </div>
            <div className="glass-card small-stat">
              <h4>Device Usage</h4>
              <div className="device-icons">
                <span>
                  <i className="fas fa-desktop" /> —
                </span>
                <span>
                  <i className="fas fa-mobile-alt" /> —
                </span>
                <span>
                  <i className="fas fa-tablet-alt" /> —
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="manage-grid">
        <div className="main-column">
          <div className="action-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-shopping-basket" /> Order Management
              </h3>
              <Link href="/orders" className="view-all">
                View All Orders
              </Link>
            </div>
            <div className="order-list">
              <div
                className="empty-state"
                style={{ padding: 30, color: "#94a3b8", textAlign: "center" }}
              >
                <p>No active orders for this service yet.</p>
              </div>
            </div>
          </div>

          <div className="action-card">
            <h3>
              <i className="fas fa-tools" /> Service Content & Optimization
            </h3>
            <div className="btn-matrix">
              <Link
                href={`/post-service?draftId=${service._id}`}
                className="matrix-btn"
                id="btn-edit-pricing"
              >
                <i className="fas fa-edit" /> Edit Content & Pricing
              </Link>
              <Link
                href={`/post-service?draftId=${service._id}`}
                className="matrix-btn"
                id="btn-media-mgmt"
              >
                <i className="fas fa-images" /> Media Management
              </Link>
              <Link
                href={`/post-service?draftId=${service._id}`}
                className="matrix-btn"
                id="btn-faq-extras"
              >
                <i className="fas fa-question-circle" /> FAQs & Extras
              </Link>
              <Link
                href={`/post-service?draftId=${service._id}`}
                className="matrix-btn"
                id="btn-seo-tags"
              >
                <i className="fas fa-search" /> SEO & Tag Management
              </Link>
            </div>
          </div>
        </div>

        <div className="side-column">
          <div className="action-card highlight-card">
            <h3>
              <i className="fas fa-comments" /> Communication
            </h3>
            <p>Stay updated with active inquiries.</p>
            <button type="button" className="btn-secondary full-width" disabled>
              <i className="fas fa-envelope" /> Direct Messages
            </button>
            <button
              type="button"
              className="btn-outline full-width"
              style={{ marginTop: 10 }}
              disabled
            >
              <i className="fas fa-paper-plane" /> Create Custom Offer
            </button>
          </div>

          <div className="action-card highlight-card">
            <h3>
              <i className="fas fa-bullhorn" /> Promotion
            </h3>
            <button type="button" className="btn-outline full-width" disabled>
              <i className="fas fa-ticket-alt" /> Manage Coupons
            </button>
            <button
              type="button"
              className="btn-outline full-width"
              style={{ marginTop: 10 }}
              disabled
            >
              <i className="fas fa-chart-line" /> Promotion Tips
            </button>
          </div>

          <div className="action-card danger-zone">
            <h3>
              <i className="fas fa-exclamation-triangle" /> Advanced Controls
            </h3>
            <button
              type="button"
              className="btn-link text-muted"
              onClick={() => {
                setModalMode("pause");
                setModalTitle(isLive ? "Pause Service" : "Resume Service");
                setModalOpen(true);
              }}
            >
              <i className={isLive ? "fas fa-pause" : "fas fa-play"} />{" "}
              {isLive ? "Pause Service" : "Resume Service"}
            </button>
            <button
              type="button"
              className="btn-link text-danger"
              onClick={() => {
                setModalMode("delete");
                setModalTitle("Delete Service");
                setModalOpen(true);
              }}
            >
              <i className="fas fa-trash" /> Permanently Delete
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          borderTop: "1px solid #eee",
          paddingTop: 30,
        }}
      >
        <Link
          href={`/post-service?draftId=${service._id}`}
          id="btn-full-edit"
          className="btn-primary"
          style={{ padding: "15px 40px", fontSize: "1rem", display: "inline-flex", gap: 8 }}
        >
          <i className="fas fa-pencil-alt" /> Edit Full Service Details
        </Link>
        <p style={{ fontSize: "0.85rem", color: "#777", marginTop: 10 }}>
          Go to the main service editor to change titles, descriptions, and tiered pricing.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href={`/services/details/${service._id}`}>
            View public page <i className="fa-solid fa-square-arrow-up-right" />
          </Link>
        </p>
      </div>

      {/* Modal — keep IDs/classes */}
      <div
        id="action-modal"
        className={`overlay${modalOpen ? " show" : ""}`}
        style={{ display: modalOpen ? "flex" : "none" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 id="modal-title">
              <i className="fas fa-tasks" /> {modalTitle}
            </h2>
            <button
              type="button"
              className="close-modal"
              onClick={() => setModalOpen(false)}
            >
              &times;
            </button>
          </div>

          {modalMode === "pause" && (
            <div id="section-remind" className="action-section">
              <div className="info-banner">
                <i className="fas fa-info-circle" />
                <p>
                  {isLive
                    ? "Pausing hides this service from the marketplace. You can resume anytime."
                    : "Resuming makes this service visible on the marketplace again."}
                </p>
              </div>
            </div>
          )}

          {modalMode === "delete" && (
            <div className="action-section">
              <p style={{ color: "#b91c1c" }}>
                Permanent delete is not enabled yet. Pause the service instead, or contact
                support.
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline close-modal"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            {modalMode === "pause" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={togglePause}
              >
                Confirm
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="toast-container" />
    </main>
  );
}