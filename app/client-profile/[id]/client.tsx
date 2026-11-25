// app/client-profile/[id]/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/client-profile.css";

type PublicUser = {
  _id: string;
  fullName?: string;
  displayName?: string;
  tagline?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  timezone?: string;
  languages?: string[] | string;
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
  emailVerified?: boolean;
  onlineStatus?: string;
  memberSince?: string;
  lastActiveAt?: string | null;
  orderVisibility?: boolean;
  responseRate?: number | null;
  responseTimeMinutes?: number | null;
  paymentMethodLabels?: string[];
};

type ProfileStats = {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  totalSpent: number;
  reliability: number | null;
  avgBuyerRating: number | null;
  avgResponseHours: number | null;
};

type ActiveOrder = {
  _id: string;
  orderNumber?: string;
  status?: string;
  title?: string;
  amount?: number;
  createdAt?: string;
};

type ReviewGiven = {
  rating?: number;
  review?: string;
  ratedAt?: string | null;
  serviceTitle?: string;
  sellerName?: string;
};

type Collaborator = {
  _id: string;
  displayName?: string;
  avatar?: string;
};

const TZ: Record<string, string> = {
  est: "EST (UTC-5)",
  pst: "PST (UTC-8)",
  gmt: "GMT (UTC+0)",
};

const SCALE: Record<string, string> = {
  small: "Small (Quick tasks, < $500)",
  medium: "Medium ($500 – $5k)",
  large: "Large (Enterprise / Long-term, $5k+)",
};

const CONTACT: Record<string, string> = {
  messaging: "Platform messaging",
  email: "Email",
  both: "Messaging & email",
};

const ESCROW: Record<string, string> = {
  always: "Always used",
  sometimes: "Sometimes used",
  never: "Rarely used",
};

const TYPE_LABELS: Record<string, string> = {
  "web-app-dev": "Web App Development",
  "cloud-infra": "Cloud Infrastructure",
  "ux-design": "UX/UI Design",
  seo: "SEO & Marketing",
  "tech-writing": "Technical Writing",
};

function showToast(
  message: string,
  type: "success" | "info" | "removed" = "success"
) {
  if (typeof document === "undefined") return;
  let root = document.getElementById("toast-container");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-container";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `toast${type === "info" ? " info" : type === "removed" ? " removed" : ""}`;
  const icon =
    type === "removed"
      ? "fa-exclamation-triangle"
      : type === "info"
        ? "fa-info-circle"
        : "fa-check-circle";
  el.innerHTML = `<i class="fas ${icon}"></i><span></span>`;
  const span = el.querySelector("span");
  if (span) span.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 3200);
}

function asList(v?: string[] | string): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function presenceClass(s?: string) {
  const x = String(s || "offline").toLowerCase();
  if (x === "online" || x === "true") return "status-online";
  if (x === "away") return "status-away";
  return "status-offline";
}

function formatMoney(n: number) {
  return `$${Number(n || 0).toLocaleString()}`;
}

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function getAuthHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

function getMyUserId(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("id") ||
    ""
  ).trim();
}

