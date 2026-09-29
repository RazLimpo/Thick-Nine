// app/service-management/client.tsx

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/service-management.css";

type ServiceStatus = "active" | "draft" | "paused";

interface MyService {
  _id: string;
  title: string;
  category?: string;
  subCategory?: string;
  price?: number;
  images?: string[];
  status: ServiceStatus;
  views?: number;
  updatedAt?: string;
}

interface Stats {
  activeCount: number;
  totalViews: number;
  total: number;
}

type TabKey = "posted" | "drafts" | "templates";

export default function ServiceManagementClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("posted");
  const [services, setServices] = useState<MyService[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeCount: 0,
    totalViews: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/services/my-services", {
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
        throw new Error(data.message || "Failed to load services.");
      }

      setServices(Array.isArray(data.services) ? data.services : []);
      if (data.stats) {
        setStats({
          activeCount: data.stats.activeCount ?? 0,
          totalViews: data.stats.totalViews ?? 0,
          total: data.stats.total ?? 0,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const postedServices = services.filter(
    (s) => s.status === "active" || s.status === "paused"
  );
  const draftServices = services.filter((s) => s.status === "draft");

  const formatPrice = (price?: number) =>
    typeof price === "number" ? `$${price.toFixed(2)}` : "—";

  const statusLabel = (status: ServiceStatus) => {
    if (status === "active") return "Live";
    if (status === "paused") return "Paused";
    return "Draft";
  };

  const statusClass = (status: ServiceStatus) => {
    if (status === "active") return "active";
    if (status === "paused") return "paused";
    return "draft";
  };

  return (
    <main className="mgmt-container">
      {/* Header */}
      <section className="glass-header">
        <div className="welcome-text">
          <h1>Service Management</h1>
          <p>Track, edit, and optimize your offerings.</p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.activeCount}</span>
            <span className="stat-label">Active Services</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {stats.totalViews >= 1000
                ? `${(stats.totalViews / 1000).toFixed(1)}k`
                : stats.totalViews}
            </span>
            <span className="stat-label">Total Views</span>
          </div>
          <div className="stat-btn-container">
            <Link href="/post-service" className="btn-primary create-btn">
              <i className="fas fa-plus" /> Create New Service
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="mgmt-tabs">
        <button
          type="button"
          className={`tab-link ${activeTab === "posted" ? "active" : ""}`}
          onClick={() => setActiveTab("posted")}
        >
          Posted Services
        </button>
        <button
          type="button"
          className={`tab-link ${activeTab === "drafts" ? "active" : ""}`}
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </button>
        <button
          type="button"
          className={`tab-link ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "16px 20px",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          {error}{" "}
          <button
            type="button"
            onClick={loadServices}
            style={{
              marginLeft: 12,
              background: "none",
              border: "none",
              color: "#b91c1c",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          Loading your services…
        </div>
      )}

      {/* Posted Services */}
      {!loading && activeTab === "posted" && (
        <section className="tab-content active">
          {postedServices.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-briefcase" />
              <p>No posted services yet. Create and publish one to see it here.</p>
              <Link
                href="/post-service"
                className="btn-primary"
                style={{ marginTop: 16, display: "inline-block" }}
              >
                Create New Service
              </Link>
            </div>
          ) : (
            <>
              <div className="service-table-header">
                <span>Service Details</span>
                <span>Price</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {postedServices.map((svc) => (
                <div key={svc._id} className="service-row">
                  <div className="service-info">
                    <Image
                      src={
                        svc.images?.[0] || "/default-service.png"
                      }
                      alt={svc.title}
                      width={80}
                      height={55}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                    <div>
                      <h3>{svc.title}</h3>
                      <p>
                        {svc.category || "General"}
                        {svc.subCategory ? ` > ${svc.subCategory}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="service-price">{formatPrice(svc.price)}</div>
                  <div className="service-status">
                    <span className={`status-pill ${statusClass(svc.status)}`}>
                      {statusLabel(svc.status)}
                    </span>
                  </div>
                  <div className="service-actions">
                    <Link
                      href={`/services/details/${svc._id}`}
                      title="View Publicly"
                    >
                      <i className="fas fa-eye" />
                    </Link>
                    <Link
                      href={`/post-service?draftId=${svc._id}`}
                      title="Edit Service"
                    >
                      <i className="fas fa-briefcase" />
                    </Link>
                    {/* Pause/Resume can be wired later when the endpoint exists */}
                    <button type="button" title="Pause" className="text-muted" disabled>
                      <i className="fas fa-pause" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {/* Drafts */}
      {!loading && activeTab === "drafts" && (
        <section className="tab-content active">
          {draftServices.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-file-signature" />
              <p>No drafts currently. Start a new service to see it here.</p>
            </div>
          ) : (
            <>
              <div className="service-table-header">
                <span>Service Details</span>
                <span>Price</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {draftServices.map((svc) => (
                <div key={svc._id} className="service-row">
                  <div className="service-info">
                    <Image
                      src={
                        svc.images?.[0] || "/default-service.png"
                      }
                      alt={svc.title}
                      width={80}
                      height={55}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                    <div>
                      <h3>{svc.title}</h3>
                      <p>
                        {svc.category || "General"}
                        {svc.subCategory ? ` > ${svc.subCategory}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="service-price">{formatPrice(svc.price)}</div>
                  <div className="service-status">
                    <span className="status-pill draft">Draft</span>
                  </div>
                  <div className="service-actions">
                    <Link
                      href={`/post-service?draftId=${svc._id}`}
                      title="Continue Editing"
                    >
                      <i className="fas fa-edit" />
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {/* Templates (placeholder) */}
      {!loading && activeTab === "templates" && (
        <section className="tab-content active">
          <div className="service-row">
            <div className="service-info">
              <div className="template-icon">
                <i className="fas fa-layer-group" />
              </div>
              <div>
                <h3>Standard Design Skeleton</h3>
                <p>Pre-filled FAQs and Requirements</p>
              </div>
            </div>
            <div className="service-price">--</div>
            <div className="service-status">Template</div>
            <div className="service-actions">
              <button type="button" className="btn-primary-outline" disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}