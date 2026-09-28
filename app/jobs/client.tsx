"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// Job Listing Schema
interface Job {
  id: string;
  title: string;
  budgetMin: number;
  budgetMax: number;
  budgetType: "fixed" | "hourly";
  snippet: string;
  postedTime: string;
  postedHoursAgo: number;
  skills: string[];
  category: string;
}

// Mock Jobs Data
const INITIAL_JOBS: Job[] = [
  {
    id: "job-1",
    title: "Build a Custom e-Commerce Platform with Django",
    budgetMin: 5000,
    budgetMax: 7000,
    budgetType: "fixed",
    snippet:
      "We require an experienced Python/Django developer to build a scalable e-commerce site from scratch. Must integrate Stripe and handle complex product variants...",
    postedTime: "1 hour ago",
    postedHoursAgo: 1,
    skills: ["Python", "Django", "Stripe API"],
    category: "web development",
  },
  {
    id: "job-2",
    title: "Design 5 Social Media Graphics for a SaaS Startup",
    budgetMin: 150,
    budgetMax: 250,
    budgetType: "fixed",
    snippet:
      "Need a graphic designer to create 5 eye-catching social media posts (LinkedIn, X) that align with our brand identity. Fast turnaround required...",
    postedTime: "3 hours ago",
    postedHoursAgo: 3,
    skills: ["Figma", "Graphic Design", "Branding"],
    category: "graphic design",
  },
  {
    id: "job-3",
    title: "SEO Content Strategy & Blog Article Writing",
    budgetMin: 300,
    budgetMax: 600,
    budgetType: "fixed",
    snippet:
      "Looking for an SEO specialist to produce monthly articles and conduct high-intent keyword research for an online store...",
    postedTime: "5 hours ago",
    postedHoursAgo: 5,
    skills: ["SEO", "Content Writing", "Copywriting"],
    category: "writing & translation",
  },
];

interface ToastItem {
  id: number;
  message: string;
  iconClass: string;
  extraClass: string;
}