export default function ClientProfileClient({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    activeOrders: 0,
    totalSpent: 0,
    reliability: null,
    avgBuyerRating: null,
    avgResponseHours: null,
  });
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<ReviewGiven[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [mutual, setMutual] = useState<Collaborator[]>([]);
  const [reporting, setReporting] = useState(false);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [fav, setFav] = useState(false);
  const [mutualOpen, setMutualOpen] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((p) => setUserId(p.id));
    setMyId(getMyUserId());
  }, [params]);

  const isOwner = useMemo(() => {
    if (!userId || !myId) return false;
    return String(userId) === String(myId);
  }, [userId, myId]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/public`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Profile not found.");
        setUser(null);
        return;
      }
      const u = (data.user || data) as PublicUser;
      setUser({ ...u, _id: String(u._id || userId) });
      if (data.stats) {
        setStats({
          totalOrders: Number(data.stats.totalOrders) || 0,
          completedOrders: Number(data.stats.completedOrders) || 0,
          cancelledOrders: Number(data.stats.cancelledOrders) || 0,
          activeOrders: Number(data.stats.activeOrders) || 0,
          totalSpent: Number(data.stats.totalSpent) || 0,
          reliability:
            data.stats.reliability == null
              ? null
              : Number(data.stats.reliability),
          avgBuyerRating:
            data.stats.avgBuyerRating == null
              ? null
              : Number(data.stats.avgBuyerRating),
          avgResponseHours:
            data.stats.avgResponseHours == null
              ? null
              : Number(data.stats.avgResponseHours),
        });
      }
      setActiveOrders(Array.isArray(data.activeOrders) ? data.activeOrders : []);
      setReviewsGiven(Array.isArray(data.reviewsGiven) ? data.reviewsGiven : []);
      setCollaborators(
        Array.isArray(data.collaborators) ? data.collaborators : []
      );
      setMutual(Array.isArray(data.mutual) ? data.mutual : []);

      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token && String(userId) !== getMyUserId()) {
          const br = await fetch(
            `/api/bookmarks/check?itemType=User&itemId=${encodeURIComponent(userId)}`,
            {
              headers: getAuthHeaders(),
              credentials: "include",
              cache: "no-store",
            }
          );
          const bd = await br.json().catch(() => ({}));
          if (br.ok) {
            setFav(Boolean(bd.bookmarked || bd.exists || bd.isBookmarked));
          }
        }
      } catch {
        /* optional */
      }
    } catch {
      setError("Network error loading profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const tick = async () => {
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: [userId] }),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        let status = "";
        if (data.byId?.[userId]) status = String(data.byId[userId]);
        const rows = data.users || data.statuses || [];
        const hit = rows.find(
          (r: { _id?: string; id?: string }) =>
            String(r._id || r.id) === userId
        );
        if (hit) {
          status = String(
            (hit as { status?: string; onlineStatus?: string }).status ||
              (hit as { onlineStatus?: string }).onlineStatus ||
              status
          );
        }
        if (status) {
          setUser((prev) =>
            prev ? { ...prev, onlineStatus: status } : prev
          );
        }
      } catch {
        /* optional */
      }
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [userId]);

  const sendMessage = async () => {
    if (!msgText.trim() || !userId) return;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/?auth=login");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientId: userId,
          initialMessage: msgText.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not send message.", "removed");
        return;
      }
      setMsgOpen(false);
      setMsgText("");
      showToast("Message sent.");
      const cid = data.conversationId || data._id;
      if (cid) router.push(`/messages?c=${cid}`);
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setSending(false);
    }
  };

  const toggleFav = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/?auth=login");
      return;
    }
    try {
      if (fav) {
        await fetch(`/api/bookmarks?itemType=User&itemId=${userId}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        });
        setFav(false);
        showToast("Removed from favorites", "removed");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ itemType: "User", itemId: userId }),
        });
        if (!res.ok && res.status !== 409) {
          const d = await res.json().catch(() => ({}));
          showToast(d.message || "Could not save.", "removed");
          return;
        }
        setFav(true);
        showToast("Saved to favorites");
      }
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const submitReport = async () => {
    if (!reportReason || !reportDetails.trim()) {
      showToast("Choose a reason and add details.", "removed");
      return;
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/?auth=login");
      return;
    }
    setReporting(true);
    try {
      const res = await fetch(`/api/users/${userId}/report`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not submit report.", "removed");
        return;
      }
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
      showToast(data.message || "Report submitted. Our team will review.");
    } catch {
      showToast("Network error submitting report.", "removed");
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="cp-layout" style={{ padding: 40 }}>
        <p style={{ color: "#64748b" }}>
          <i className="fas fa-spinner fa-spin" /> Loading profile…
        </p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="cp-layout" style={{ padding: 40 }}>
        <p style={{ color: "#b91c1c" }}>{error || "Profile not found."}</p>
        <Link href="/">Back home</Link>
      </div>
    );
  }

  const name = user.displayName || user.fullName || "Client";
  const skills = asList(user.preferredSkills);
  const langs = asList(user.languages);
  const types = user.projectTypes || [];
  const status = presenceClass(user.onlineStatus);
  const statusLabel =
    status === "status-online"
      ? "Online"
      : status === "status-away"
        ? "Away"
        : "Offline";

  const budget =
    user.minBudget != null || user.maxBudget != null
      ? `${formatMoney(Number(user.minBudget) || 0)} – ${formatMoney(
          Number(user.maxBudget) || 0
        )}`
      : "—";

  const memberSince = user.memberSince
    ? new Date(user.memberSince).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  const paymentLabels =
    user.paymentMethodLabels && user.paymentMethodLabels.length
      ? user.paymentMethodLabels.join(", ")
      : "—";

  const responseRateLabel =
    user.responseRate != null ? `${Math.round(Number(user.responseRate))}%` : "—";

  const lastActiveLabel =
    status === "status-online"
      ? "Online now"
      : relativeTime(user.lastActiveAt);

  const stackPeople = mutual.length > 0 ? mutual : collaborators;
  const stackExtra = Math.max(0, stackPeople.length - 3);

  return (
    <>
      <section className="cp-hero" id="cp-hero">
        <div className="cp-hero-cover">
          {user.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.coverImage} alt="" id="cover-img" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80"
              alt=""
              id="cover-img"
            />
          )}
          <div className="cp-hero-overlay" />
          <div className="cp-hero-grain" />
        </div>

        <div className="cp-hero-topbar">
          <div className="cp-badge">
            <i className="fas fa-award" />
            <span>{isOwner ? "Your public profile" : "Client"}</span>
          </div>
          <div className="cp-online-pill">
            <span className={`cp-status-dot ${status}`} id="hero-status" />
            <span id="hero-status-text">{statusLabel}</span>
          </div>
        </div>

        <div className="cp-hero-body">
          <div className="cp-avatar-block">
            <div className="cp-avatar-ring">
              <Image
                src={user.avatar || "/default-avatar.png"}
                alt={name}
                width={112}
                height={112}
                id="avatar-img"
                unoptimized
              />
              <span className={`cp-avatar-status ${status}`} />
            </div>
          </div>

          <div className="cp-identity">
            <h1 className="cp-display-name" id="display-name">
              {name}
            </h1>
            <p className="cp-tagline" id="tagline">
              {user.tagline || "Client on Thick 9"}
            </p>
            <div className="cp-meta-row">
              {user.location ? (
                <span className="cp-meta-chip">
                  <i className="fas fa-map-marker-alt" />{" "}
                  <span id="location-text">{user.location}</span>
                </span>
              ) : null}
              {user.timezone ? (
                <span className="cp-meta-chip">
                  <i className="fas fa-clock" />{" "}
                  <span id="timezone-text">
                    {TZ[user.timezone] || user.timezone}
                  </span>
                </span>
              ) : null}
              {langs.length > 0 ? (
                <span className="cp-meta-chip">
                  <i className="fas fa-globe" />{" "}
                  <span id="languages-text">{langs.join(", ")}</span>
                </span>
              ) : null}
              {user.isVerified ? (
                <span className="cp-meta-chip verified">
                  <i className="fas fa-shield-halved" /> Verified
                </span>
              ) : null}
            </div>
          </div>

          <div className="cp-hero-actions">
            {isOwner ? (
              <>
                <Link
                  href="/client-settings#account-panel"
                  className="cp-btn-glass primary"
                >
                  <i className="fas fa-pen" /> Edit profile
                </Link>
                <Link
                  href="/client-settings#privacy-panel"
                  className="cp-btn-icon"
                  title="Privacy settings"
                >
                  <i className="fas fa-lock" />
                </Link>
                <Link
                  href="/client-orders-history"
                  className="cp-btn-icon"
                  title="My orders"
                >
                  <i className="fas fa-clipboard-list" />
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="cp-btn-glass primary"
                  onClick={() => setMsgOpen(true)}
                >
                  <i className="fas fa-envelope" /> Message
                </button>
                <button
                  type="button"
                  className="cp-btn-icon"
                  title="Video call"
                  onClick={() => showToast("Video call coming soon", "info")}
                >
                  <i className="fas fa-video" />
                </button>
                <button
                  type="button"
                  className={`cp-btn-icon${fav ? " is-active" : ""}`}
                  title={fav ? "Saved" : "Save to favorites"}
                  onClick={toggleFav}
                >
                  <i className="fas fa-heart" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="cp-hero-bottom">
          <div className="cp-stat-pill">
            <span className="cp-stat-val">
              {stats.avgResponseHours != null
                ? `${stats.avgResponseHours}h`
                : "—"}
            </span>
            <span className="cp-stat-lbl">Avg. Response</span>
          </div>
          <div className="cp-stat-pill">
            <span className="cp-stat-val">{stats.totalOrders}</span>
            <span className="cp-stat-lbl">Orders</span>
          </div>
          <div className="cp-stat-pill">
            <span className="cp-stat-val">
              {stats.reliability != null ? `${stats.reliability}%` : "—"}
            </span>
            <span className="cp-stat-lbl">Reliability</span>
          </div>
          <div className="cp-stat-pill">
            <span className="cp-stat-val">
              {stats.totalSpent > 0
                ? formatMoney(stats.totalSpent)
                : user.maxBudget != null
                  ? formatMoney(Number(user.maxBudget))
                  : "—"}
            </span>
            <span className="cp-stat-lbl">
              {stats.totalSpent > 0 ? "Invested" : "Typical max"}
            </span>
          </div>
        </div>
      </section>

      <div className="cp-layout">
        <main className="cp-main">
          {isOwner && (
            <div className="cp-owner-banner glass-card">
              <div className="glass-card-body" style={{ padding: "14px 18px" }}>
                <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
                  <i className="fas fa-eye" style={{ color: "#c45c5c", marginRight: 8 }} />
                  This is how freelancers see your public profile.{" "}
                  <Link href="/client-settings#account-panel">
                    Update public details
                  </Link>
                </p>
              </div>
            </div>
          )}

          <article className="glass-card">
            <header className="glass-card-head">
              <h2>
                <i className="fas fa-building" /> About
              </h2>
            </header>
            <div className="glass-card-body">
              <p className="cp-bio" id="bio-text">
                {user.bio || "No bio added yet."}
              </p>
            </div>
          </article>

          <article className="glass-card">
            <header className="glass-card-head">
              <h2>
                <i className="fas fa-briefcase" /> Project Preferences
              </h2>
            </header>
            <div className="glass-card-body">
              <div className="cp-pref-grid">
                <div className="cp-pref-item">
                  <span className="cp-pref-label">Preferred skills</span>
                  <div className="cp-tags" id="skills-tags">
                    {skills.length === 0 ? (
                      <span className="cp-tag soft">Not specified</span>
                    ) : (
                      skills.map((s) => (
                        <span key={s} className="cp-tag">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="cp-pref-item">
                  <span className="cp-pref-label">Typical project types</span>
                  <div className="cp-tags" id="project-types">
                    {types.length === 0 ? (
                      <span className="cp-tag soft">Not specified</span>
                    ) : (
                      types.map((t) => (
                        <span key={t} className="cp-tag soft">
                          {TYPE_LABELS[t] || t}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="cp-pref-row">
                  <div className="cp-pref-item">
                    <span className="cp-pref-label">Preferred type</span>
                    <span className="cp-pref-value" id="project-type">
                      {user.preferredProjectType === "fixed"
                        ? "Fixed Price"
                        : user.preferredProjectType || "Fixed Price"}
                    </span>
                  </div>
                  <div className="cp-pref-item">
                    <span className="cp-pref-label">Average scale</span>
                    <span className="cp-pref-value" id="project-scale">
                      {SCALE[user.projectScale || ""] ||
                        user.projectScale ||
                        "—"}
                    </span>
                  </div>
                </div>
                <div className="cp-pref-item">
                  <span className="cp-pref-label">Key requirements</span>
                  <p className="cp-pref-value muted" id="key-requirements">
                    {user.keyRequirements || "—"}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="glass-card">
            <header className="glass-card-head">
              <h2>
                <i className="fas fa-clipboard-list" /> Active Orders{" "}
                <small>{stats.activeOrders} ongoing</small>
              </h2>
            </header>
            <div className="glass-card-body">
              {activeOrders.length === 0 ? (
                <p className="cp-muted-sm" style={{ margin: 0 }}>
                  No active orders right now.
                </p>
              ) : (
                <ul className="cp-order-list">
                  {activeOrders.map((o) => (
                    <li key={o._id} className="cp-order">
                      <div className="cp-order-info">
                        <strong>{o.title || "Service order"}</strong>
                        <span className="cp-order-meta">
                          #{o.orderNumber}
                          {o.amount != null
                            ? ` · ${formatMoney(o.amount)}`
                            : ""}
                        </span>
                      </div>
                      <span
                        className={`cp-status ${
                          o.status === "in_escrow" ||
                          o.status === "revision_requested"
                            ? "in-progress"
                            : "pending"
                        }`}
                      >
                        {String(o.status || "").replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>

          <article className="glass-card">
            <header className="glass-card-head">
              <h2>
                <i className="fas fa-star" /> Reviews Given{" "}
                <small>
                  {stats.avgBuyerRating != null
                    ? `avg ${stats.avgBuyerRating}`
                    : `${reviewsGiven.length}`}
                </small>
              </h2>
            </header>
            <div className="glass-card-body">
              {reviewsGiven.length === 0 ? (
                <p className="cp-muted-sm" style={{ margin: 0 }}>
                  No public reviews yet.
                </p>
              ) : (
                reviewsGiven.map((r, i) => (
                  <div key={i} className="cp-review">
                    <div className="cp-review-top">
                      <span className="cp-stars">
                        <i className="fas fa-star" /> {r.rating ?? "—"}
                      </span>
                      <span className="cp-review-to">
                        to {r.sellerName} · {r.serviceTitle}
                      </span>
                    </div>
                    {r.review ? (
                      <p className="cp-review-text">“{r.review}”</p>
                    ) : null}
                    {r.ratedAt ? (
                      <time className="cp-review-date">
                        {new Date(r.ratedAt).toLocaleDateString()}
                      </time>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </main>

        <aside className="cp-sidebar">
          {/* Communication — prototype match */}
          <section className="glass-widget">
            <h3 className="glass-widget-title">
              <i className="fas fa-comment-dots" /> Communication
            </h3>
            <div className="cp-info-list">
              <div className="cp-info-row">
                <span>Contact preference</span>
                <strong id="contact-pref">
                  {CONTACT[user.contactPref || ""] ||
                    user.contactPref ||
                    "Platform messaging"}
                </strong>
              </div>
              <div className="cp-info-row">
                <span>Response rate</span>
                <strong className={user.responseRate != null ? "good" : ""}>
                  {responseRateLabel}
                </strong>
              </div>
              <div className="cp-info-row">
                <span>Last active</span>
                <strong>{lastActiveLabel}</strong>
              </div>
            </div>
          </section>

          {/* Budget & Payment — prototype match */}
          <section className="glass-widget">
            <h3 className="glass-widget-title">
              <i className="fas fa-money-bill-wave" /> Budget &amp; Payment
            </h3>
            <div className="cp-info-list">
              <div className="cp-info-row">
                <span>Typical range</span>
                <strong id="budget-range">{budget}</strong>
              </div>
              <div className="cp-info-row">
                <span>Escrow</span>
                <strong className="good" id="escrow-pref">
                  {ESCROW[user.escrowPref || ""] || user.escrowPref || "—"}
                </strong>
              </div>
              <div className="cp-info-row">
                <span>Payment methods</span>
                <strong>{paymentLabels}</strong>
              </div>
            </div>
          </section>

          {/* Trust & Security — prototype match */}
          <section className="glass-widget">
            <h3 className="glass-widget-title">
              <i className="fas fa-user-shield" /> Trust &amp; Security
            </h3>
            <div className="cp-info-list">
              <div className="cp-info-row">
                <span>Identity</span>
                <strong className={user.isVerified ? "good" : ""}>
                  {user.isVerified ? "Verified" : "—"}
                </strong>
              </div>
              <div className="cp-info-row">
                <span>2FA</span>
                <strong className={user.twoFactorEnabled ? "good" : ""}>
                  {user.twoFactorEnabled ? "Enabled" : "Not enabled"}
                </strong>
              </div>
              <div className="cp-info-row">
                <span>Email</span>
                <strong className={user.emailVerified ? "good" : ""}>
                  {user.emailVerified ? "Verified" : "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="glass-widget">
            <h3 className="glass-widget-title">
              <i className="fas fa-chart-line" /> Account
            </h3>
            <div className="cp-info-list">
              <div className="cp-info-row">
                <span>Member since</span>
                <strong>{memberSince}</strong>
              </div>
              <div className="cp-info-row">
                <span>Total orders</span>
                <strong>{stats.totalOrders}</strong>
              </div>
              <div className="cp-info-row">
                <span>Completed</span>
                <strong>{stats.completedOrders}</strong>
              </div>
              <div className="cp-info-row">
                <span>Active</span>
                <strong>{stats.activeOrders}</strong>
              </div>
            </div>
          </section>

          {/* Mutual / collaborators */}
          <section className="glass-widget" id="mutual-widget">
            <h3 className="glass-widget-title">
              <i className="fas fa-users" />{" "}
              {mutual.length > 0 ? "Mutual connections" : "Collaborators"}
            </h3>
            {stackPeople.length === 0 ? (
              <p className="cp-muted-sm">
                {isOwner
                  ? "Freelancers you hire will appear here for visitors."
                  : "No shared connections yet."}
              </p>
            ) : (
              <>
                <div
                  className="cp-avatar-stack"
                  onClick={() => setMutualOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setMutualOpen(true);
                  }}
                >
                  {stackPeople.slice(0, 3).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p._id}
                      src={p.avatar || "/default-avatar.png"}
                      alt={p.displayName || ""}
                    />
                  ))}
                  {stackExtra > 0 ? (
                    <span className="cp-stack-more">+{stackExtra}</span>
                  ) : null}
                </div>
                <p className="cp-muted-sm">
                  {mutual.length > 0
                    ? "See which of your connections know this client."
                    : "Freelancers this client has worked with."}
                </p>
              </>
            )}
          </section>

          {/* Report — visitors only */}
          {!isOwner && (
            <section className="glass-widget report-widget">
              <h3 className="glass-widget-title">
                <i className="fas fa-flag" /> Help
              </h3>
              <p className="cp-muted-sm">Issue with this profile?</p>
              <button
                type="button"
                className="cp-btn-danger full"
                onClick={() => setReportOpen(true)}
              >
                <i className="fas fa-flag" /> Report client
              </button>
            </section>
          )}

          {isOwner && (
            <section className="glass-widget">
              <h3 className="glass-widget-title">
                <i className="fas fa-cog" /> Manage
              </h3>
              <Link
                href="/client-settings"
                className="cp-btn-ghost full"
                style={{ marginBottom: 8 }}
              >
                <i className="fas fa-sliders-h" /> Account settings
              </Link>
              <Link
                href="/client-orders-history"
                className="cp-btn-ghost full"
              >
                <i className="fas fa-history" /> Order history
              </Link>
            </section>
          )}
        </aside>
      </div>

      {/* Message modal — visitors */}
      {msgOpen && !isOwner && (
        <div
          className="cp-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMsgOpen(false);
          }}
        >
          <div className="cp-modal" role="dialog">
            <div className="cp-modal-head">
              <div className="cp-modal-avatar">
                <Image
                  src={user.avatar || "/default-avatar.png"}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                />
                <span className={`cp-avatar-status ${status}`} />
              </div>
              <h3>Message {name}</h3>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => setMsgOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="cp-modal-body">
              <label htmlFor="msg-text">Your message</label>
              <textarea
                id="msg-text"
                rows={5}
                maxLength={1000}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Describe your inquiry…"
              />
              <div className="cp-modal-row">
                <span className="cp-char-count">{msgText.length}/1000</span>
              </div>
            </div>
            <div className="cp-modal-foot">
              <button
                type="button"
                className="cp-btn-ghost"
                onClick={() => setMsgOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cp-btn-glass primary"
                disabled={sending}
                onClick={sendMessage}
              >
                {sending ? "Sending…" : "Send message"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mutual / collaborators modal */}
      {mutualOpen && (
        <div
          className="cp-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMutualOpen(false);
          }}
        >
          <div className="cp-modal cp-modal-sm" role="dialog">
            <div className="cp-modal-head">
              <h3>
                {mutual.length > 0 ? "Mutual connections" : "Collaborators"}
              </h3>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => setMutualOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="cp-modal-body cp-mutual-list">
              {stackPeople.map((p) => (
                <div key={p._id} className="cp-mutual-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatar || "/default-avatar.png"}
                    alt=""
                  />
                  <div>
                    <strong>{p.displayName || "Freelancer"}</strong>
                    <span>Freelancer</span>
                  </div>
                  <Link
                    href={`/freelancer-profile?id=${p._id}`}
                    className="cp-link"
                    onClick={() => setMutualOpen(false)}
                  >
                    Profile
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reportOpen && !isOwner && (
        <div
          className="cp-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
        >
          <div className="cp-modal" role="dialog">
            <div className="cp-modal-head">
              <h3>Report client</h3>
              <button
                type="button"
                className="cp-modal-close"
                onClick={() => setReportOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="cp-modal-body">
              <label htmlFor="report-reason">Reason</label>
              <select
                id="report-reason"
                className="cp-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">Select a reason…</option>
                <option value="spam">Spam or scams</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="fake">Fake profile / misrepresentation</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="report-details" style={{ marginTop: "1rem" }}>
                Additional details
              </label>
              <textarea
                id="report-details"
                rows={4}
                maxLength={500}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
            <div className="cp-modal-foot">
              <button
                type="button"
                className="cp-btn-ghost"
                onClick={() => setReportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cp-btn-glass primary"
                disabled={reporting}
                onClick={submitReport}
              >
                {reporting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </>
  );
}
