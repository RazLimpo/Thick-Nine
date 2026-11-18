// app/jobs/client.tsx — job cards (Looking for: + single cool gray-blue)
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type JobRow = {
  _id: string;
  title?: string;
  category?: string;
  description?: string;
  skills?: string[];
  budgetMin?: number;
  budgetMax?: number;
  budget?: number;
  budgetType?: string;
  timelineDays?: number;
  duration?: string;
  publishedAt?: string;
  createdAt?: string;
  clientId?: {
    _id?: string;
    id?: string;
    fullName?: string;
    displayName?: string;
    avatar?: string;
    onlineStatus?: string;
    location?: { city?: string; country?: string };
  };
};

/** Same set as components CategorySidebar (homepage) */
const CATEGORIES = [
  { value: "", label: "All Categories" },
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
  // legacy keys from older post-job form (still match if stored)
  { value: "design", label: "Graphics & Design (legacy)" },
  { value: "webdev", label: "Web Development (legacy)" },
  { value: "writing", label: "Writing (legacy)" },
  { value: "marketing", label: "Marketing (legacy)" },
];

const LOCATIONS = [
  { value: "", label: "Any location" },
  { value: "ghana", label: "Ghana" },
  { value: "nigeria", label: "Nigeria" },
  { value: "kenya", label: "Kenya" },
  { value: "uganda", label: "Uganda" },
  { value: "remote", label: "Remote / Anywhere" },
];

