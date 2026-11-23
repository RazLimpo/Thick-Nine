// app/freelancer-clients/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-clients.css";

type RelFilter = "all" | "friends" | "saved" | "blocked";

type ClientPublic = {
  _id: string;
  fullName?: string;
  displayName?: string;
  avatar?: string;
  location?: string;
  onlineStatus?: string;
  tagline?: string;
  bio?: string;
  preferredSkills?: string[] | string;
  projectTypes?: string[];
  preferredProjectType?: string;
  projectScale?: string;
  keyRequirements?: string;
  contactPref?: string;
  minBudget?: number | null;
  maxBudget?: number | null;
  escrowPref?: string;
  twoFactorEnabled?: boolean;
  isVerified?: boolean;
  memberSince?: string;
  timezone?: string;
  languages?: string[] | string;
};

type ClientRow = {
  _id: string;
  client: ClientPublic | null;
  totalOrders: number;
  lifetimeValue: number;
  avgOrderValue: number;
  lastOrderAt?: string | null;
  isFriend: boolean;
  isSaved: boolean;
  isBlocked: boolean;
  hasNotes?: boolean;
};

type Summary = {
  totalClients: number;
  totalLtv: number;
  totalOrders: number;
  avgLtv: number;
  friendsCount: number;
  savedCount: number;
};

type DetailOrder = {
  _id: string;
  orderNumber?: string;
  status?: string;
  serviceTitle?: string;
  payout?: number;
  createdAt?: string;
};

type DetailPayload = {
  client: ClientPublic | null;
  relation: {
    isFriend: boolean;
    isSaved: boolean;
    isBlocked: boolean;
    notes: string;
  };
  metrics: {
    totalOrders: number;
    lifetimeValue: number;
    avgOrderValue: number;
    completedOrders: number;
    lastOrderAt?: string | null;
    memberSince?: string | null;
  };
  orders: DetailOrder[];
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function showToast(
  message: string,
  type: "info" | "success" | "error" = "info"
) {
  if (typeof document === "undefined") return;
  let root = document.getElementById("toast-container");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-container";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " removed" : ""}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
        ? "fa-exclamation-triangle"
        : "fa-info-circle";
  el.innerHTML = `<i class="fas ${icon}"></i><span></span>`;
  const span = el.querySelector("span");
  if (span) span.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 3200);
}

function presenceClass(status?: string): string {
  const s = String(status || "offline").toLowerCase();
  if (s === "online" || s === "true" || s === "1") return "online";
  if (s === "away") return "away";
  return "offline";
}

function displayName(c: ClientPublic | null | undefined): string {
  return c?.displayName || c?.fullName || "Client";
}

function skillList(v?: string[] | string): string[] {
  if (Array.isArray(v)) return v.filter(Boolean).slice(0, 8);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  return [];
}

const SCALE_LABEL: Record<string, string> = {
  small: "Small (< $500)",
  medium: "Medium ($500 – $5k)",
  large: "Large ($5k+)",
};
const CONTACT_LABEL: Record<string, string> = {
  messaging: "Platform messaging",
  email: "Email",
  both: "Messaging & email",
};
const ESCROW_LABEL: Record<string, string> = {
  always: "Always use escrow",
  sometimes: "Sometimes",
  never: "Rarely",
};

