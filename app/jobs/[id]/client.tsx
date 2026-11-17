// app/jobs/[id]/client.tsx
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
  skills?: string[];
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
    location?: { city?: string; country?: string };
  };
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

function showToast(message: string, type: "info" | "success" | "error" = "info") {
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

export default function JobDetailsClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "deliverables" | "skills" | "client">(
    "overview"
  );
  const [proposalOpen, setProposalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (typeof window !== "undefined") {
        const t = localStorage.getItem("token");
        if (t) headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(`/api/jobs/${jobId}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Job not found.");
        setJob(null);
        return;
      }
      setJob(data.job || data);
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

  const client = job?.clientId;
  const clientName =
    client?.displayName || client?.fullName || "Client";
  const clientAvatar = client?.avatar || "/default-avatar.png";
  const clientLoc = [client?.location?.city, client?.location?.country]
    .filter(Boolean)
    .join(", ");

  const skills = useMemo(
    () => (Array.isArray(job?.skills) ? job!.skills! : []),
    [job]
  );

  const deliverableLines = useMemo(() => {
    const raw = String(job?.deliverables || "").trim();
    if (!raw) return [];
    return raw
      .split(/\n|•|;/)
      .map((s) => s.replace(/^\d+[\.)]\s*/, "").trim())
      .filter(Boolean);
  }, [job]);

  const proposalCount =
    job?.proposalCount ??
    (Array.isArray(job?.proposals) ? job!.proposals!.length : 0);

  const openProposal = () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Log in as a freelancer to apply.", "info");
      router.push("/?auth=login");
      return;
    }
    setProposalOpen(true);
  };

  const submitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    // Proposals API can be added next; toast for now so UI is complete
    if (!coverLetter.trim() || coverLetter.trim().length < 20) {
      showToast("Write a short cover letter (min 20 characters).", "error");
      return;
    }
    const bid = Number(bidAmount);
    if (!bid || bid <= 0) {
      showToast("Enter a valid bid amount.", "error");
      return;
    }
    setSubmitting(true);
    try {
      // When ready: POST /api/jobs/:id/proposals
      const res = await fetch(`/api/jobs/${jobId}/proposals`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({
          coverLetter: coverLetter.trim(),
          bidAmount: bid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        showToast(
          "Proposal endpoint coming next — your draft was not sent yet.",
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
      setBidAmount("");
      load();
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="main-layout">
        <p className="rich-text" style={{ padding: 24 }}>
          <i className="fas fa-spinner fa-spin" /> Loading job…
        </p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="main-layout">
        <div className="glass-card" style={{ textAlign: "center", padding: 32 }}>
          <h1 className="job-title">Job not available</h1>
          <p className="rich-text">{error || "This job may be closed or removed."}</p>
          <Link href="/jobs" className="btn btn-primary" style={{ marginTop: 12 }}>
            Back to jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="main-layout">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">
          <i className="fas fa-home" /> Home
        </Link>
        <span>/</span>
        <Link href="/jobs">Jobs</Link>
        <span>/</span>
        <span title={job.title}>{job.title}</span>
      </nav>

      <div className="grid-container">
        <div className="main-content-column">
          {/* Header card */}
          <div className="glass-card">
            <div className="badge-group">
              {job.category && (
                <span className="badge badge-primary">
                  <i className="fas fa-folder" /> {job.category}
                </span>
              )}
              <span className="badge badge-teal">
                <i className="fas fa-circle" style={{ fontSize: 6 }} /> Open
              </span>
              <span className="badge badge-gray">
                {job.budgetType === "hourly" ? "Hourly" : "Fixed price"}
              </span>
            </div>
            <h1 className="job-title">{job.title}</h1>
            <div className="job-meta-grid">
              <div className="meta-item">
                <span className="meta-icon">
                  <i className="fas fa-dollar-sign" />
                </span>
                <div>
                  <span className="meta-label">Budget</span>
                  <span className="meta-value">{budgetLabel(job)}</span>
                </div>
              </div>
              <div className="meta-item">
                <span className="meta-icon">
                  <i className="far fa-clock" />
                </span>
                <div>
                  <span className="meta-label">Timeline</span>
                  <span className="meta-value">
                    {job.timelineDays
                      ? `${job.timelineDays} days`
                      : job.duration || "Flexible"}
                  </span>
                </div>
              </div>
              <div className="meta-item">
                <span className="meta-icon">
                  <i className="fas fa-file-signature" />
                </span>
                <div>
                  <span className="meta-label">Proposals</span>
                  <span className="meta-value">{proposalCount}</span>
                </div>
              </div>
              <div className="meta-item">
                <span className="meta-icon">
                  <i className="far fa-calendar" />
                </span>
                <div>
                  <span className="meta-label">Posted</span>
                  <span className="meta-value">
                    {job.publishedAt || job.createdAt
                      ? new Date(
                          job.publishedAt || job.createdAt || ""
                        ).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="mobile-tabs-wrapper">
            <div className="tab-nav">
              {(
                [
                  ["overview", "Overview", "fa-align-left"],
                  ["deliverables", "Deliverables", "fa-check-circle"],
                  ["skills", "Skills", "fa-tags"],
                  ["client", "Client", "fa-user"],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  className={`tab-btn${tab === id ? " active" : ""}`}
                  onClick={() => {
                    setTab(id);
                    document
                      .getElementById(`${id}-sec`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <i className={`fas ${icon}`} /> {label}
                </button>
              ))}
            </div>
          </div>

          <section id="overview-sec" className="glass-card">
            <h2 className="section-title">
              <i className="fas fa-align-left" /> Project overview
            </h2>
            <div className="rich-text">
              {String(job.description || "")
                .split(/\n+/)
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </section>

          <section id="deliverables-sec" className="glass-card">
            <h2 className="section-title">
              <i className="fas fa-check-circle" /> Deliverables
            </h2>
            {deliverableLines.length === 0 ? (
              <p className="rich-text">No deliverables listed.</p>
            ) : (
              <ul className="deliverables-list">
                {deliverableLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </section>

          <section id="skills-sec" className="glass-card">
            <h2 className="section-title">
              <i className="fas fa-tags" /> Skills required
            </h2>
            <div className="badge-group">
              {skills.length === 0 ? (
                <span className="badge badge-gray">Not specified</span>
              ) : (
                skills.map((s) => (
                  <span key={s} className="badge badge-primary">
                    {s}
                  </span>
                ))
              )}
            </div>
          </section>

          <section id="client-sec" className="glass-card">
            <h2 className="section-title">
              <i className="fas fa-user" /> About the client
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Image
                src={clientAvatar}
                alt={clientName}
                width={48}
                height={48}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                unoptimized
              />
              <div>
                <strong>{clientName}</strong>
                {clientLoc && (
                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    <i className="fas fa-map-marker-alt" /> {clientLoc}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="sidebar-column">
          <div className="glass-card" style={{ position: "sticky", top: 72 }}>
            <div className="meta-value" style={{ fontSize: "1.35rem", marginBottom: 8 }}>
              {budgetLabel(job)}
            </div>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 16 }}>
              {job.budgetType === "hourly" ? "Hourly rate range" : "Fixed-price budget"}
            </p>
            <button
              type="button"
              className="btn btn-primary full-width-btn"
              onClick={openProposal}
            >
              <i className="fas fa-paper-plane" /> Submit proposal
            </button>
            <Link
              href="/jobs"
              className="btn btn-secondary full-width-btn"
              style={{ marginTop: 10 }}
            >
              Back to jobs
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="mobile-bottom-bar">
        <div>
          <strong>{budgetLabel(job)}</strong>
        </div>
        <button type="button" className="btn btn-primary" onClick={openProposal}>
          Apply
        </button>
      </div>

      {proposalOpen && (
        <div
          className="modal-overlay open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProposalOpen(false);
          }}
        >
          <div className="modal-card glass-card">
            <h3 className="section-title">Submit proposal</h3>
            <form onSubmit={submitProposal}>
              <label style={{ display: "block", marginBottom: 10, fontSize: "0.85rem" }}>
                Cover letter
                <textarea
                  rows={5}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontFamily: "inherit",
                  }}
                  placeholder="Why you’re a strong fit…"
                />
              </label>
              <label style={{ display: "block", marginBottom: 14, fontSize: "0.85rem" }}>
                Your bid (USD)
                <input
                  type="number"
                  min={1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontFamily: "inherit",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setProposalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </main>
  );
}
