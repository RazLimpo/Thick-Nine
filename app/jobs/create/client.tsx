// app/jobs/create/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TemplateRow = {
  _id?: string;
  id?: string;
  internalName?: string;
  jobTitle?: string;
  category?: string;
  description?: string;
  deliverables?: string;
  skills?: string;
};

/** Same keys as homepage CategorySidebar + jobs board filters */
const CATEGORIES = [
  { value: "ai-services", label: "AI Services" },
  { value: "business-services", label: "Business Services" },
  { value: "data-science", label: "Data Science" },
  { value: "digital-marketing", label: "Digital Marketing" },
  { value: "graphics-design", label: "Graphics & Design" },
  { value: "music-audio", label: "Music and Audio" },
  { value: "photography", label: "Photography" },
  { value: "programming-tech", label: "Programming & Tech" },
  { value: "travel-lifestyle", label: "Travel & Lifestyle" },
  { value: "video-animation", label: "Video & Animation" },
  { value: "writing-translation", label: "Writing & Translation" },
  { value: "miscellaneous", label: "Miscellaneous (General)" },
];

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
  }
  return h;
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

export default function PostJobClient() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [skills, setSkills] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budgetType, setBudgetType] = useState("fixed");

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateKey, setTemplateKey] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const [posting, setPosting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/client/templates", {
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/?auth=login");
      return;
    }
    // Prefer client role for posting jobs
    const role = localStorage.getItem("userRole") || "client";
    if (role === "freelancer" || role === "affiliate") {
      showToast(
        "Switch to Buyer mode to post a job (or continue — anyone logged in can post).",
        "info"
      );
    }
    loadTemplates();

    // Restore local draft if any
    try {
      const raw = localStorage.getItem("jobPostDraft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.title) setTitle(String(d.title));
        if (d.category) setCategory(String(d.category));
        if (d.description) setDescription(String(d.description));
        if (d.deliverables) setDeliverables(String(d.deliverables));
        if (d.skills) setSkills(String(d.skills));
        if (d.budgetMin) setBudgetMin(String(d.budgetMin));
        if (d.budgetMax) setBudgetMax(String(d.budgetMax));
        if (d.timeline) setTimeline(String(d.timeline));
        if (d.jobId) setJobId(String(d.jobId));
      }
    } catch {
      /* ignore */
    }
  }, [router, loadTemplates]);

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    if (!key) return;
    const tpl = templates.find((t) => String(t._id || t.id) === key);
    if (!tpl) return;
    setTitle(tpl.jobTitle || "");
    setCategory(tpl.category || "");
    setDescription(tpl.description || "");
    setDeliverables(tpl.deliverables || "");
    setSkills(tpl.skills || "");
    showToast("Template applied.", "success");
  };

  const payload = () => ({
    jobId: jobId || undefined,
    title: title.trim(),
    category,
    description: description.trim(),
    deliverables: deliverables.trim(),
    skills,
    budgetType,
    budgetMin: Number(budgetMin) || 0,
    budgetMax: Number(budgetMax) || 0,
    timelineDays: Number(timeline) || 7,
  });

  const saveDraft = async () => {
    if (!title.trim() || title.trim().length < 3) {
      showToast("Enter at least a short title to save a draft.", "error");
      return;
    }
    setDrafting(true);
    try {
      const res = await fetch("/api/jobs/draft", {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not save draft.", "error");
        return;
      }
      const id = String(data.jobId || data.job?._id || "");
      if (id) {
        setJobId(id);
        try {
          localStorage.setItem(
            "jobPostDraft",
            JSON.stringify({ ...payload(), jobId: id })
          );
        } catch {
          /* ignore */
        }
      }
      showToast("Draft saved.", "success");
    } catch {
      showToast("Network error saving draft.", "error");
    } finally {
      setDrafting(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!title.trim()) {
      showToast("Enter a job title before saving a template.", "error");
      return;
    }
    setSavingTpl(true);
    try {
      const res = await fetch("/api/client/templates", {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          internalName: title.trim().slice(0, 80),
          jobTitle: title.trim(),
          category,
          description: description.trim(),
          deliverables: deliverables.trim(),
          skills: skills.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not save template.", "error");
        return;
      }
      showToast("Saved as template (Client Settings).", "success");
      await loadTemplates();
    } catch {
      showToast("Network error saving template.", "error");
    } finally {
      setSavingTpl(false);
    }
  };

  const postJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !description.trim() || !deliverables.trim()) {
      showToast("Fill all required fields.", "error");
      return;
    }
    if (!skills.trim()) {
      showToast("Add at least one required skill.", "error");
      return;
    }
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!min || min < 10) {
      showToast("Minimum budget should be at least $10.", "error");
      return;
    }
    if (!max || max < min) {
      showToast("Max budget must be greater than or equal to min.", "error");
      return;
    }
    if (!timeline || Number(timeline) < 1) {
      showToast("Enter a valid timeline in days.", "error");
      return;
    }

    setPosting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: authHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not post job.", "error");
        return;
      }
      try {
        localStorage.removeItem("jobPostDraft");
      } catch {
        /* ignore */
      }
      showToast("Job posted successfully!", "success");
      const id = data.jobId || data.job?._id;
      if (id) {
        router.push(`/jobs/${id}`);
      } else {
        router.push("/client-dashboard");
      }
    } catch {
      showToast("Network error posting job.", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <main className="form-layout post-job-page">
      <div className="form-container">
        <h1>Post a New Job</h1>

        <div className="template-selector-container">
          <label htmlFor="use-template-select">
            <i className="fas fa-magic" /> Start with a template?
          </label>
          <select
            id="use-template-select"
            className="template-dropdown"
            value={templateKey}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">-- No Template (Start Blank) --</option>
            {templates.map((t) => {
              const id = String(t._id || t.id);
              return (
                <option key={id} value={id}>
                  {t.internalName || t.jobTitle || "Template"}
                </option>
              );
            })}
          </select>
          <p className="template-hint">
            Templates come from{" "}
            <Link href="/client-settings">Client Settings</Link>. Selecting one
            fills the fields below.
          </p>
        </div>

        <p className="form-instruction">
          Tell freelancers exactly what you need. Clear details attract better
          proposals.
        </p>

        <h2>Detail Your Project</h2>

        <form className="job-post-form" onSubmit={postJob}>
          <div className="form-group">
            <label htmlFor="job-title">Project Title</label>
            <input
              type="text"
              id="job-title"
              maxLength={100}
              placeholder="e.g., WordPress Developer for store redesign"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div
              className={`char-counter${title.length >= 90 ? " limit-near" : ""}`}
            >
              <span id="title-count">{title.length}</span>/100
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category">Project Category</label>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a Category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Detailed Project Description</label>
            <textarea
              id="description"
              rows={8}
              maxLength={2000}
              placeholder="Outline the scope, goals, and any constraints…"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div
              className={`char-counter${
                description.length >= 1800 ? " limit-near" : ""
              }`}
            >
              <span id="desc-count">{description.length}</span>/2000
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="deliverables">Key Deliverables</label>
            <textarea
              id="deliverables"
              rows={4}
              maxLength={500}
              placeholder="List the specific outputs you expect…"
              required
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
            />
            <div
              className={`char-counter${
                deliverables.length >= 450 ? " limit-near" : ""
              }`}
            >
              <span id="deliv-count">{deliverables.length}</span>/500
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="skills">Required Skills</label>
            <input
              type="text"
              id="skills"
              placeholder="e.g., Python, Django, Stripe API, React"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <small>
              Separate each required skill with a comma (e.g., Figma, SEO, AWS).
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="attachments">Attachments / Files (Optional)</label>
            <input type="file" id="attachments" multiple disabled />
            <small>
              File upload to Cloudinary comes next. For now, describe assets in
              the description or share links after a freelancer is hired.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="budget-type">Budget Type</label>
            <select
              id="budget-type"
              required
              value={budgetType}
              onChange={(e) => setBudgetType(e.target.value)}
            >
              <option value="fixed">Fixed Price</option>
            </select>
          </div>

          <div className="form-group budget-group">
            <label htmlFor="budget-min">Your Budget Range (USD)</label>
            <div className="inline-inputs">
              <input
                type="number"
                id="budget-min"
                placeholder="Min Budget"
                min={10}
                required
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
              <span>to</span>
              <input
                type="number"
                id="budget-max"
                placeholder="Max Budget"
                required
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timeline">Desired Timeline (Days)</label>
            <input
              type="number"
              id="timeline"
              placeholder="e.g., 7"
              min={1}
              required
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            />
          </div>

          <div className="job-form-actions">
            <button
              type="submit"
              className="full-width-btn btn-primary post-button"
              disabled={posting}
            >
              <i className="fas fa-paper-plane" />{" "}
              {posting ? "Posting…" : "Post Job Now"}
            </button>

            <div className="secondary-actions-row">
              <button
                type="button"
                className="btn-secondary save-template-button"
                disabled={savingTpl}
                onClick={saveAsTemplate}
              >
                <i className="fas fa-magic" />{" "}
                {savingTpl ? "Saving…" : "Save as Template"}
              </button>
              <button
                type="button"
                className="btn-secondary save-draft-button"
                disabled={drafting}
                onClick={saveDraft}
              >
                <i className="fas fa-save" />{" "}
                {drafting ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        </form>
      </div>
      <div id="toast-container" />
    </main>
  );
}