export default function FreelancerClientsClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalClients: 0,
    totalLtv: 0,
    totalOrders: 0,
    avgLtv: 0,
    friendsCount: 0,
    savedCount: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [relationship, setRelationship] = useState<RelFilter>("all");
  const [search, setSearch] = useState("");
  const [minOrders, setMinOrders] = useState("0");
  const [sortBy, setSortBy] = useState("last-order-desc");
  const [presence, setPresence] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        relationship,
        q: search.trim(),
        minOrders,
        sort: sortBy,
        page: String(page),
        limit: "10",
      });
      const res = await fetch(`/api/freelancer/clients?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to load clients.", "error");
        setRows([]);
        return;
      }
      const list: ClientRow[] = Array.isArray(data.clients) ? data.clients : [];
      setRows(list);
      if (data.summary) setSummary(data.summary);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }

      const ids = list
        .map((r) => r.client?._id || r._id)
        .filter(Boolean) as string[];
      if (ids.length) {
        try {
          const pr = await fetch("/api/presence", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
            cache: "no-store",
          });
          const pd = await pr.json().catch(() => ({}));
          if (pr.ok) {
            const next: Record<string, string> = {};
            const arr = Array.isArray(pd.users)
              ? pd.users
              : Array.isArray(pd.statuses)
                ? pd.statuses
                : [];
            arr.forEach(
              (u: {
                _id?: string;
                id?: string;
                status?: string;
                onlineStatus?: string;
              }) => {
                const id = String(u._id || u.id || "");
                if (id)
                  next[id] = String(u.status || u.onlineStatus || "offline");
              }
            );
            if (pd.byId && typeof pd.byId === "object") {
              Object.keys(pd.byId).forEach((id) => {
                next[id] = String(pd.byId[id]);
              });
            }
            setPresence((prev) => ({ ...prev, ...next }));
          }
        } catch {
          /* optional */
        }
      }
    } catch {
      showToast("Network error loading clients.", "error");
    } finally {
      setLoading(false);
    }
  }, [relationship, search, minOrders, sortBy, page]);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/?auth=login");
      return;
    }
    loadList();
  }, [loadList, router]);

  // Debounce search resets page
  useEffect(() => {
    setPage(1);
  }, [relationship, search, minOrders, sortBy]);

  const openDetail = async (clientId: string) => {
    setModalOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/freelancer/clients/${clientId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not open client.", "error");
        setModalOpen(false);
        return;
      }
      let payload = data as DetailPayload;
      // Align modal with public client profile (same fields as client-settings / client-profile)
      try {
        const pr = await fetch(`/api/users/${clientId}/public`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const pd = await pr.json().catch(() => ({}));
        if (pr.ok && (pd.user || pd._id)) {
          const u = pd.user || pd;
          payload = {
            ...payload,
            client: {
              ...(payload.client || {}),
              _id: String(u._id || clientId),
              fullName: u.fullName || payload.client?.fullName,
              displayName: u.displayName || u.fullName || payload.client?.displayName,
              avatar: u.avatar || payload.client?.avatar,
              location:
                typeof u.location === "string"
                  ? u.location
                  : payload.client?.location,
              onlineStatus: u.onlineStatus || payload.client?.onlineStatus,
              tagline: u.tagline,
              bio: u.bio,
              preferredSkills: u.preferredSkills,
              projectTypes: u.projectTypes,
              preferredProjectType: u.preferredProjectType,
              projectScale: u.projectScale,
              keyRequirements: u.keyRequirements,
              contactPref: u.contactPref,
              minBudget: u.minBudget,
              maxBudget: u.maxBudget,
              escrowPref: u.escrowPref,
              twoFactorEnabled: u.twoFactorEnabled,
              isVerified: u.isVerified,
              memberSince: u.memberSince,
              timezone: u.timezone,
              languages: u.languages,
            },
          };
        }
      } catch {
        /* optional enrichment */
      }
      setDetail(payload);
      setNotesDraft(payload.relation?.notes || "");
    } catch {
      showToast("Network error.", "error");
      setModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const patchRelation = async (
    clientId: string,
    body: Record<string, unknown>
  ) => {
    try {
      const res = await fetch(`/api/freelancer/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Update failed.", "error");
        return null;
      }
      return data.relation as DetailPayload["relation"];
    } catch {
      showToast("Network error.", "error");
      return null;
    }
  };

  const toggleFlag = async (
    clientId: string,
    flag: "isFriend" | "isSaved" | "isBlocked",
    current: boolean
  ) => {
    const next = !current;
    const rel = await patchRelation(clientId, { [flag]: next });
    if (!rel) return;
    setRows((prev) =>
      prev.map((r) =>
        r._id === clientId
          ? {
              ...r,
              isFriend: rel.isFriend,
              isSaved: rel.isSaved,
              isBlocked: rel.isBlocked,
            }
          : r
      )
    );
    if (detail?.client?._id === clientId || detail?.client?._id === undefined) {
      setDetail((d) => (d ? { ...d, relation: { ...d.relation, ...rel } } : d));
    }
    const labels: Record<string, string> = {
      isFriend: next ? "Marked as friend" : "Removed from friends",
      isSaved: next ? "Client saved" : "Removed from saved",
      isBlocked: next ? "Client blocked" : "Unblocked",
    };
    showToast(labels[flag], "success");
  };

  const saveNotes = async () => {
    if (!detail?.client?._id) return;
    setSavingNotes(true);
    const rel = await patchRelation(detail.client._id, { notes: notesDraft });
    setSavingNotes(false);
    if (rel) {
      setDetail((d) => (d ? { ...d, relation: { ...d.relation, ...rel } } : d));
      showToast("Notes saved.", "success");
    }
  };

  const messageClient = async () => {
    if (!detail?.client?._id) return;
    setMessaging(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientId: detail.client._id,
          initialMessage: "Hi! Following up on our past work together.",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not start chat.", "error");
        return;
      }
      const cid = data.conversationId || data._id;
      if (cid) router.push(`/messages?c=${cid}`);
      else router.push("/messages");
    } catch {
      showToast("Network error starting chat.", "error");
    } finally {
      setMessaging(false);
    }
  };

  const statusLabel = (s?: string) =>
    String(s || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const empty = !loading && rows.length === 0;

  return (
    <div className="fcm-page">
      <div className="fcm-container">
        <header className="fcm-header">
          <div>
            <h1 className="fcm-title">
              <i className="fas fa-users" /> Client Management
            </h1>
            <p className="fcm-subtitle">
              Clients you have completed or active orders with — lifetime value,
              notes, and on-platform messaging.
            </p>
          </div>
          <Link href="/freelancer-orders" className="fcm-link-btn">
            <i className="fas fa-tasks" /> Active orders
          </Link>
        </header>

        {/* KPI cards */}
        <div className="fcm-summary" id="client-overview-cards">
          <div className="fcm-summary-card">
            <h3>Total clients</h3>
            <div className="fcm-card-value">{summary.totalClients}</div>
          </div>
          <div className="fcm-summary-card">
            <h3>Lifetime value</h3>
            <div className="fcm-card-value value-green">
              {formatMoney(summary.totalLtv)}
            </div>
          </div>
          <div className="fcm-summary-card">
            <h3>Total orders</h3>
            <div className="fcm-card-value">{summary.totalOrders}</div>
          </div>
          <div className="fcm-summary-card">
            <h3>Avg. per client</h3>
            <div className="fcm-card-value">{formatMoney(summary.avgLtv)}</div>
          </div>
        </div>

        {/* Relationship tabs */}
        <div className="fcm-rel-tabs" role="tablist">
          {(
            [
              ["all", "All Clients", "fa-list"],
              ["friends", "Friends", "fa-user-friends"],
              ["saved", "Saved", "fa-heart"],
              ["blocked", "Blocked", "fa-ban"],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={`fcm-rel-tab${relationship === id ? " active" : ""}`}
              onClick={() => setRelationship(id)}
            >
              <i className={`fas ${icon}`} /> {label}
              {id === "friends" && summary.friendsCount > 0
                ? ` (${summary.friendsCount})`
                : ""}
              {id === "saved" && summary.savedCount > 0
                ? ` (${summary.savedCount})`
                : ""}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="fcm-controls">
          <input
            type="search"
            className="fcm-input"
            placeholder="Search by client name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
          />
          <select
            className="fcm-select"
            value={minOrders}
            onChange={(e) => setMinOrders(e.target.value)}
            title="Minimum orders"
          >
            <option value="0">Min orders (all)</option>
            <option value="1">At least 1</option>
            <option value="2">At least 2</option>
            <option value="5">At least 5</option>
          </select>
          <select
            className="fcm-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort"
          >
            <option value="last-order-desc">Last order (newest)</option>
            <option value="ltv-desc">Lifetime value (high → low)</option>
            <option value="orders-desc">Total orders (high → low)</option>
          </select>
        </div>

        {/* Table */}
        <div className="fcm-table-wrap">
          <table className="fcm-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Orders</th>
                <th>Lifetime value</th>
                <th>Avg. order</th>
                <th>Last order</th>
                <th>Flags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="fcm-empty">
                    <i className="fas fa-spinner fa-spin" /> Loading clients…
                  </td>
                </tr>
              ) : empty ? (
                <tr>
                  <td colSpan={7} className="fcm-empty">
                    No clients match these filters. Clients appear here after
                    they place an order with you.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const c = row.client;
                  const id = c?._id || row._id;
                  const name = displayName(c);
                  const p =
                    presence[id] || c?.onlineStatus || "offline";
                  return (
                    <tr key={row._id}>
                      <td>
                        <div className="fcm-name-cell">
                          <div
                            className="fcm-avatar role-ring"
                            title={name}
                          >
                            <Image
                              src={c?.avatar || "/default-avatar.png"}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                            />
                            <span
                              className={`fcm-presence ${presenceClass(p)}`}
                              aria-hidden
                            />
                          </div>
                          <div className="fcm-name-meta">
                            <span className="fcm-name">{name}</span>
                            {c?.location ? (
                              <span className="fcm-loc">
                                <i className="fas fa-location-dot" />{" "}
                                {c.location}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{row.totalOrders}</td>
                      <td className="fcm-ltv">
                        {formatMoney(row.lifetimeValue)}
                      </td>
                      <td>{formatMoney(row.avgOrderValue)}</td>
                      <td>{formatDate(row.lastOrderAt)}</td>
                      <td>
                        <div className="fcm-flags">
                          {row.isFriend && (
                            <span className="fcm-chip friend" title="Friend">
                              <i className="fas fa-user-friends" />
                            </span>
                          )}
                          {row.isSaved && (
                            <span className="fcm-chip saved" title="Saved">
                              <i className="fas fa-heart" />
                            </span>
                          )}
                          {row.isBlocked && (
                            <span className="fcm-chip blocked" title="Blocked">
                              <i className="fas fa-ban" />
                            </span>
                          )}
                          {row.hasNotes && (
                            <span className="fcm-chip notes" title="Has notes">
                              <i className="fas fa-sticky-note" />
                            </span>
                          )}
                          {!row.isFriend &&
                            !row.isSaved &&
                            !row.isBlocked &&
                            !row.hasNotes && (
                              <span className="fcm-muted">—</span>
                            )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="fcm-btn dark"
                          onClick={() => openDetail(id)}
                          title="View client profile"
                        >
                          <i className="fas fa-eye" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="fcm-pagination">
          <button
            type="button"
            className="fcm-btn secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <i className="fas fa-chevron-left" /> Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="fcm-btn secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>

      {/* Detail modal — no email */}
      {modalOpen && (
        <div
          className="fcm-modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="fcm-modal-panel">
            <div className="fcm-modal-head">
              <h2>
                <i className="fas fa-user-tie" /> Client profile
                {detail?.client ? (
                  <span className="fcm-modal-name">
                    {" "}
                    · {displayName(detail.client)}
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                className="fcm-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="fcm-modal-body">
              {detailLoading || !detail ? (
                <p className="fcm-empty">
                  <i className="fas fa-spinner fa-spin" /> Loading…
                </p>
              ) : (
                <>
                  <div className="fcm-detail-header">
                    <div className="fcm-avatar-lg role-ring">
                      <Image
                        src={detail.client?.avatar || "/default-avatar.png"}
                        alt=""
                        width={80}
                        height={80}
                        unoptimized
                      />
                      <span
                        className={`fcm-presence ${presenceClass(
                          presence[detail.client?._id || ""] ||
                            detail.client?.onlineStatus
                        )}`}
                      />
                    </div>
                    <div className="fcm-detail-contact">
                      <div className="fcm-detail-name">
                        {displayName(detail.client)}
                      </div>
                      {detail.client?.tagline ? (
                        <p className="fcm-tagline">{detail.client.tagline}</p>
                      ) : null}
                      {detail.client?.location ? (
                        <p>
                          <i className="fas fa-map-marker-alt" />{" "}
                          {detail.client.location}
                        </p>
                      ) : (
                        <p className="fcm-muted">Location not shared</p>
                      )}
                      <p className="fcm-muted">
                        Member since{" "}
                        {formatDate(
                          detail.client?.memberSince ||
                            detail.metrics.memberSince
                        )}
                      </p>
                      <p>
                        <Link
                          href={`/client-profile/${detail.client?._id || ""}`}
                          className="fcm-full-profile-link"
                        >
                          <i className="fas fa-external-link-alt" /> Open full
                          public profile
                        </Link>
                      </p>
                      <div className="fcm-detail-actions">
                        <button
                          type="button"
                          className="fcm-btn primary"
                          disabled={messaging || detail.relation.isBlocked}
                          title={
                            detail.relation.isBlocked
                              ? "Unblock to message"
                              : "Open chat on platform"
                          }
                          onClick={messageClient}
                        >
                          <i className="fas fa-comment-dots" />{" "}
                          {messaging ? "Opening…" : "Message client"}
                        </button>
                        <button
                          type="button"
                          className={`fcm-icon-btn${
                            detail.relation.isFriend ? " on" : ""
                          }`}
                          title={
                            detail.relation.isFriend
                              ? "Remove friend"
                              : "Mark as friend"
                          }
                          onClick={() =>
                            toggleFlag(
                              detail.client!._id,
                              "isFriend",
                              detail.relation.isFriend
                            )
                          }
                        >
                          <i className="fas fa-user-friends" />
                        </button>
                        <button
                          type="button"
                          className={`fcm-icon-btn${
                            detail.relation.isSaved ? " on-heart" : ""
                          }`}
                          title={
                            detail.relation.isSaved ? "Unsave" : "Save client"
                          }
                          onClick={() =>
                            toggleFlag(
                              detail.client!._id,
                              "isSaved",
                              detail.relation.isSaved
                            )
                          }
                        >
                          <i
                            className={
                              detail.relation.isSaved
                                ? "fas fa-heart"
                                : "far fa-heart"
                            }
                          />
                        </button>
                        <button
                          type="button"
                          className={`fcm-icon-btn${
                            detail.relation.isBlocked ? " on-block" : ""
                          }`}
                          title={
                            detail.relation.isBlocked ? "Unblock" : "Block"
                          }
                          onClick={() =>
                            toggleFlag(
                              detail.client!._id,
                              "isBlocked",
                              detail.relation.isBlocked
                            )
                          }
                        >
                          <i className="fas fa-ban" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="fcm-detail-grid">
                    <div>
                      <h4 className="fcm-section-title">
                        <i className="fas fa-chart-line" /> Engagement
                      </h4>
                      <dl className="fcm-dl">
                        <dt>Total orders</dt>
                        <dd>{detail.metrics.totalOrders}</dd>
                        <dt>Completed</dt>
                        <dd>{detail.metrics.completedOrders}</dd>
                        <dt>Lifetime value</dt>
                        <dd>{formatMoney(detail.metrics.lifetimeValue)}</dd>
                        <dt>Avg. order</dt>
                        <dd>{formatMoney(detail.metrics.avgOrderValue)}</dd>
                        <dt>Last order</dt>
                        <dd>{formatDate(detail.metrics.lastOrderAt)}</dd>
                      </dl>
                    </div>
                    <div>
                      <h4 className="fcm-section-title">
                        <i className="fas fa-sticky-note" /> Private notes
                      </h4>
                      <textarea
                        className="fcm-notes"
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Preferences, communication style, project history… (only you can see this)"
                        rows={6}
                      />
                      <button
                        type="button"
                        className="fcm-btn dark"
                        disabled={savingNotes}
                        onClick={saveNotes}
                      >
                        {savingNotes ? "Saving…" : "Save notes"}
                      </button>
                    </div>
                  </div>

                  {(detail.client?.bio ||
                    skillList(detail.client?.preferredSkills).length > 0 ||
                    detail.client?.projectScale ||
                    detail.client?.keyRequirements) && (
                    <div className="fcm-pref-block">
                      <h4 className="fcm-section-title">
                        <i className="fas fa-briefcase" /> Public profile prefs
                      </h4>
                      {detail.client?.bio ? (
                        <p className="fcm-bio">{detail.client.bio}</p>
                      ) : null}
                      {skillList(detail.client?.preferredSkills).length > 0 ? (
                        <div className="fcm-tags">
                          {skillList(detail.client?.preferredSkills).map((s) => (
                            <span key={s} className="fcm-tag">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <dl className="fcm-dl fcm-dl-compact">
                        {detail.client?.preferredProjectType ? (
                          <>
                            <dt>Project type</dt>
                            <dd>
                              {detail.client.preferredProjectType === "fixed"
                                ? "Fixed price"
                                : detail.client.preferredProjectType}
                            </dd>
                          </>
                        ) : null}
                        {detail.client?.projectScale ? (
                          <>
                            <dt>Scale</dt>
                            <dd>
                              {SCALE_LABEL[detail.client.projectScale] ||
                                detail.client.projectScale}
                            </dd>
                          </>
                        ) : null}
                        {detail.client?.contactPref ? (
                          <>
                            <dt>Contact</dt>
                            <dd>
                              {CONTACT_LABEL[detail.client.contactPref] ||
                                detail.client.contactPref}
                            </dd>
                          </>
                        ) : null}
                        {detail.client?.escrowPref ? (
                          <>
                            <dt>Escrow</dt>
                            <dd>
                              {ESCROW_LABEL[detail.client.escrowPref] ||
                                detail.client.escrowPref}
                            </dd>
                          </>
                        ) : null}
                        {(detail.client?.minBudget != null ||
                          detail.client?.maxBudget != null) && (
                          <>
                            <dt>Typical budget</dt>
                            <dd>
                              {formatMoney(Number(detail.client?.minBudget) || 0)}{" "}
                              –{" "}
                              {formatMoney(Number(detail.client?.maxBudget) || 0)}
                            </dd>
                          </>
                        )}
                        {detail.client?.keyRequirements ? (
                          <>
                            <dt>Key requirements</dt>
                            <dd>{detail.client.keyRequirements}</dd>
                          </>
                        ) : null}
                      </dl>
                    </div>
                  )}

                  <h4 className="fcm-section-title">
                    <i className="fas fa-list-ul" /> Order history
                  </h4>
                  <div className="fcm-order-list">
                    {detail.orders.length === 0 ? (
                      <p className="fcm-muted">No orders found.</p>
                    ) : (
                      detail.orders.map((o) => (
                        <div key={o._id} className="fcm-order-item">
                          <div>
                            <Link
                              href={`/orders/${o._id}`}
                              className="fcm-order-link"
                            >
                              #{o.orderNumber}
                            </Link>
                            <span className="fcm-order-svc">
                              {o.serviceTitle}
                            </span>
                          </div>
                          <div className="fcm-order-right">
                            <span className="fcm-order-pay">
                              {formatMoney(o.payout || 0)}
                            </span>
                            <span className="fcm-order-status">
                              {statusLabel(o.status)}
                            </span>
                            <span className="fcm-muted">
                              {formatDate(o.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