function money(n?: number) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString()}`;
}

function budgetLine(j: JobRow) {
  const min = Number(j.budgetMin) || 0;
  const max = Number(j.budgetMax) || Number(j.budget) || min;
  if (!min && !max) return "Budget TBD";
  if (min && max && min !== max) return `${money(min)}–${money(max)}`;
  return money(max || min);
}

function formatDate(iso?: string) {
  if (!iso) return "Recently";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

function clientName(j: JobRow) {
  return j.clientId?.displayName || j.clientId?.fullName || "Client";
}

function clientLoc(j: JobRow) {
  const city = j.clientId?.location?.city;
  const country = j.clientId?.location?.country;
  if (city && country) return `${city}, ${country}`;
  return country || city || "Remote";
}

function presenceClass(raw?: string) {
  const s = String(raw || "offline").toLowerCase();
  if (s === "online" || s === "true" || s === "1") return "online";
  if (s === "away") return "away";
  return "offline";
}

function categoryLabel(value?: string) {
  if (!value) return "";
  const hit = CATEGORIES.find((c) => c.value === value);
  return hit?.label || value;
}

function cardTags(j: JobRow): string[] {
  const tags: string[] = ["Fixed price"];
  if (j.category) tags.push(categoryLabel(j.category));
  if (j.timelineDays) tags.push(`${j.timelineDays} days`);
  else if (j.duration) tags.push(String(j.duration));
  const skills = Array.isArray(j.skills) ? j.skills : [];
  for (const s of skills.slice(0, 2)) {
    if (s && !tags.includes(s)) tags.push(s);
  }
  return tags.slice(0, 4);
}

export default function JobsBoardClient() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [budgetMax, setBudgetMax] = useState(5000);
  const [sort, setSort] = useState("newest");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      params.set("limit", "48");
      const res = await fetch(`/api/jobs?${params.toString()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Failed to load jobs.");
        setJobs([]);
        return;
      }
      let list: JobRow[] = Array.isArray(data.jobs) ? data.jobs : [];

      // Fixed-price board only
      list = list.filter((j) => {
        const t = String(j.budgetType || "fixed").toLowerCase();
        return t !== "hourly" && !t.includes("hour");
      });

      list = list.filter((j) => {
        const max =
          Number(j.budgetMax) || Number(j.budget) || Number(j.budgetMin) || 0;
        return max <= 0 || max <= budgetMax;
      });

      if (location && location !== "remote") {
        const needle = location.toLowerCase();
        list = list.filter((j) => {
          const c = String(j.clientId?.location?.country || "").toLowerCase();
          const city = String(j.clientId?.location?.city || "").toLowerCase();
          return c.includes(needle) || city.includes(needle);
        });
      }

      if (sort === "budget-high") {
        list = [...list].sort(
          (a, b) =>
            (Number(b.budgetMax) || Number(b.budget) || 0) -
            (Number(a.budgetMax) || Number(a.budget) || 0)
        );
      } else if (sort === "budget-low") {
        list = [...list].sort(
          (a, b) =>
            (Number(a.budgetMin) || Number(a.budget) || 0) -
            (Number(b.budgetMin) || Number(b.budget) || 0)
        );
      }

      setJobs(list);

      const ids = Array.from(
        new Set(
          list
            .map((j) => String(j.clientId?._id || j.clientId?.id || ""))
            .filter(Boolean)
        )
      );
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
          if (pr.ok && pd && typeof pd === "object") {
            const map: Record<string, string> = {};
            const rows = Array.isArray(pd.users)
              ? pd.users
              : Array.isArray(pd.statuses)
                ? pd.statuses
                : [];
            if (rows.length) {
              rows.forEach(
                (u: {
                  id?: string;
                  _id?: string;
                  status?: string;
                  onlineStatus?: string;
                }) => {
                  const id = String(u.id || u._id || "");
                  if (id)
                    map[id] = String(u.status || u.onlineStatus || "offline");
                }
              );
            } else if (pd.byId && typeof pd.byId === "object") {
              Object.assign(map, pd.byId);
            }
            setPresenceMap(map);
          }
        } catch {
          /* optional */
        }
      }
    } catch {
      setError("Network error loading jobs.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, location, budgetMax, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setQ("");
    setCategory("");
    setLocation("");
    setBudgetMax(5000);
    setSort("newest");
  };

  const toggleSave = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const isSaved = savedIds.has(jobId);
    try {
      if (isSaved) {
        await fetch(`/api/bookmarks?itemType=Job&itemId=${jobId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(jobId);
          return n;
        });
      } else {
        await fetch("/api/bookmarks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ itemType: "Job", itemId: jobId }),
        });
        setSavedIds((prev) => new Set(prev).add(jobId));
      }
    } catch {
      /* ignore */
    }
  };

  const shownCount = useMemo(() => jobs.length, [jobs.length]);

  /** Primary category options only (no legacy) for the main dropdown */
  const categoryOptions = CATEGORIES.filter(
    (c) => !c.label.includes("(legacy)")
  );

  return (
    <main className="jb-page">
      <div className="jb-layout">
        {/* Sidebar: search + budget only */}
        <aside className="jb-sidebar">
          <form onSubmit={applySearch}>
            <div className="jb-filter-block">
              <h2>Keywords</h2>
              <div className="jb-search-wrap">
                <i className="fas fa-search" aria-hidden />
                <input
                  type="search"
                  placeholder="Title, skill, keyword…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="jb-filter-block">
              <h2>Budget range</h2>
              <p className="jb-hint">Fixed price only</p>
              <div className="jb-range-labels">
                <span>$10</span>
                <span>Up to {money(budgetMax)}</span>
              </div>
              <input
                className="jb-range"
                type="range"
                min={50}
                max={10000}
                step={50}
                value={budgetMax}
                onChange={(e) => setBudgetMax(Number(e.target.value))}
                aria-label="Maximum budget"
              />
            </div>

            <div className="jb-sidebar-actions">
              <button type="submit" className="jb-btn-apply">
                Apply
              </button>
              <button
                type="button"
                className="jb-btn-clear"
                onClick={clearFilters}
              >
                Clear all
              </button>
            </div>
          </form>
        </aside>

        {/* Main */}
        <section className="jb-main">
          <div className="jb-toolbar">
            <div className="jb-toolbar-left">
              <h1>Recommended jobs</h1>
              <span className="jb-count">{loading ? "…" : shownCount}</span>
            </div>
            <Link href="/jobs/create" className="jb-post-link">
              <i className="fas fa-plus" /> Post job
            </Link>
          </div>

          {/* Top filters: category · location · sort */}
          <div className="jb-top-filters">
            <select
              className="jb-top-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Category"
            >
              {categoryOptions.map((c) => (
                <option key={c.value || "all"} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              className="jb-top-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Location"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value || "any"} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <select
              className="jb-top-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort"
            >
              <option value="newest">Newest first</option>
              <option value="budget-high">Budget: high → low</option>
              <option value="budget-low">Budget: low → high</option>
            </select>
          </div>

          {error && (
            <div className="jb-error" role="alert">
              {error}{" "}
              <button type="button" onClick={load}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="jb-loading">
              <i className="fas fa-spinner fa-spin" /> Loading jobs…
            </div>
          ) : jobs.length === 0 ? (
            <div className="jb-empty">
              <p>No fixed-price jobs match these filters.</p>
              <p>
                <Link href="/jobs/create">Post a job</Link> or clear filters.
              </p>
            </div>
          ) : (
            <div className="jb-grid">
              {jobs.map((job) => {
                const cid = String(
                  job.clientId?._id || job.clientId?.id || ""
                );
                const presence =
                  presenceMap[cid] || job.clientId?.onlineStatus || "offline";
                const avatar = job.clientId?.avatar || "/default-avatar.png";
                const tags = cardTags(job);
                const saved = savedIds.has(job._id);
                return (
                  <article
                    key={job._id}
                    className="jb-card"
                  >
                    <div className="jb-card-body">
                      <div className="jb-card-top">
                        <span className="jb-date">
                          {formatDate(job.publishedAt || job.createdAt)}
                        </span>
                        <button
                          type="button"
                          className={`jb-bookmark${saved ? " is-saved" : ""}`}
                          title={saved ? "Saved" : "Save job"}
                          onClick={(e) => toggleSave(job._id, e)}
                        >
                          <i
                            className={
                              saved ? "fas fa-bookmark" : "far fa-bookmark"
                            }
                          />
                        </button>
                      </div>

                      <p className="jb-client">{clientName(job)}</p>
                      <div className="jb-title-row">
                        <h2 className="jb-title">
                          <span className="jb-looking-for">Looking for:</span>
                          <span className="jb-looking-role">
                            {job.title || "a skilled freelancer"}
                          </span>
                        </h2>
                        <div
                          className="jb-avatar-wrap"
                          title={clientName(job)}
                        >
                          <Image
                            src={avatar}
                            alt={clientName(job)}
                            width={36}
                            height={36}
                            unoptimized
                          />
                          <span
                            className={`jb-presence ${presenceClass(presence)}`}
                            aria-label={presenceClass(presence)}
                          />
                        </div>
                      </div>

                      <div className="jb-tags">
                        {tags.map((t) => (
                          <span key={t} className="jb-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="jb-card-foot">
                      <div>
                        <div className="jb-pay">{budgetLine(job)}</div>
                        <div className="jb-loc">
                          <i className="fas fa-map-marker-alt" />{" "}
                          {clientLoc(job)}
                        </div>
                      </div>
                      <Link href={`/jobs/${job._id}`} className="jb-details">
                        Details
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
