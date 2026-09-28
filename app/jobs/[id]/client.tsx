"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Image from "next/image";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "removed";
}

interface Attachment {
  name: string;
  type: "pdf" | "image";
  url: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  design: "Graphics & Design",
  webdev: "Web Development",
  writing: "Writing & Translation",
  marketing: "Digital Marketing",
};

export default function JobDetailsClient({ jobId }: { jobId: string }) {
  // Page Data State
  const jobTitle = "Build a Custom E-commerce Platform with Django";
  const jobCategory = "webdev";
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Proposal Form State
  const [proposalAmount, setProposalAmount] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportDetails, setReportDetails] = useState<string>("");

  // Toast System State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Sample Attachments
  const jobAttachments: Attachment[] = [
    { name: "Project_Requirements.pdf", type: "pdf", url: "#" },
    { name: "Wireframe_Draft.png", type: "image", url: "#" },
  ];

  // Toast Notification Manager
  const showToast = (message: string, type: "success" | "removed" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Check saved state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mySavedJobs");
    if (saved) {
      try {
        const savedJobs: Array<{ title: string }> = JSON.parse(saved);
        if (savedJobs.some((job) => job.title === jobTitle)) {
          setIsSaved(true);
        }
      } catch (e) {
        console.error("Failed to parse saved jobs:", e);
      }
    }
  }, [jobTitle]);

  // Toggle Save Job Handler
  const handleToggleSave = () => {
    const saved = localStorage.getItem("mySavedJobs");
    let savedJobs: Array<{ id: string; title: string; budget: string; postedTime: string }> = saved
      ? JSON.parse(saved)
      : [];

    if (isSaved) {
      savedJobs = savedJobs.filter((job) => job.title !== jobTitle);
      localStorage.setItem("mySavedJobs", JSON.stringify(savedJobs));
      setIsSaved(false);
      showToast("Job removed from dashboard", "removed");
    } else {
      const budgetValue = "$5,000 - $7,000";
      const newSavedJob = {
        id: jobId || "job-" + Date.now(),
        title: jobTitle,
        budget: budgetValue,
        postedTime: "Saved just now",
      };
      savedJobs.push(newSavedJob);
      localStorage.setItem("mySavedJobs", JSON.stringify(savedJobs));
      setIsSaved(true);
      showToast("Job saved successfully!");
    }
  };

  // Submit Proposal Handler
  const handleProposalSubmit = (e: FormEvent) => {
    e.preventDefault();
    showToast("Proposal submitted successfully!");
    setProposalAmount("");
    setCoverLetter("");
    setDeliveryTime("");
  };

  // Submit Report Handler
  const handleReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log("Job Reported for:", reportReason, reportDetails);
    setIsReportModalOpen(false);
    setReportReason("spam");
    setReportDetails("");
    showToast("Report submitted. We'll look into it.", "removed");
  };

  return (
    <>
      <main className="page-container job-details-page">
        <div className="job-details-layout">
          {/* Left Main Section */}
          <section className="job-description-column">
            <header className="job-title-header">
              <h1 className="job-title">{jobTitle}</h1>
              <div className="job-meta">
                <span className="meta-item">
                  <i className="fas fa-folder-open"></i> Category:{" "}
                  <span id="display-category">
                    {CATEGORY_LABELS[jobCategory] || "Other"}
                  </span>
                </span>
                <span className="meta-item">
                  <i className="fas fa-clock"></i> Posted 1 hour ago
                </span>
                <span className="meta-item">
                  <i className="fas fa-users"></i> 15 Proposals submitted
                </span>
                <span className="meta-item">
                  <i className="fas fa-eye"></i> 345 Total Views
                </span>
                <span className="meta-item">
                  <i className="fas fa-map-marker-alt"></i> Client: USA
                </span>
              </div>
            </header>

            <div className="project-scope-card card">
              <h2>Project Scope and Requirements</h2>
              <p className="scope-description">
                We require an experienced Python/Django developer to build a scalable,
                secure, and high-performance e-commerce site from scratch. This project is a
                full-stack build, requiring both database design and front-end integration.
              </p>

              <h3>Key Deliverables:</h3>
              <ul className="deliverables-list">
                <li>Customizable product catalog management system.</li>
                <li>Secure user authentication and profile management.</li>
                <li>Integration with the Stripe Payment Gateway for seamless checkout.</li>
                <li>Admin dashboard for order tracking and inventory management.</li>
                <li>
                  Front-end built using modern framework (e.g., React/Vue) integrated with
                  Django REST.
                </li>
              </ul>

              <h3>Required Skills:</h3>
              <div className="skills-tags">
                <span className="skill-tag">Python</span>
                <span className="skill-tag">Django</span>
                <span className="skill-tag">Django REST Framework</span>
                <span className="skill-tag">Stripe API</span>
                <span className="skill-tag">PostgreSQL</span>
              </div>

              <div className="attachments-section">
                <h3>
                  <i className="fas fa-paperclip"></i> Attachments
                </h3>
                <ul className="attachment-list" id="detail-attachments">
                  {jobAttachments.length === 0 ? (
                    <li className="no-attachments">No files attached to this project.</li>
                  ) : (
                    jobAttachments.map((file, idx) => (
                      <li key={idx}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <i
                            className={`fas ${
                              file.type === "pdf" ? "fa-file-pdf" : "fa-file-image"
                            }`}
                          ></i>{" "}
                          {file.name}
                        </a>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="client-info-card card">
              <h2>About the Client</h2>
              <div className="client-profile">
                <Image
                  src="/client-avatar.jpg"
                  alt="Client Avatar"
                  width={60}
                  height={60}
                  className="client-avatar"
                />
                <div className="client-details">
                  <p className="client-name">TechCorp Solutions Inc.</p>
                  <p className="client-stats">
                    <i className="fas fa-map-marker-alt"></i> Chicago, IL
                  </p>
                  <p className="client-stats">
                    <i className="fas fa-star"></i> 4.8 Rating (35 Reviews)
                  </p>
                  <p className="client-stats">
                    <i className="fas fa-briefcase"></i> 12 Projects Posted | $55k Spent
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar Section */}
          <aside className="proposal-column">
            <div className="budget-card card card-primary-border">
              <h2 className="card-budget-title">Budget Details</h2>
              <div className="budget-row">
                <span className="budget-label">
                  <i className="fas fa-money-bill-wave"></i> Project Budget:
                </span>
                <span className="budget-value">$5,000 - $7,000</span>
              </div>
              <div className="budget-row">
                <span className="budget-label">
                  <i className="fas fa-calendar-alt"></i> Due Date:
                </span>
                <span className="budget-value">3 Months</span>
              </div>
            </div>

            <div className="proposal-form-card card">
              <h2>Submit Your Proposal</h2>
              <form className="proposal-form" onSubmit={handleProposalSubmit}>
                <label htmlFor="proposal-amount">Your Fixed Price Proposal ($):</label>
                <input
                  type="number"
                  id="proposal-amount"
                  name="proposal_amount"
                  placeholder="e.g., 6500"
                  value={proposalAmount}
                  onChange={(e) => setProposalAmount(e.target.value)}
                  required
                />

                <label htmlFor="cover-letter">Cover Letter / Proposal Summary:</label>
                <textarea
                  id="cover-letter"
                  name="cover_letter"
                  rows={8}
                  placeholder="Tell the client why you are the best fit for this Django project."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  required
                ></textarea>

                <label htmlFor="delivery-time">Estimated Delivery Time (Weeks):</label>
                <input
                  type="number"
                  id="delivery-time"
                  name="delivery_time"
                  placeholder="e.g., 10"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  required
                />

                <button type="submit" className="btn btn-primary btn-block">
                  Submit Proposal
                </button>
              </form>
            </div>

            <div className="job-action-buttons">
              <button
                className="btn btn-secondary btn-icon"
                onClick={handleToggleSave}
                style={
                  isSaved
                    ? { backgroundColor: "#28a745", color: "white" }
                    : undefined
                }
              >
                <i className={isSaved ? "fas fa-check" : "far fa-heart"}></i>{" "}
                {isSaved ? "Saved" : "Save Job"}
              </button>
              <button
                id="open-report-btn"
                className="btn btn-secondary btn-icon"
                onClick={() => setIsReportModalOpen(true)}
              >
                <i className="fas fa-flag"></i> Report Job
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Report Modal */}
      <div
        id="report-modal-overlay"
        className={`modal-overlay ${isReportModalOpen ? "active" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsReportModalOpen(false);
        }}
      >
        <div className="report-modal">
          <div className="modal-header">
            <h3>Report This Job</h3>
            <button
              id="close-report-modal"
              className="close-btn"
              onClick={() => setIsReportModalOpen(false)}
            >
              &times;
            </button>
          </div>
          <form id="report-form" onSubmit={handleReportSubmit}>
            <p>Why are you reporting this job posting?</p>

            <div className="report-options">
              <label className="report-option">
                <input
                  type="radio"
                  name="reason"
                  value="spam"
                  checked={reportReason === "spam"}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                />
                <span>It&apos;s spam or misleading</span>
              </label>
              <label className="report-option">
                <input
                  type="radio"
                  name="reason"
                  value="scam"
                  checked={reportReason === "scam"}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <span>It looks like a scam or fake job</span>
              </label>
              <label className="report-option">
                <input
                  type="radio"
                  name="reason"
                  value="offensive"
                  checked={reportReason === "offensive"}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <span>It contains offensive content</span>
              </label>
              <label className="report-option">
                <input
                  type="radio"
                  name="reason"
                  value="other"
                  checked={reportReason === "other"}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <span>Other</span>
              </label>
            </div>

            <textarea
              id="report-details"
              placeholder="Please provide more details (optional)..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            ></textarea>

            <div className="modal-actions">
              <button
                type="button"
                id="cancel-report"
                className="btn-cancel"
                onClick={() => setIsReportModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Toast Notification Container */}
      <div id="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type === "removed" ? "removed" : ""}`}
          >
            <i
              className={`fas ${
                toast.type === "removed" ? "fa-circle-exclamation" : "fa-circle-check"
              }`}
            ></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}