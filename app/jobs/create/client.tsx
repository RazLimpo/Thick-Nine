"use client";

import React, { useState, useEffect } from "react";

// Types for form values and mock template schema
interface JobFormData {
  title: string;
  category: string;
  description: string;
  deliverables: string;
  skills: string;
  attachments: FileList | null;
  budgetType: string;
  budgetMin: string;
  budgetMax: string;
  timeline: string;
}

interface TemplateData {
  title: string;
  category: string;
  description: string;
  deliverables: string;
  skills: string;
}

const TEMPLATES: Record<string, TemplateData> = {
  "seo-blog": {
    title: "Expert SEO Content Writer for Monthly Blog Posts",
    category: "writing",
    description:
      "We are looking for a consistent writer to handle 4 blog posts per month. Each post must be 1,500 words, SEO optimized, and include 2 royalty-free images.",
    deliverables:
      "1. Four .docx articles\n2. Keyword research report\n3. Image source links",
    skills: "SEO, Content Writing, Research",
  },
  "web-dev": {
    title: "Urgent: WordPress Bug Fix & CSS Refinement",
    category: "webdev",
    description:
      "Need a developer to fix a layout issue on our checkout page and update the mobile navigation styling.",
    deliverables: "1. Patched CSS files\n2. Brief report of changes made",
    skills: "WordPress, CSS, PHP",
  },
  "logo-design": {
    title: "Logo & Branding Package for New Startup",
    category: "design",
    description:
      "Looking for a skilled designer to create a modern logo, color palette, and brand guidelines.",
    deliverables:
      "1. Vector logo files (AI, EPS, SVG)\n2. PNG/JPG exports\n3. Brand style guide PDF",
    skills: "Figma, Illustrator, Logo Design, Graphic Design",
  },
};

