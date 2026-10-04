// app/service-dashboard/[id]/client.tsx
// Service Dashboard — owner-only management page for one service

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/service-dashboard.css";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

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
  clicks?: number;
  orders?: number;
  rating?: number;
  reviewsCount?: number;
  tags?: string[];
  faqs?: Array<{ question?: string; answer?: string }>;
  videos?: string[];
  audio?: string[];
  packages?: Record<string, unknown>;
  updatedAt?: string;
  createdAt?: string;
}

type AnalyticsPayload = {
  success?: boolean;
  days?: number;
  totalViewsInRange?: number;
  allTimeViews?: number;
  sources?: Array<{
    key: string;
    label: string;
    count: number;
    percent: number;
  }>;
  devices?: {
    desktop: { count: number; percent: number };
    mobile: { count: number; percent: number };
    tablet: { count: number; percent: number };
  };
  series?: Array<{ date: string; count: number }>;
};

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

type DashConvo = {
  _id: string;
  otherUser?: { _id?: string; name?: string; avatar?: string } | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  orderId?: string | null;
  serviceId?: string | null;
};

/* ------------------------------------------------------------------ */
/* Chart helper                                                       */
/* ------------------------------------------------------------------ */

function buildChartBars(series?: Array<{ date: string; count: number }>) {
  if (!series || series.length === 0) {
    return [
      { label: "Mon", height: 8, active: false, count: 0 },
      { label: "Tue", height: 8, active: false, count: 0 },
      { label: "Wed", height: 8, active: false, count: 0 },
      { label: "Thu", height: 8, active: false, count: 0 },
      { label: "Fri", height: 8, active: false, count: 0 },
      { label: "Sat", height: 8, active: false, count: 0 },
      { label: "Sun", height: 8, active: false, count: 0 },
    ];
  }

  let points = series;

  if (series.length > 7) {
    const step = Math.floor(series.length / 7);
    points = Array.from({ length: 7 }, (_, i) => {
      const idx = Math.min(i * step, series.length - 1);
      return series[idx];
    });
    points[6] = series[series.length - 1];
  } else if (series.length < 7) {
    const pad = 7 - series.length;
    points = [
      ...Array.from({ length: pad }, () => ({ date: "", count: 0 })),
      ...series,
    ];
  }

  const max = Math.max(...points.map((p) => p.count), 1);

  return points.map((p, i) => {
    const d = p.date ? new Date(p.date) : null;
    const label = d
      ? d.toLocaleDateString(undefined, { weekday: "short" })
      : "—";
    const height = Math.max(8, Math.round((p.count / max) * 100));
    return {
      label,
      height,
      active: i === points.length - 1,
      count: p.count,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function ServiceDashboardClient({
  serviceId,
}: {
  serviceId: string;
}) {
  const router = useRouter();

  /* ---------- state ---------- */
  const [service, setService] = useState<DashboardService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Action");
  const [modalMode, setModalMode] = useState<
    "info" | "pause" | "delete" | "content" | "seo" | "faqs" | "media" | null
  >(null);
  const [saving, setSaving] = useState(false);

  // Content & Pricing form fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // SEO & Tags
  const [editTagsText, setEditTagsText] = useState("");

  // FAQs
  const [editFaqs, setEditFaqs] = useState<
    Array<{ question: string; answer: string }>
  >([]);

  // Media URL lists
  const [editImagesText, setEditImagesText] = useState("");
  const [editVideosText, setEditVideosText] = useState("");
  const [editAudioText, setEditAudioText] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState("30");

  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [conversations, setConversations] = useState<DashConvo[]>([]);
  const [convosLoading, setConvosLoading] = useState(false);

  /* ---------- auth headers ---------- */
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  /* ---------- load service (owner) ---------- */
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

  /* ---------- load analytics ---------- */
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/services/${serviceId}/analytics?days=${analyticsDays}`,
        {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalytics(null);
        return;
      }
      setAnalytics(data as AnalyticsPayload);
    } catch {
      setAnalytics(null);
    }
  }, [serviceId, analyticsDays]);

  /* ---------- load orders ---------- */
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}/orders?limit=20`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOrders([]);
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [serviceId]);

  const loadConversations = useCallback(async () => {
    setConvosLoading(true);
    try {
      // Prefer threads tagged with this service; also load general inbox for order-linked chats
      const [byServiceRes, allRes] = await Promise.all([
        fetch(`/api/messages/conversations?serviceId=${serviceId}`, {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        fetch(`/api/messages/conversations`, {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
      ]);
      const byService = await byServiceRes.json().catch(() => ({}));
      const all = await allRes.json().catch(() => ({}));
      const serviceList: DashConvo[] = Array.isArray(byService.conversations)
        ? byService.conversations
        : [];
      const allList: DashConvo[] = Array.isArray(all.conversations)
        ? all.conversations
        : [];
      // Merge: service-tagged first, then others (dedupe by _id)
      const map = new Map<string, DashConvo>();
      [...serviceList, ...allList].forEach((c) => {
        if (c?._id) map.set(c._id, c);
      });
      setConversations(Array.from(map.values()).slice(0, 12));
    } catch {
      setConversations([]);
    } finally {
      setConvosLoading(false);
    }
  }, [serviceId]);

  /* ---------- effects ---------- */
  useEffect(() => {
    loadService();
  }, [loadService]);

  useEffect(() => {
    if (service) {
      loadAnalytics();
    }
  }, [service, loadAnalytics]);

  useEffect(() => {
    if (service) {
      loadOrders();
    }
  }, [service, loadOrders]);

  useEffect(() => {
    if (service) {
      loadConversations();
    }
  }, [service, loadConversations]);

  /* ---------- open Content & Pricing modal ---------- */
  const openContentModal = () => {
    if (!service) return;
    setEditTitle(service.title || "");
    setEditDescription(service.description || "");
    setEditPrice(
      typeof service.price === "number" ? String(service.price) : ""
    );
    setModalMode("content");
    setModalTitle("Edit Content & Pricing");
    setModalOpen(true);
  };

  /* ---------- PATCH helper ---------- */
  const patchService = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Failed to update service.");
    }
    if (data.service) {
      setService((prev) => (prev ? { ...prev, ...data.service } : data.service));
    }
    return data;
  };

  /* ---------- save content modal ---------- */
  const saveContentModal = async () => {
    const title = editTitle.trim();
    if (!title) {
      alert("Title is required.");
      return;
    }
    const priceNum = Number(editPrice);
    if (editPrice !== "" && (Number.isNaN(priceNum) || priceNum < 0)) {
      alert("Enter a valid price.");
      return;
    }

    setSaving(true);
    try {
      await patchService({
        title,
        description: editDescription,
        ...(editPrice !== "" ? { price: priceNum } : {}),
      });
      setModalOpen(false);
      setModalMode(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SEO & Tags modal ---------- */
  const openSeoModal = () => {
    if (!service) return;
    const tags = Array.isArray(service.tags) ? service.tags : [];
    setEditTagsText(tags.join(", "));
    setModalMode("seo");
    setModalTitle("SEO & Tag Management");
    setModalOpen(true);
  };

  const saveSeoModal = async () => {
    const tags = editTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);

    setSaving(true);
    try {
      await patchService({ tags });
      setModalOpen(false);
      setModalMode(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- FAQs modal ---------- */
  const openFaqsModal = () => {
    if (!service) return;
    const faqs = Array.isArray(service.faqs)
      ? service.faqs.map((f) => ({
          question: f.question || "",
          answer: f.answer || "",
        }))
      : [];
    setEditFaqs(faqs.length > 0 ? faqs : [{ question: "", answer: "" }]);
    setModalMode("faqs");
    setModalTitle("FAQs & Extras");
    setModalOpen(true);
  };

  const updateFaqField = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    setEditFaqs((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  const addFaqRow = () => {
    setEditFaqs((prev) => [...prev, { question: "", answer: "" }]);
  };

  const removeFaqRow = (index: number) => {
    setEditFaqs((prev) => prev.filter((_, i) => i !== index));
  };

  const saveFaqsModal = async () => {
    const faqs = editFaqs
      .map((f) => ({
        question: f.question.trim(),
        answer: f.answer.trim(),
      }))
      .filter((f) => f.question || f.answer);

    setSaving(true);
    try {
      await patchService({ faqs });
      setModalOpen(false);
      setModalMode(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Media modal (URL lists) ---------- */
  const linesToUrls = (text: string) =>
    text
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

  const openMediaModal = () => {
    if (!service) return;
    setEditImagesText((service.images || []).join("\n"));
    setEditVideosText((service.videos || []).join("\n"));
    setEditAudioText((service.audio || []).join("\n"));
    setModalMode("media");
    setModalTitle("Media Management");
    setModalOpen(true);
  };

  const saveMediaModal = async () => {
    const images = linesToUrls(editImagesText);
    const videos = linesToUrls(editVideosText);
    const audio = linesToUrls(editAudioText);

    setSaving(true);
    try {
      await patchService({
        images: images.length > 0 ? images : ["/default-service.png"],
        videos,
        audio,
      });
      setModalOpen(false);
      setModalMode(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- pause / resume ---------- */
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

  /* ---------- permanent delete ---------- */
  const confirmDelete = async () => {
    if (!service) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${service._id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || "Failed to delete service.");
        return;
      }
      setModalOpen(false);
      router.replace("/service-management");
    } catch {
      alert("Network error while deleting service.");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- social share ---------- */
  const openShare = (type: "fb" | "tw" | "li" | "link") => {
    if (typeof window === "undefined" || !service) return;
    const url = `${window.location.origin}/services/details/${service._id}`;
    const text = encodeURIComponent(service.title);
    if (type === "link") {
      navigator.clipboard?.writeText(url);
      alert("Public link copied.");
      return;
    }
    const map = {
      fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      tw: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`,
      li: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    window.open(map[type], "_blank", "noopener,noreferrer");
  };

  /* ---------- formatters ---------- */
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

  const orderStatusClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("wait") || s === "pending" || s === "requirements") {
      return "pending";
    }
    if (s.includes("progress") || s === "active" || s === "in_escrow") {
      return "in-progress";
    }
    if (s.includes("revision") || s.includes("dispute") || s === "cancelled") {
      return "danger";
    }
    return "pending";
  };

  const orderStatusLabel = (status: string) => {
    const s = (status || "").toLowerCase().replace(/_/g, " ");
    if (!s) return "Pending";
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDue = (dueAt?: string | null) => {
    if (!dueAt) return "—";
    try {
      const due = new Date(dueAt);
      const now = new Date();
      const ms = due.getTime() - now.getTime();
      if (ms <= 0) return "Overdue";
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days >= 1) return `${days}d ${hours % 24}h left`;
      return `${hours}h left`;
    } catch {
      return "—";
    }
  };

  /* ---------- loading / error ---------- */
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

  /* ---------- derived values ---------- */
  const thumb = service.images?.[0] || "/default-service.png";
  const isLive = service.status === "active";
  const rating = service.rating ?? 0;
  const reviews = service.reviewsCount ?? 0;
  const views = analytics?.allTimeViews ?? service.views ?? 0;
  const clicks = service.clicks ?? 0;
  const ordersCount = service.orders ?? 0;
  const chartBars = buildChartBars(analytics?.series);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <main className="mgmt-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/service-management">
          <i className="fas fa-arrow-left" /> Back to All Services
        </Link>
      </nav>

      <p>Manage, edit and control this service.</p>

      {/* ========== Performance header ========== */}
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
              {isLive
                ? "Live"
                : service.status === "paused"
                  ? "Paused"
                  : service.status}
            </span>
            <h1>{service.title}</h1>
            <div className="quick-stats">
              <span>
                <i className="fas fa-star" /> {rating.toFixed(1)} ({reviews}{" "}
                reviews)
              </span>
              <span>
                <i className="fas fa-clock" /> Last updated:{" "}
                {formatDate(service.updatedAt)}
              </span>
            </div>
          </div>

          {/* Social share */}
          <div className="social-share-box">
            <p>Share Service:</p>
            <div className="share-icons">
              <button
                type="button"
                className="share-btn fb"
                onClick={() => openShare("fb")}
              >
                <i className="fab fa-facebook-f" />
              </button>
              <button
                type="button"
                className="share-btn tw"
                onClick={() => openShare("tw")}
              >
                <i className="fab fa-x-twitter" />
              </button>
              <button
                type="button"
                className="share-btn li"
                onClick={() => openShare("li")}
              >
                <i className="fab fa-linkedin-in" />
              </button>
              <button
                type="button"
                className="share-btn link"
                onClick={() => openShare("link")}
              >
                <i className="fas fa-link" />
              </button>
            </div>
          </div>
        </div>

        {/* Top metrics */}
        <div className="metrics-grid">
          <div className="metric">
            <span className="label">Total Views</span>
            <span className="number">{views.toLocaleString()}</span>
            <span className="trend">All time</span>
          </div>
          <div className="metric">
            <span className="label">Service Clicks</span>
            <span className="number">{clicks.toLocaleString()}</span>
            <span className="trend">Continue / checkout</span>
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

      {/* ========== Analytics deep dive ========== */}
      <section className="analytics-detail-section">
        <div className="section-header">
          <h3>
            <i className="fas fa-chart-line" /> Performance Deep Dive
          </h3>
          <select
            className="analytics-filter"
            value={analyticsDays}
            onChange={(e) => setAnalyticsDays(e.target.value)}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
          </select>
        </div>

        <div className="analytics-main-grid">
          {/* Chart */}
          <div className="chart-container glass-card">
            <h4>Views overview</h4>
            <div className="visual-chart-placeholder">
              <div className="chart-bars">
                {chartBars.map((bar, i) => (
                  <div
                    key={`${bar.label}-${i}`}
                    className={`bar${bar.active ? " active" : ""}`}
                    style={{ height: `${bar.height}%` }}
                    title={`${bar.label}: ${bar.count ?? 0} views`}
                  >
                    <span>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 8 }}>
              {analytics?.totalViewsInRange != null
                ? `${analytics.totalViewsInRange} views in the selected period`
                : "No view data in this period yet"}
            </p>
          </div>

          {/* Traffic + devices */}
          <div className="analytics-sidebar">
            <div className="glass-card small-stat">
              <h4>Traffic Sources</h4>
              {analytics?.sources && analytics.sources.length > 0 ? (
                <ul className="source-list">
                  {analytics.sources.map((s) => (
                    <li key={s.key}>
                      <span>{s.label}</span>
                      <strong>{s.percent}%</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="source-list">
                  <li>
                    <span>No data yet</span>
                    <strong>—</strong>
                  </li>
                </ul>
              )}
            </div>

            <div className="glass-card small-stat">
              <h4>Device Usage</h4>
              <div className="device-icons">
                <span>
                  <i className="fas fa-desktop" />{" "}
                  {analytics?.devices?.desktop?.percent ?? 0}%
                </span>
                <span>
                  <i className="fas fa-mobile-alt" />{" "}
                  {analytics?.devices?.mobile?.percent ?? 0}%
                </span>
                <span>
                  <i className="fas fa-tablet-alt" />{" "}
                  {analytics?.devices?.tablet?.percent ?? 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Main manage grid ========== */}
      <div className="manage-grid">
        <div className="main-column">
          {/* Order Management */}
          <div className="action-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-shopping-basket" /> Order Management
                {!ordersLoading && orders.length > 0
                  ? ` (${orders.length})`
                  : ""}
              </h3>
              <Link href="/orders" className="view-all">
                View All Orders
              </Link>
            </div>

            <div className="order-list">
              {ordersLoading ? (
                <div
                  className="empty-state"
                  style={{
                    padding: 30,
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <p>Loading orders…</p>
                </div>
              ) : orders.length === 0 ? (
                <div
                  className="empty-state"
                  style={{
                    padding: 30,
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <p>No active orders for this service yet.</p>
                </div>
              ) : (
                orders.map((order) => {
                  const isUrgent =
                    !!order.dueAt &&
                    new Date(order.dueAt).getTime() - Date.now() <
                      1000 * 60 * 60 * 12;

                  return (
                    <div key={order._id} className="order-item">
                      <div className="order-user">
                        <Image
                          src={order.buyer?.avatar || "/default-avatar.png"}
                          alt={order.buyer?.name || "Client"}
                          width={36}
                          height={36}
                          style={{
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <span>
                          Client:{" "}
                          <strong>{order.buyer?.name || "Client"}</strong>
                        </span>
                      </div>

                      <span
                        className={`status-tag ${orderStatusClass(order.status)}`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>

                      <span
                        className={`order-timer${isUrgent ? " danger" : ""}`}
                      >
                        {order.dueAt ? (
                          <>
                            <i className="far fa-clock" />{" "}
                            {formatDue(order.dueAt)}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>

                      <Link
                        href={`/orders/${order._id}`}
                        className="btn-sm-primary btn-manage"
                        style={{
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        Manage
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Message history */}
          <div className="action-card">
            <div className="card-header">
              <h3>
                <i className="fas fa-comments" /> Message history
                {!convosLoading && conversations.length > 0
                  ? ` (${conversations.length})`
                  : ""}
              </h3>
              <Link href="/messages" className="view-all">
                Open inbox
              </Link>
            </div>

            <div className="order-list">
              {convosLoading ? (
                <div
                  className="empty-state"
                  style={{
                    padding: 30,
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <p>Loading messages…</p>
                </div>
              ) : conversations.length === 0 ? (
                <div
                  className="empty-state"
                  style={{
                    padding: 30,
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <p>
                    No chats yet. Message a buyer from an order detail page.
                  </p>
                </div>
              ) : (
                conversations.map((c) => (
                  <div key={c._id} className="order-item">
                    <div className="order-user">
                      <Image
                        src={c.otherUser?.avatar || "/default-avatar.png"}
                        alt={c.otherUser?.name || "User"}
                        width={36}
                        height={36}
                        style={{
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <span>
                        <strong>{c.otherUser?.name || "User"}</strong>
                        {(c.unread || 0) > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              background: "#d96464",
                              color: "white",
                              borderRadius: 10,
                              fontSize: "0.7rem",
                              padding: "2px 7px",
                              fontWeight: 700,
                            }}
                          >
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </div>
                    <span
                      className="order-timer"
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#666",
                        fontSize: "0.85rem",
                      }}
                      title={c.lastMessage || ""}
                    >
                      {c.lastMessage || "—"}
                    </span>
                    <Link
                      href={`/messages?c=${c._id}`}
                      className="btn-sm-primary btn-manage"
                      style={{
                        textAlign: "center",
                        textDecoration: "none",
                      }}
                    >
                      Open
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Content & optimization */}
          <div className="action-card">
            <h3>
              <i className="fas fa-tools" /> Service Content & Optimization
            </h3>
            <div className="btn-matrix">
              <button
                type="button"
                className="matrix-btn"
                id="btn-edit-pricing"
                onClick={openContentModal}
              >
                <i className="fas fa-edit" /> Edit Content & Pricing
              </button>
              <button
                type="button"
                className="matrix-btn"
                id="btn-media-mgmt"
                onClick={openMediaModal}
              >
                <i className="fas fa-images" /> Media Management
              </button>
              <button
                type="button"
                className="matrix-btn"
                id="btn-faq-extras"
                onClick={openFaqsModal}
              >
                <i className="fas fa-question-circle" /> FAQs & Extras
              </button>
              <button
                type="button"
                className="matrix-btn"
                id="btn-seo-tags"
                onClick={openSeoModal}
              >
                <i className="fas fa-search" /> SEO & Tag Management
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
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

      {/* ========== Full edit CTA ========== */}
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
          style={{
            padding: "15px 40px",
            fontSize: "1rem",
            display: "inline-flex",
            gap: 8,
          }}
        >
          <i className="fas fa-pencil-alt" /> Edit Full Service Details
        </Link>
        <p style={{ fontSize: "0.85rem", color: "#777", marginTop: 10 }}>
          Go to the main service editor to change titles, descriptions, and
          tiered pricing.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href={`/services/details/${service._id}`}>
            View public page{" "}
            <i className="fa-solid fa-square-arrow-up-right" />
          </Link>
        </p>
      </div>

      {/* ========== Action modal ========== */}
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
              <div className="info-banner">
                <i className="fas fa-exclamation-triangle" />
                <p style={{ color: "#b91c1c", margin: 0 }}>
                  This permanently removes <strong>{service.title}</strong> from
                  the marketplace. Open orders must be finished or cancelled
                  first. This cannot be undone.
                </p>
              </div>
            </div>
          )}

          {modalMode === "content" && (
            <div id="section-content" className="action-section">
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label
                  htmlFor="edit-title"
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #eee",
                  }}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label
                  htmlFor="edit-description"
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  className="modal-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={2000}
                  rows={5}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 8 }}>
                <label
                  htmlFor="edit-price"
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Listed price (USD)
                </label>
                <input
                  id="edit-price"
                  type="number"
                  min={0}
                  step="1"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1.5px solid #eee",
                  }}
                />
                <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 8 }}>
                  For full package tiers, use{" "}
                  <Link href={`/post-service?draftId=${service._id}`}>
                    Edit Full Service Details
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}

          {modalMode === "seo" && (
            <div id="section-seo" className="action-section">
              <div className="input-group">
                <label
                  htmlFor="edit-tags"
                  style={{ display: "block", fontWeight: 600, marginBottom: 6 }}
                >
                  Tags (comma-separated)
                </label>
                <textarea
                  id="edit-tags"
                  className="modal-textarea"
                  value={editTagsText}
                  onChange={(e) => setEditTagsText(e.target.value)}
                  rows={4}
                  placeholder="logo design, branding, minimalist"
                />
                <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 8 }}>
                  Up to 20 tags. Example:{" "}
                  <em>logo, branding, business card</em>
                </p>
              </div>
            </div>
          )}

          {modalMode === "media" && (
            <div
              id="section-media"
              className="action-section"
              style={{ maxHeight: 400, overflowY: "auto" }}
            >
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  marginBottom: 12,
                }}
              >
                Paste media <strong>URLs</strong> (one per line). For device
                upload, use{" "}
                <Link href={`/post-service?draftId=${service._id}`}>
                  Edit Full Service Details
                </Link>
                .
              </p>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label
                  htmlFor="edit-images"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Image URLs
                </label>
                <textarea
                  id="edit-images"
                  className="modal-textarea"
                  value={editImagesText}
                  onChange={(e) => setEditImagesText(e.target.value)}
                  rows={4}
                  placeholder="https://…/image1.jpg"
                />
              </div>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label
                  htmlFor="edit-videos"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Video URLs
                </label>
                <textarea
                  id="edit-videos"
                  className="modal-textarea"
                  value={editVideosText}
                  onChange={(e) => setEditVideosText(e.target.value)}
                  rows={3}
                  placeholder="https://…/video.mp4"
                />
              </div>
              <div className="input-group">
                <label
                  htmlFor="edit-audio"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Audio URLs
                </label>
                <textarea
                  id="edit-audio"
                  className="modal-textarea"
                  value={editAudioText}
                  onChange={(e) => setEditAudioText(e.target.value)}
                  rows={3}
                  placeholder="https://…/sample.mp3"
                />
              </div>
            </div>
          )}

          {modalMode === "faqs" && (
            <div
              id="section-faqs"
              className="action-section"
              style={{ maxHeight: 360, overflowY: "auto" }}
            >
              {editFaqs.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ fontSize: "0.85rem" }}>
                      FAQ {index + 1}
                    </strong>
                    {editFaqs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFaqRow(index)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#b91c1c",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Question"
                    value={faq.question}
                    onChange={(e) =>
                      updateFaqField(index, "question", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1.5px solid #eee",
                      marginBottom: 8,
                    }}
                  />
                  <textarea
                    placeholder="Answer"
                    className="modal-textarea"
                    value={faq.answer}
                    onChange={(e) =>
                      updateFaqField(index, "answer", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-outline"
                onClick={addFaqRow}
                style={{ width: "100%" }}
              >
                <i className="fas fa-plus" /> Add FAQ
              </button>
              <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 10 }}>
                Add-ons and package extras: use{" "}
                <Link href={`/post-service?draftId=${service._id}`}>
                  Edit Full Service Details
                </Link>
                .
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-outline close-modal"
              onClick={() => setModalOpen(false)}
              disabled={saving}
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
            {modalMode === "delete" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={confirmDelete}
                disabled={saving}
                style={{ background: "#b91c1c" }}
              >
                {saving ? "Deleting…" : "Delete permanently"}
              </button>
            )}
            {modalMode === "content" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={saveContentModal}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
            {modalMode === "seo" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={saveSeoModal}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save tags"}
              </button>
            )}
            {modalMode === "faqs" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={saveFaqsModal}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save FAQs"}
              </button>
            )}
            {modalMode === "media" && (
              <button
                type="button"
                className="btn-primary"
                id="main-action-submit"
                onClick={saveMediaModal}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save media"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div id="toast-container" />
    </main>
  );
}
