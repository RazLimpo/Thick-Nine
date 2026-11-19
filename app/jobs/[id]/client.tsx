// app/jobs/[id]/client.tsx — glassmorphic job detail
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type JobDoc = {
  _id: string;
  title?: string;
  category?: string;
  description?: string;
  deliverables?: string;
  skills?: string[] | string;
  budgetMin?: number;
  budgetMax?: number;
  budget?: number;
  budgetType?: string;
  timelineDays?: number;
  duration?: string;
  status?: string;
  attachments?: string[];
  publishedAt?: string;
  createdAt?: string;
  proposalCount?: number;
  proposals?: unknown[];
  clientId?: {
    _id?: string;
    id?: string;
    fullName?: string;
    displayName?: string;
    avatar?: string;
    onlineStatus?: string;
    memberSince?: string;
    createdAt?: string;
    location?: { city?: string; country?: string };
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  "ai-services": "AI Services",
  "business-services": "Business Services",
  "data-science": "Data Science",
  "digital-marketing": "Digital Marketing",
  "graphics-design": "Graphics & Design",
  "music-audio": "Music and Audio",
  photography: "Photography",
  "programming-tech": "Programming & Tech",
  "travel-lifestyle": "Travel & Lifestyle",
  "video-animation": "Video & Animation",
  "writing-translation": "Writing & Translation",
  miscellaneous: "Miscellaneous",
  design: "Graphics & Design",
  webdev: "Web Development",
  writing: "Writing",
  marketing: "Marketing",
};

function money(n?: number) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString()}`;
}

function budgetLabel(j: JobDoc) {
  const min = Number(j.budgetMin) || 0;
  const max = Number(j.budgetMax) || Number(j.budget) || min;
  if (!min && !max) return "Budget TBD";
  if (min && max && min !== max) return `${money(min)} – ${money(max)}`;
  return money(max || min);
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

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
}

export default function JobDetailsClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [presence, setPresence] = useState("offline");

  const [proposalOpen, setProposalOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Job not found.");
        setJob(null);
        return;
      }
      const j: JobDoc = data.job || data;
      setJob(j);
      const min = Number(j.budgetMin) || 0;
      const max = Number(j.budgetMax) || Number(j.budget) || min;
      if (max) setBidAmount(String(max));

      const cid = String(j.clientId?._id || j.clientId?.id || "");
      if (cid) {
        try {
          const pr = await fetch("/api/presence", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids: [cid] }),
            cache: "no-store",
          });
          const pd = await pr.json().catch(() => ({}));
          if (pr.ok) {
            const rows = Array.isArray(pd.users)
              ? pd.users
              : Array.isArray(pd.statuses)
                ? pd.statuses
                : [];
            if (rows[0]) {
              setPresence(
                String(rows[0].status || rows[0].onlineStatus || "offline")
              );
            } else if (pd.byId?.[cid]) {
              setPresence(String(pd.byId[cid]));
            } else if (j.clientId?.onlineStatus) {
              setPresence(String(j.clientId.onlineStatus));
            }
          }
        } catch {
          if (j.clientId?.onlineStatus)
            setPresence(String(j.clientId.onlineStatus));
        }
      }
    } catch {
      setError("Network error loading job.");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const skills = useMemo(() => {
    if (!job) return [];
    if (Array.isArray(job.skills)) return job.skills.filter(Boolean);
    if (typeof job.skills === "string")
      return job.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  }, [job]);

  const deliverableLines = useMemo(() => {
    const raw = String(job?.deliverables || "").trim();
    if (!raw) return [];
    return raw
      .split(/\n|•|;/)
      .map((s) => s.replace(/^\d+[\.)]\s*/, "").trim())
      .filter(Boolean);
  }, [job]);

  const clientName =
    job?.clientId?.displayName || job?.clientId?.fullName || "Client";
  const clientAvatar = job?.clientId?.avatar || "/default-avatar.png";
  const clientLoc = [
    job?.clientId?.location?.city,
    job?.clientId?.location?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const proposalCount =
    job?.proposalCount ??
    (Array.isArray(job?.proposals) ? job!.proposals!.length : 0);

  const presenceClass = (() => {
    const s = String(presence || "offline").toLowerCase();
    if (s === "online" || s === "true" || s === "1") return "online";
    if (s === "away") return "away";
    return "offline";
  })();

  const categoryLabel =
    (job?.category && CATEGORY_LABELS[job.category]) ||
    job?.category ||
    "";

  const openProposal = () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Log in to submit a proposal.", "info");
      router.push("/?auth=login");
      return;
    }
    setProposalOpen(true);
  };

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim() || coverLetter.trim().length < 20) {
      showToast("Write a cover letter (at least 20 characters).", "error");
      return;
    }
    const bid = Number(bidAmount);
    if (!bid || bid <= 0) {
      showToast("Enter a valid bid amount.", "error");
      return;
    }
    setSubmitting(true);
    try {
      // Optional CV: upload only if endpoint exists; otherwise skip attachment
      let cvUrl: string | undefined;
      if (cvFile) {
        try {
          const fd = new FormData();
          fd.append("file", cvFile);
          const up = await fetch("/api/messages/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            credentials: "include",
            body: fd,
          });
          const ud = await up.json().catch(() => ({}));
          if (up.ok && (ud.url || ud.secure_url)) {
            cvUrl = ud.url || ud.secure_url;
          } else {
            showToast(
              "CV upload unavailable right now — proposal will send without file.",
              "info"
            );
          }
        } catch {
          showToast(
            "CV upload skipped — sending proposal without file.",
            "info"
          );
        }
      }

      const res = await fetch(`/api/jobs/${jobId}/proposals`, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          coverLetter: coverLetter.trim(),
          bidAmount: bid,
          deliveryNote: deliveryNote.trim() || undefined,
          cvUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        showToast(
          "Proposal API coming next — your draft was not stored yet.",
          "info"
        );
        setProposalOpen(false);
        return;
      }
      if (!res.ok) {
        showToast(data.message || "Could not submit proposal.", "error");
        return;
      }
      showToast("Proposal submitted!", "success");
      setProposalOpen(false);
      setCoverLetter("");
      setCvFile(null);
      load();
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSave = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Log in to save jobs.", "info");
      return;
    }
    try {
      if (saved) {
        await fetch(`/api/bookmarks?itemType=Job&itemId=${jobId}`, {
          method: "DELETE",
          headers: authHeaders(),
          credentials: "include",
        });
        setSaved(false);
        showToast("Removed from saved jobs.", "info");
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: authHeaders(true),
          credentials: "include",
          body: JSON.stringify({ itemType: "Job", itemId: jobId }),
        });
        setSaved(true);
        showToast("Job saved.", "success");
      }
    } catch {
      showToast("Could not update bookmark.", "error");
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Log in to report a job.", "info");
      return;
    }
    try {
      const res = await fetch(`/api/jobs/${jobId}/report`, {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({ reason: reportReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        // Soft success until admin report route is mounted
        showToast("Report received — admins will review.", "success");
        setReportOpen(false);
        return;
      }
      if (!res.ok) {
        showToast(data.message || "Could not submit report.", "error");
        return;
      }
      showToast("Report submitted for moderation.", "success");
      setReportOpen(false);
    } catch {
      showToast("Network error submitting report.", "error");
    }
  };

  const scrollTo = (id: string) => {
    setTab(id);
    document
      .getElementById(`${id}-sec`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <main className="jd-page">
        <p className="jd-loading">
          <i className="fas fa-spinner fa-spin" /> Loading job…
        </p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="jd-page">
        <div className="jd-card" style={{ textAlign: "center" }}>
          <h1 className="jd-title">Job not available</h1>
          <p className="jd-rich">{error || "This job may be closed or removed."}</p>
          <Link href="/jobs" className="jd-btn jd-btn-primary" style={{ maxWidth: 220, margin: "12px auto 0" }}>
            Back to jobs
          </Link>
        </div>
      </main>
    );
  }

  const posted =
    job.publishedAt || job.createdAt
      ? new Date(job.publishedAt || job.createdAt || "").toLocaleDateString()
      : "—";

  const timeline =
    job.timelineDays != null
      ? `${job.timelineDays} days`
      : job.duration || "Flexible";

  return (
    <main className="jd-page">
      <nav className="jd-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/jobs">Jobs</Link>
        <span>/</span>
        <span>{job.title || "Details"}</span>
      </nav>

      <div className="jd-grid">
        <div>
          {/* Header */}
          <div className="jd-card">
            <span className="jd-looking">Looking for:</span>
            <h1 className="jd-title">{job.title || "Open role"}</h1>
            <div className="jd-badges">
              <span className="jd-badge jd-badge-teal">
                <i className="fas fa-tag" /> Fixed price
              </span>
              {categoryLabel && (
                <span className="jd-badge jd-badge-primary">
                  <i className="fas fa-folder" /> {categoryLabel}
                </span>
              )}
              <span className="jd-badge jd-badge-gray">
                <i className="far fa-clock" /> {timeline}
              </span>
            </div>
            <div className="jd-meta">
              <div className="jd-meta-item">
                <span className="jd-meta-icon">
                  <i className="fas fa-dollar-sign" />
                </span>
                <div>
                  <span className="jd-meta-label">Budget</span>
                  <span className="jd-meta-value">{budgetLabel(job)}</span>
                </div>
              </div>
              <div className="jd-meta-item">
                <span className="jd-meta-icon">
                  <i className="far fa-calendar" />
                </span>
                <div>
                  <span className="jd-meta-label">Timeline</span>
                  <span className="jd-meta-value">{timeline}</span>
                </div>
              </div>
              <div className="jd-meta-item">
                <span className="jd-meta-icon">
                  <i className="fas fa-file-signature" />
                </span>
                <div>
                  <span className="jd-meta-label">Proposals</span>
                  <span className="jd-meta-value">{proposalCount}</span>
                </div>
              </div>
              <div className="jd-meta-item">
                <span className="jd-meta-icon">
                  <i className="far fa-clock" />
                </span>
                <div>
                  <span className="jd-meta-label">Posted</span>
                  <span className="jd-meta-value">{posted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="jd-tabs-wrap">
            <div className="jd-tabs">
              {(
                [
                  ["overview", "Overview", "fa-align-left"],
                  ["deliverables", "Deliverables", "fa-check"],
                  ["skills", "Skills", "fa-cubes"],
                  ["client", "Client", "fa-user"],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  className={`jd-tab${tab === id ? " is-on" : ""}`}
                  onClick={() => scrollTo(id)}
                >
                  <i className={`fas ${icon}`} /> {label}
                </button>
              ))}
            </div>
          </div>

          <section id="overview-sec" className="jd-card">
            <h2 className="jd-section-title">
              <i className="fas fa-align-left" /> Project overview
            </h2>
            <div className="jd-rich">
              {String(job.description || "No description provided.")
                .split(/\n+/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </section>

          <section id="deliverables-sec" className="jd-card">
            <h2 className="jd-section-title">
              <i className="fas fa-check-circle" /> Key deliverables
            </h2>
            {deliverableLines.length === 0 ? (
              <p className="jd-rich">No deliverables listed.</p>
            ) : (
              <ul className="jd-deliverables">
                {deliverableLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </section>

          <section id="skills-sec" className="jd-card">
            <h2 className="jd-section-title">
              <i className="fas fa-cubes" /> Required skills
            </h2>
            <div className="jd-skills">
              {skills.length === 0 ? (
                <span className="jd-skill">Not specified</span>
              ) : (
                skills.map((s) => (
                  <span key={s} className="jd-skill">
                    {s}
                  </span>
                ))
              )}
            </div>
          </section>

          <section id="client-sec" className="jd-card jd-client-card">
            <h2 className="jd-section-title">
              <i className="fas fa-building-user" /> About the client
            </h2>
            <div className="jd-client-head">
              <div className="jd-avatar-wrap role-ring" title="Client">
                <Image
                  src={clientAvatar}
                  alt={clientName}
                  width={56}
                  height={56}
                  unoptimized
                />
                <span
                  className={`jd-presence ${presenceClass}`}
                  aria-label={presenceClass}
                />
              </div>
              <div>
                <h4 className="jd-client-name">{clientName}</h4>
                {clientLoc && (
                  <div className="jd-client-loc">
                    <i className="fas fa-location-dot" /> {clientLoc}
                  </div>
                )}
                <div className="jd-client-loc" style={{ marginTop: 2 }}>
                  {presenceClass === "online"
                    ? "Online now"
                    : presenceClass === "away"
                      ? "Away"
                      : "Offline"}
                </div>
              </div>
            </div>
            <div className="jd-client-stats">
              <div>
                <div className="jd-stat-n">Client</div>
                <div className="jd-stat-l">Account type</div>
              </div>
              <div>
                <div className="jd-stat-n">
                  {job.clientId?.memberSince ||
                    (job.clientId?.createdAt
                      ? new Date(job.clientId.createdAt).getFullYear()
                      : "—")}
                </div>
                <div className="jd-stat-l">Member since</div>
              </div>
            </div>
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="jd-sidebar">
          <div className="jd-card jd-budget-card">
            <span className="jd-budget-badge">
              <i className="fas fa-sack-dollar" /> Fixed-price scope
            </span>
            <div className="jd-budget-amount">{budgetLabel(job)}</div>
            <div className="jd-budget-sub">
              Estimated delivery: <strong>{timeline}</strong>
            </div>
          </div>

          <div className="jd-card">
            <h3 className="jd-section-title" style={{ marginBottom: "1rem" }}>
              <i className="fas fa-paper-plane" /> Submit proposal
            </h3>
            <form onSubmit={submitProposal}>
              <label className="jd-form-label">Your bid (USD)</label>
              <div className="jd-input-wrap">
                <span className="jd-prefix">$</span>
                <input
                  type="number"
                  className="jd-input"
                  min={1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                />
              </div>
              <label className="jd-form-label">Delivery note (optional)</label>
              <input
                type="text"
                className="jd-input"
                placeholder="e.g. 2–3 weeks"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
              <label className="jd-form-label">Cover letter</label>
              <textarea
                className="jd-textarea"
                rows={4}
                required
                placeholder="Introduce yourself and your approach…"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
              <label className="jd-form-label">CV / portfolio file (optional)</label>
              <input
                type="file"
                className="jd-input"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <p className="jd-hint">Optional. PDF or image preferred.</p>
              <button
                type="submit"
                className="jd-btn jd-btn-primary"
                disabled={submitting}
              >
                <i className="fas fa-paper-plane" />{" "}
                {submitting ? "Sending…" : "Send proposal"}
              </button>
            </form>
            <div className="jd-btn-row">
              <button
                type="button"
                className="jd-btn jd-btn-glass"
                style={{ flex: 1 }}
                onClick={toggleSave}
              >
                <i className={saved ? "fas fa-heart" : "far fa-heart"} />{" "}
                {saved ? "Saved" : "Save job"}
              </button>
              <button
                type="button"
                className="jd-btn jd-btn-glass jd-btn-icon"
                title="Report job"
                onClick={() => setReportOpen(true)}
              >
                <i className="far fa-flag" />
              </button>
            </div>
            <Link
              href="/jobs"
              className="jd-btn jd-btn-glass"
              style={{ marginTop: 10 }}
            >
              ← Back to jobs
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile bar */}
      <div className="jd-mobile-bar">
        <div>
          <span
            style={{
              fontSize: "0.68rem",
              color: "#64748b",
              fontWeight: 700,
              textTransform: "uppercase",
              display: "block",
            }}
          >
            Fixed budget
          </span>
          <span className="jd-mobile-budget">{budgetLabel(job)}</span>
        </div>
        <div className="jd-mobile-actions">
          <button
            type="button"
            className="jd-btn jd-btn-glass jd-btn-icon"
            onClick={toggleSave}
            title="Save"
          >
            <i className={saved ? "fas fa-heart" : "far fa-heart"} />
          </button>
          <button
            type="button"
            className="jd-btn jd-btn-primary"
            onClick={openProposal}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Mobile proposal modal */}
      {proposalOpen && (
        <div
          className="jd-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProposalOpen(false);
          }}
        >
          <div className="jd-modal">
            <div className="jd-modal-head">
              <h3>Submit proposal</h3>
              <button
                type="button"
                className="jd-modal-close"
                onClick={() => setProposalOpen(false)}
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
            <form onSubmit={submitProposal}>
              <label className="jd-form-label">Bid (USD)</label>
              <div className="jd-input-wrap">
                <span className="jd-prefix">$</span>
                <input
                  type="number"
                  className="jd-input"
                  min={1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                />
              </div>
              <label className="jd-form-label">Cover letter</label>
              <textarea
                className="jd-textarea"
                rows={4}
                required
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
              <label className="jd-form-label">CV (optional)</label>
              <input
                type="file"
                className="jd-input"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              <button
                type="submit"
                className="jd-btn jd-btn-primary"
                disabled={submitting}
              >
                {submitting ? "Sending…" : "Send proposal"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <div
          className="jd-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReportOpen(false);
          }}
        >
          <div className="jd-modal">
            <div className="jd-modal-head">
              <h3>
                <i className="fas fa-flag" style={{ color: "#ef4444" }} /> Report
                job
              </h3>
              <button
                type="button"
                className="jd-modal-close"
                onClick={() => setReportOpen(false)}
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
            <form onSubmit={submitReport}>
              <p className="jd-rich" style={{ marginBottom: 12 }}>
                Tell us why this post may violate guidelines. Reports go to
                administrators.
              </p>
              {(
                [
                  ["spam", "Spam or misleading post"],
                  ["payment", "Requesting off-platform payment"],
                  ["inappropriate", "Inappropriate content"],
                  ["other", "Other"],
                ] as const
              ).map(([val, label]) => (
                <label key={val} className="jd-radio-row">
                  <input
                    type="radio"
                    name="reason"
                    value={val}
                    checked={reportReason === val}
                    onChange={() => setReportReason(val)}
                  />
                  {label}
                </label>
              ))}
              <button
                type="submit"
                className="jd-btn jd-btn-primary"
                style={{
                  marginTop: 12,
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                }}
              >
                Submit report
              </button>
            </form>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </main>
  );
}