export default function PostJobClient() {
  // Form state holding all input values
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    category: "",
    description: "",
    deliverables: "",
    skills: "",
    attachments: null,
    budgetType: "fixed",
    budgetMin: "",
    budgetMax: "",
    timeline: "",
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Hydrate draft from localStorage on mount (recreates DOMContentLoaded draft load)
  useEffect(() => {
    const savedDraft = localStorage.getItem("jobPostDraft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData((prev) => ({
          ...prev,
          title: parsed.title || "",
          category: parsed.category || "",
          description: parsed.description || "",
          deliverables: parsed.deliverables || "",
          skills: parsed.skills || "",
          budgetMin: parsed.budgetMin || "",
          budgetMax: parsed.budgetMax || "",
          timeline: parsed.timeline || "",
        }));
      } catch (err) {
        console.error("Failed to parse saved draft:", err);
      }
    }
  }, []);

  // Generic input change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;

    // Map element IDs directly to state keys
    const keyMap: Record<string, keyof JobFormData> = {
      "job-title": "title",
      category: "category",
      description: "description",
      deliverables: "deliverables",
      skills: "skills",
      "budget-type": "budgetType",
      "budget-min": "budgetMin",
      "budget-max": "budgetMax",
      timeline: "timeline",
    };

    const targetKey = keyMap[id];
    if (targetKey) {
      setFormData((prev) => ({ ...prev, [targetKey]: value }));
    }
  };

  // Handle file attachment inputs separately
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData((prev) => ({ ...prev, attachments: e.target.files }));
    }
  };

  // Apply auto-fill template data
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    setSelectedTemplate(key);

    if (key && TEMPLATES[key]) {
      const template = TEMPLATES[key];
      setFormData((prev) => ({
        ...prev,
        title: template.title,
        category: template.category,
        description: template.description,
        deliverables: template.deliverables,
        skills: template.skills,
      }));
      console.log(`Template "${key}" applied.`);
    }
  };

  // Placeholder handler for "Save as Draft"
  const handleSaveDraft = () => {
    const draftPayload = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      deliverables: formData.deliverables,
      skills: formData.skills,
      budgetMin: formData.budgetMin,
      budgetMax: formData.budgetMax,
      timeline: formData.timeline,
    };
    localStorage.setItem("jobPostDraft", JSON.stringify(draftPayload));
    alert("Draft saved!");
  };

  // Placeholder handler for "Save as Template"
  const handleSaveTemplate = () => {
    if (!formData.title.trim()) {
      alert("Please enter at least a Job Title to save this as a template.");
      return;
    }
    // TODO: Wire up API route endpoint (e.g., POST /api/jobs/templates)
    console.log("Permanent Template Saved:", {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      deliverables: formData.deliverables,
      skills: formData.skills,
    });
    alert("Success! This post has been saved as a Template. You can manage it in your Client Settings.");
  };

  // Placeholder handler for Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation check
    if (!formData.title || !formData.category || !formData.description || !formData.deliverables) {
      alert("Please fill in all required fields.");
      return;
    }

    // TODO: Wire up production API route submission (e.g., POST /api/jobs/create)
    console.log("Posting Job Payload:", formData);
    alert("Job Posted Successfully!");
    localStorage.removeItem("jobPostDraft");
  };

  return (
    <main className="form-layout">
      <div className="form-container">
        <h1>Post a New Job</h1>

        {/* Template Selector Block */}
        <div className="template-selector-container">
          <label htmlFor="use-template-select">
            <i className="fas fa-magic"></i> Start with a template?
          </label>
          <select
            id="use-template-select"
            className="template-dropdown"
            value={selectedTemplate}
            onChange={handleTemplateSelect}
          >
            <option value="">-- No Template (Start Blank) --</option>
            <option value="seo-blog">SEO Monthly Blog Post</option>
            <option value="web-dev">Standard Web Bug Fix</option>
            <option value="logo-design">Logo & Branding Package</option>
          </select>
          <p className="template-hint">
            Selecting a template will auto-fill the fields below.
          </p>
        </div>

        <p className="form-instruction">Fill out the details below:</p>

        <h2>Detail Your Project</h2>

        <p className="form-instruction">
          Tell us exactly what you need. Clear details attract the best freelancers.
        </p>

        <form className="job-post-form" onSubmit={handleSubmit}>
          {/* Project Title Block */}
          <div className="form-group">
            <label htmlFor="job-title">Project Title</label>
            <input
              type="text"
              id="job-title"
              maxLength={100}
              placeholder="e.g., WordPress Developer..."
              required
              value={formData.title}
              onChange={handleInputChange}
            />
            <div
              className={`char-counter ${
                formData.title.length >= 90 ? "limit-near" : ""
              }`}
            >
              <span id="title-count">{formData.title.length}</span>/100
            </div>
          </div>

          {/* Project Category Block */}
          <div className="form-group">
            <label htmlFor="category">Project Category</label>
            <select
              id="category"
              required
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="">Select a Category</option>
              <option value="design">Graphics & Design</option>
              <option value="webdev">Web Development</option>
              <option value="writing">Writing & Translation</option>
              <option value="marketing">Digital Marketing</option>
            </select>
          </div>

          {/* Project Description Textarea */}
          <div className="form-group">
            <label htmlFor="description">Detailed Project Description</label>
            <textarea
              id="description"
              rows={8}
              maxLength={2000}
              placeholder="Outline the scope..."
              required
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>
            <div
              className={`char-counter ${
                formData.description.length >= 1800 ? "limit-near" : ""
              }`}
            >
              <span id="desc-count">{formData.description.length}</span>/2000
            </div>
          </div>

          {/* Deliverables Textarea */}
          <div className="form-group">
            <label htmlFor="deliverables">Key Deliverables</label>
            <textarea
              id="deliverables"
              rows={4}
              maxLength={500}
              placeholder="List the specific outputs..."
              required
              value={formData.deliverables}
              onChange={handleInputChange}
            ></textarea>
            <div
              className={`char-counter ${
                formData.deliverables.length >= 450 ? "limit-near" : ""
              }`}
            >
              <span id="deliv-count">{formData.deliverables.length}</span>/500
            </div>
          </div>

          {/* Required Skills Block */}
          <div className="form-group">
            <label htmlFor="skills">Required Skills</label>
            <input
              type="text"
              id="skills"
              placeholder="e.g., Python, Django, Stripe API, React, UI/UX"
              required
              value={formData.skills}
              onChange={handleInputChange}
            />
            <small>Separate each required skill with a comma (e.g., Figma, SEO, AWS).</small>
          </div>

          {/* Attachments / Files */}
          <div className="form-group">
            <label htmlFor="attachments">Attachments / Files (Optional)</label>
            <input
              type="file"
              id="attachments"
              multiple
              onChange={handleFileChange}
            />
            <small>Attach mood boards, wireframes, or brand guidelines.</small>
          </div>

          {/* Budget Type */}
          <div className="form-group">
            <label htmlFor="budget-type">Budget Type</label>
            <select
              id="budget-type"
              required
              value={formData.budgetType}
              onChange={handleInputChange}
            >
              <option value="fixed">Fixed Price</option>
            </select>
          </div>

          {/* Budget Range Group */}
          <div className="form-group budget-group">
            <label htmlFor="budget">Your Budget Range (USD)</label>
            <div className="inline-inputs">
              <input
                type="number"
                id="budget-min"
                placeholder="Min Budget"
                min="10"
                required
                value={formData.budgetMin}
                onChange={handleInputChange}
              />
              <span>to</span>
              <input
                type="number"
                id="budget-max"
                placeholder="Max Budget"
                required
                value={formData.budgetMax}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Timeline Input */}
          <div className="form-group">
            <label htmlFor="timeline">Desired Timeline (Days)</label>
            <input
              type="number"
              id="timeline"
              placeholder="e.g., 7 days"
              min="1"
              required
              value={formData.timeline}
              onChange={handleInputChange}
            />
          </div>

          {/* Actions Block */}
          <div className="job-form-actions">
            <button
              type="submit"
              className="full-width-btn btn-primary post-button"
            >
              <i className="fas fa-paper-plane"></i> Post Job Now
            </button>

            <div className="secondary-actions-row">
              <button
                type="button"
                className="btn-secondary save-template-button"
                onClick={handleSaveTemplate}
              >
                <i className="fas fa-magic"></i> Save as Template
              </button>
              <button
                type="button"
                className="btn-secondary save-draft-button"
                onClick={handleSaveDraft}
              >
                <i className="fas fa-save"></i> Save as Draft
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}