export default function JobsClient() {
  // Filter States
  const [maxBudget, setMaxBudget] = useState<number>(5000);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBudgetType, setSelectedBudgetType] = useState<string>("fixed");
  const [sortBy, setSortBy] = useState<string>("Newest First");

  // Bookmarking & Toast Notifications State
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Hydrate saved bookmarks from localStorage on initial render
  useEffect(() => {
    const saved = localStorage.getItem("savedJobs");
    if (saved) {
      try {
        setSavedJobs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved jobs:", e);
      }
    }
  }, []);

  // Toast Notification Manager
  const showToast = (message: string, iconClass: string, extraClass = "") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, iconClass, extraClass }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Toggle Bookmark Handler
  const toggleBookmark = (title: string) => {
    setSavedJobs((prev) => {
      let updated: string[];
      if (prev.includes(title)) {
        updated = prev.filter((t) => t !== title);
        showToast("Job removed from favorites", "fas fa-info-circle", "removed");
      } else {
        updated = [...prev, title];
        showToast("Job saved to favorites", "fas fa-check-circle");
      }
      localStorage.setItem("savedJobs", JSON.stringify(updated));
      return updated;
    });
  };

  // Clear All Filters Handler
  const handleResetFilters = () => {
    setSelectedCategory("all");
    setMaxBudget(5000);
    setSelectedBudgetType("fixed");
    setSortBy("Newest First");
    showToast("Filters cleared", "fas fa-undo");
  };

  // Filter and Sort Engine
  const filteredAndSortedJobs = useMemo(() => {
    let result = INITIAL_JOBS.filter((job) => {
      const matchesCategory =
        selectedCategory === "all" ||
        job.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesType = job.budgetType.toLowerCase() === selectedBudgetType.toLowerCase();
      const matchesPrice = job.budgetMin <= maxBudget;
      return matchesCategory && matchesType && matchesPrice;
    });

    if (sortBy === "Highest Budget") {
      result.sort((a, b) => b.budgetMax - a.budgetMax);
    } else if (sortBy === "Newest First") {
      result.sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    }

    return result;
  }, [selectedCategory, selectedBudgetType, maxBudget, sortBy]);

  // Dynamic calculation for dual-color CSS track on standard range input
  const sliderProgress = ((maxBudget - 5) / (5000 - 5)) * 100;

  return (
    <>
      <main className="page-container job-browse-page">
        {/* Header Title Section */}
        <header className="page-title-header">
          <h1>Projects for You</h1>
          <p>1,245 projects found based on your skills and preferences.</p>
        </header>

        <div className="job-browse-layout">
          {/* Sidebar Filter Component */}
          <aside className="job-filter-sidebar">
            <div className="filter-group">
              <h2>Budget Range</h2>
              <input
                type="range"
                min="5"
                max="5000"
                value={maxBudget}
                className="budget-slider"
                style={{ "--progress": `${sliderProgress}%` } as React.CSSProperties}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
              />
              <p>
                Range: $<span id="min-budget">5</span> - $
                <span id="max-budget">{maxBudget.toLocaleString()}</span>
              </p>
            </div>

            <div className="filter-group budget-type-row">
              <h2>Budget Type</h2>
              <div className="budget-controls">
                <div className="job-type-pills">
                  <label
                    className={`job-type-pill ${
                      selectedBudgetType === "fixed" ? "active" : ""
                    }`}
                    onClick={() => setSelectedBudgetType("fixed")}
                  >
                    <input
                      type="radio"
                      name="job_type"
                      value="fixed"
                      checked={selectedBudgetType === "fixed"}
                      onChange={() => setSelectedBudgetType("fixed")}
                    />{" "}
                    Fixed
                  </label>
                </div>

                <button
                  id="reset-filters"
                  className="icon-reset-btn"
                  data-tooltip="Clear All Filters"
                  onClick={handleResetFilters}
                >
                  <i className="fas fa-undo"></i>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Job Listings Container */}
          <section className="job-listings-main">
            {/* Sort Bar Controls */}
            <div className="sort-bar">
              <div className="filter-controls">
                <select
                  id="category-filter"
                  className="flex-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="web development">Web Development</option>
                  <option value="graphic design">Graphic Design</option>
                  <option value="digital marketing">Digital Marketing</option>
                  <option value="writing & translation">Writing & Translation</option>
                </select>

                <select
                  id="sort-by"
                  className="flex-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="Newest First">Newest First</option>
                  <option value="Highest Budget">Highest Budget</option>
                  <option value="Most Recent Proposal">Most Recent Proposal</option>
                </select>
              </div>
            </div>

            {/* Empty State Handler */}
            {filteredAndSortedJobs.length === 0 && (
              <div id="no-results-message">
                <i className="fas fa-search"></i>
                <p>No projects match your current filters. Try adjusting your budget or categories.</p>
              </div>
            )}

            {/* Dynamic Job Cards Listing */}
            {filteredAndSortedJobs.map((job) => {
              const isSaved = savedJobs.includes(job.title);
              return (
                <article className="job-card" key={job.id}>
                  <div className="job-card-header">
                    <h2>{job.title}</h2>
                    <span className="job-card-budget">
                      ${job.budgetMin.toLocaleString()} -${job.budgetMax.toLocaleString()} (
                      {job.budgetType === "fixed" ? "Fixed Price" : "Hourly"})
                    </span>
                  </div>

                  <p className="job-card-snippet">{job.snippet}</p>

                  <div className="job-card-footer">
                    <div className="footer-meta">
                      <span className="job-card-info">
                        <i className="fas fa-clock"></i> Posted {job.postedTime}
                      </span>
                      <span className="job-card-info">
                        <i className="fas fa-tools"></i> Skills: {job.skills.join(", ")}
                      </span>
                    </div>

                    <div className="footer-actions">
                      <button
                        className={`bookmark-btn ${isSaved ? "saved" : ""}`}
                        title="Save Job"
                        onClick={() => toggleBookmark(job.title)}
                      >
                        <i className={`${isSaved ? "fas" : "far"} fa-bookmark`}></i>
                      </button>

                      <Link
                        href={`/jobs/${job.id}`}
                        className="btn btn-secondary btn-small"
                      >
                        View Details & Propose
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Pagination Controls */}
            {filteredAndSortedJobs.length > 0 && (
              <div className="pagination">
                <a
                  className={`page-link ${currentPage === 1 ? "disabled" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                >
                  Previous
                </a>
                {[1, 2, 3].map((page) => (
                  <a
                    key={page}
                    className={`page-link ${currentPage === page ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </a>
                ))}
                <a
                  className="page-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage((prev) => prev + 1);
                  }}
                >
                  Next
                </a>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Floating Toast Notification Container */}
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.extraClass}`}>
            <i className={toast.iconClass}></i> {toast.message}
          </div>
        ))}
      </div>
    </>
    
  );
}