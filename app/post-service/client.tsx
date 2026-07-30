// app/post-service/client.tsx

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MARKETPLACE_FEE_PERCENTAGE } from "@/lib/constants";
import { PlanKey, PLAN_LIMITS, validateMediaFile, validateMediaQuantity } from "@/lib/validation";

import '../../styles/pages/post-service.css';
import '../../styles/pages/service-details.css';

// Component Definition 
export default function PostServiceClient() {
  // --- All state will go here ---
  
  const router = useRouter();
  
  // Ref for scrolling to images container without DOM lookup 
  const imagesSectionRef = useRef<HTMLDivElement>(null);
  
// --- Package Data ---
const [packagesData, setPackagesData] = useState({
  basic: { title: "", desc: "", price: "", delivery: "3", revisions: "1", features: "" },
  standard: { title: "", desc: "", price: "", delivery: "5", revisions: "3", features: "" },
  premium: { title: "", desc: "", price: "", delivery: "7", revisions: "Unlimited", features: "" },
});
const [currentEditingTier, setCurrentEditingTier] = useState<"basic" | "standard" | "premium">("basic");

// --- Media ---
const [selectedImages, setSelectedImages] = useState<File[]>([]);
const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
const [selectedAudios, setSelectedAudios] = useState<File[]>([]);

// --- View ---
const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

// --- Form fields (basic info) ---
const [serviceTitle, setServiceTitle] = useState("");
const [category, setCategory] = useState("");
const [description, setDescription] = useState("");
const [keywords, setKeywords] = useState("");

// --- Package form fields (current tier) ---
const [pkgTitle, setPkgTitle] = useState("");
const [pkgDesc, setPkgDesc] = useState("");
const [pkgPrice, setPkgPrice] = useState("");
const [pkgDelivery, setPkgDelivery] = useState("3");
const [pkgRevisions, setPkgRevisions] = useState("1");
const [pkgFeatures, setPkgFeatures] = useState("");
  

// --- Plan ---
const [selectedPlan, setSelectedPlan] = useState<PlanKey>("free");

// --- Toast ---
const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
  
  const [briefIntro, setBriefIntro] = useState(
  "To deliver the best possible result tailored to your vision, please provide the following when you place your order:"
);
const [req1, setReq1] = useState("");
const [req2, setReq2] = useState("");
const [req3, setReq3] = useState("");
const [req4, setReq4] = useState("");
  
  
  const planLimits: Record<PlanKey, { images: number; videos: number; audio: number; label: string }> = { 
    free: { images: 3, videos: 1, audio: 1, label: "Free Plan" }, 
    silver: { images: 5, videos: 2, audio: 2, label: "Silver Plan" }, 
    gold: { images: 8, videos: 4, audio: 4, label: "Gold Plan" }, 
  };
    
const showToast = (message: string, type: "success" | "warning" | "info" = "success") => {
  const id = Date.now();
  setToasts((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 2800);
};

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].images;
  if (selectedImages.length + files.length > max) {
    showToast(`Total images cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedImages((prev) => [...prev, ...files]);
  showToast(`${files.length} images added.`, "success");
  e.target.value = "";
};

const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].videos;
  if (selectedVideos.length + files.length > max) {
    showToast(`Total videos cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedVideos((prev) => [...prev, ...files]);
  showToast(`Processing ${files.length} file(s)...`, "info");
  e.target.value = "";
};

const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].audio;
  if (selectedAudios.length + files.length > max) {
    showToast(`Total audio files cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedAudios((prev) => [...prev, ...files]);
  showToast(`Processing ${files.length} file(s)...`, "info");
  e.target.value = "";
};
  
  
  const handlePlanChange = (plan: PlanKey) => {
  setSelectedPlan(plan);
  showToast(`Plan upgraded to ${planLimits[plan].label}. You can now upload more files!`, "info");
};


const priceNum = parseFloat(pkgPrice) || 0;
const gross = priceNum;
const fee = Number((priceNum * MARKETPLACE_FEE_PERCENTAGE).toFixed(2));
const net = Number((gross - fee).toFixed(2));
  
const switchPackageTier = (tier: "basic" | "standard" | "premium") => {
  // Save current inputs into packagesData
  setPackagesData((prev) => ({
    ...prev,
    [currentEditingTier]: {
      title: pkgTitle,
      desc: pkgDesc,
      price: pkgPrice,
      delivery: pkgDelivery,
      revisions: pkgRevisions,
      features: pkgFeatures,
    },
  }));

  // Load the new tier
  const data = packagesData[tier];
  setPkgTitle(data.title);
  setPkgDesc(data.desc);
  setPkgPrice(data.price);
  setPkgDelivery(data.delivery);
  setPkgRevisions(data.revisions);
  setPkgFeatures(data.features);

  setCurrentEditingTier(tier);
  showToast(`Switched to ${tier.charAt(0).toUpperCase() + tier.slice(1)} Package`, "info");
};

  
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

const [addons, setAddons] = useState([
  { label: "Extra Fast Delivery (1 Day)", desc: "Get your order in 24 hour express.", price: "25", checked: false },
  { label: "Include Source Files", desc: "The original, editable files for the design/code.", price: "15", checked: false },
  { label: "Extra Revision Round", desc: "One additional opportunity to request changes.", price: "10", checked: false },
]);

const [faqs, setFaqs] = useState([
  { question: "", answer: "" },
]);
    
    
    const toggleAttribute = (value: string) => {
  setSelectedAttributes((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
};

const toggleAddon = (index: number) => {
  setAddons((prev) =>
    prev.map((a, i) => (i === index ? { ...a, checked: !a.checked } : a))
  );
};

const updateAddonPrice = (index: number, price: string) => {
  setAddons((prev) =>
    prev.map((a, i) => (i === index ? { ...a, price } : a))
  );
};

const addMoreAddon = () => {
  setAddons((prev) => [
    ...prev,
    { label: "Extra Service", desc: "", price: "10", checked: false },
  ]);
  showToast("New Add-on block created");
};

const updateFaq = (index: number, field: "question" | "answer", value: string) => {
  setFaqs((prev) =>
    prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
  );
};

const addMoreFaq = () => {
  setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  showToast(`FAQ #${faqs.length + 1} added`);
};
    
    
    const [serviceStatus, setServiceStatus] = useState("available");

    
    
    const [showConfirmModal, setShowConfirmModal] = useState(false);
const [pendingRemove, setPendingRemove] = useState<{ type: string; index: number } | null>(null);

const handleSaveDraft = () => {
  showToast("Saving progress to drafts...", "info");
  setTimeout(() => showToast("Service saved successfully", "success"), 1200);
};

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Ensure latest inputs are synced into packagesData
    const updatedPackagesData = {
      ...packagesData,
      [currentEditingTier]: {
        title: pkgTitle,
        desc: pkgDesc,
        price: pkgPrice,
        delivery: pkgDelivery,
        revisions: pkgRevisions,
        features: pkgFeatures,
      },
    };
    setPackagesData(updatedPackagesData);

    // 2. Validate essential fields
    if (selectedImages.length === 0) {
      showToast("Please upload at least one image for your service.", "warning");
      imagesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!updatedPackagesData.basic.title || !updatedPackagesData.basic.price) {
      showToast("Please fill in at least the Basic package title and price.", "warning");
      return;
    }

    // 3. Handle routing / plan actions
    if (selectedPlan === "silver" || selectedPlan === "gold") {
      showToast("Redirecting to secure payment page...", "info");
      setTimeout(() => {
        // ✅ Smooth Next.js client router redirect without full page reload
        router.push(`/checkout?plan=${selectedPlan}`);
      }, 2000);
    } else {
      showToast("Publishing your service for free...", "info");
      setTimeout(() => {
        showToast("Success! Your service is now live.", "success");
        // Optionally redirect to seller dashboard or service listing after free publish:
        // router.push("/dashboard");
      }, 1500);
    }
  };
  
const requestRemoveItem = (type: "images" | "videos" | "audio" | "faq", index: number) => {
    setPendingRemove({ type, index });
    setShowConfirmModal(true);
  };

  const confirmRemove = () => {
  if (!pendingRemove) return;

  const { type, index } = pendingRemove;

  if (type === "images") {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    showToast("Image removed", "warning");
  } else if (type === "videos") {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
    showToast("Video removed", "warning");
  } else if (type === "audio") {
    setSelectedAudios((prev) => prev.filter((_, i) => i !== index));
    showToast("Audio sample removed", "warning");
  } else if (type === "faq") {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
    showToast("FAQ removed", "warning");
  }


  // Always reset modal state
  setShowConfirmModal(false);
  setPendingRemove(null);
};
  
  const handlePreviewClick = () => {
  // Force-save current package inputs before switching
  setPackagesData((prev) => ({
    ...prev,
    [currentEditingTier]: {
      title: pkgTitle,
      desc: pkgDesc,
      price: pkgPrice,
      delivery: pkgDelivery,
      revisions: pkgRevisions,
      features: pkgFeatures,
    },
  }));

  setViewMode("preview");
  window.scrollTo(0, 0);
};
  
  
  
  
  // Derive active package data matching buildPreviewHTML logic
  const activePackage = {
    ...packagesData[currentEditingTier],
    title: pkgTitle || packagesData[currentEditingTier].title,
    desc: pkgDesc || packagesData[currentEditingTier].desc,
    price: pkgPrice || packagesData[currentEditingTier].price,
    delivery: pkgDelivery || packagesData[currentEditingTier].delivery,
    revisions: pkgRevisions || packagesData[currentEditingTier].revisions,
    features: pkgFeatures || packagesData[currentEditingTier].features,
  };

  const categoryText =
    category === "design"
      ? "Graphics & Design"
      : category === "webdev"
      ? "Web Development"
      : "Category";
  
  
  
  

  return (
    <>
          
      <main className="form-layout">
        <div className="view-toggle-container">
  <div className="toggle-group">
    <button
      type="button"
      className={`toggle-btn ${viewMode === "edit" ? "active" : ""}`}
      onClick={() => setViewMode("edit")}
    >
      <i className="fas fa-edit"></i> Edit Details
    </button>
    <button
      type="button"
      className={`toggle-btn ${viewMode === "preview" ? "active" : ""}`}
      onClick={handlePreviewClick}
    >
      <i className="fas fa-eye"></i> Live Preview
    </button>
  </div>
</div>




{viewMode === "preview" && (
  <div id="live-preview-wrapper" className="service-details-main" style={{ background: "#fff" }}>
    <div className="container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        Home &gt; {categoryText} &gt; <span>{serviceTitle || "Service Title Preview"}</span>
      </nav>

      {/* Service Header */}
      <div className="service-header">
        <h1 className="service-title">{serviceTitle || "Service Title Preview"}</h1>
      </div>

      <div className="content-grid">
        {/* LEFT / MAIN COLUMN */}
        <div className="main-column">
          {/* Gallery Section */}
          <section className="gallery-section">
            <div className="preview-gallery-grid">
              <PreviewMediaGallery
                images={selectedImages}
                videos={selectedVideos}
                audios={selectedAudios}
              />
            </div>
          </section>

          {/* Description Section */}
          <section className="description-section">
            <h2>About This Service</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {description || "Detailed description..."}
            </p>
            {keywords && (
              <div className="tags-row" style={{ marginTop: "20px" }}>
                {keywords
                  .split(",")
                  .filter((t) => t.trim())
                  .map((t, idx) => (
                    <span key={idx} className="tag">
                      #{t.trim()}
                    </span>
                  ))}
              </div>
            )}
          </section>

          {/* Design Brief Section */}
          {(briefIntro || req1 || req2 || req3 || req4) && (
            <section className="requirements-section">
              <h2>Design Brief</h2>
              {briefIntro && <p className="intro-text">{briefIntro}</p>}
              <div className="requirements-list">
                {[req1, req2, req3, req4].map((val, i) =>
                  val ? (
                    <div key={i} className="requirement-item">
                      <h4>Requirement {i + 1}</h4>
                      <p>{val}</p>
                    </div>
                  ) : null
                )}
              </div>
              <div className="tip-box">
                <i className="fas fa-lightbulb"></i>
                <p>
                  <strong>Tip:</strong> The more detailed your brief, the faster the result will be.
                </p>
              </div>
            </section>
          )}

          {/* Attributes Section */}
          <section className="attributes-section">
            <h2>Why Choose Me</h2>
            <div className="attributes-grid">
              {selectedAttributes.length > 0 ? (
                selectedAttributes.map((attr) => (
                  <div key={attr} className="attribute-pill">
                    <i className="fas fa-star"></i>{" "}
                    {attr
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                ))
              ) : (
                <p>No attributes selected</p>
              )}
            </div>
          </section>

          {/* Packages Section */}
          <section
            className="packages-section"
            id="packages-grid"
            style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "30px" }}
          >
            <h3 style={{ marginBottom: "20px" }}>Service Packages</h3>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {(["basic", "standard", "premium"] as const).map((tier) => {
                const data = packagesData[tier];
                if (data.title || data.price || tier === currentEditingTier) {
                  const d = tier === currentEditingTier ? activePackage : data;
                  const featureList = (d.features || "")
                    .split("\n")
                    .filter((f) => f.trim());

                  return (
                    <div
                      key={tier}
                      className={`package-card ${tier === currentEditingTier ? "active" : ""}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        padding: "20px",
                        borderRadius: "8px",
                        flex: "1",
                        minWidth: "250px",
                        display: "flex",
                        flexDirection: "column",
                        background: "#fff",
                      }}
                    >
                      <div
                        className="package-header"
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <span
                          className="package-badge"
                          style={{
                            background: tier === currentEditingTier ? "var(--primary)" : "#64748b",
                            color: "white",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            fontSize: "0.7rem",
                          }}
                        >
                          {tier}
                        </span>
                        <div className="package-price" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                          ${d.price || "0"}
                        </div>
                      </div>
                      <strong style={{ display: "block", margin: "15px 0 5px", fontSize: "1rem" }}>
                        {d.title || "Untitled"}
                      </strong>
                      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "15px", flexGrow: 1 }}>
                        {d.desc || ""}
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, fontSize: "0.85rem", marginBottom: "15px" }}>
                        {featureList.map((f, i) => (
                          <li key={i} style={{ marginBottom: "5px" }}>
                            <i className="fas fa-check" style={{ color: "var(--primary)", marginRight: "8px" }}></i>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button className="btn-primary" style={{ width: "100%", marginTop: "auto" }}>
                        Select {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </button>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </section>

          {/* Addons Section */}
          <section className="addons-section">
            <h2>Available Add-ons</h2>
            <div className="addons-list">
              {addons.filter((a) => a.checked).length > 0 ? (
                addons
                  .filter((a) => a.checked)
                  .map((a, i) => (
                    <label key={i} className="addon-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" className="preview-addon-chk" />
                        <span>{a.label}</span>
                      </div>
                      <span className="addon-price">+${a.price}</span>
                    </label>
                  ))
              ) : (
                <p>No add-ons selected.</p>
              )}
            </div>
          </section>

          {/* FAQ Section */}
          <section className="faq-section">
            <h2>FAQ</h2>
            <div className="faq-accordion">
              {faqs.filter((f) => f.question).length > 0 ? (
                faqs
                  .filter((f) => f.question)
                  .map((f, i) => (
                    <div key={i} className="faq-item">
                      <div className="faq-question">
                        {f.question}
                      </div>
                      <div className="faq-answer">{f.answer}</div>
                    </div>
                  ))
              ) : (
                <p>No FAQs added.</p>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT / SIDEBAR COLUMN (Order Sticky Card) */}
        <div className="sidebar-column">
          <div className="order-card sticky">
            <div
              className="order-header"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span
                  className="package-badge"
                  style={{
                    background: "var(--primary-color)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                  }}
                >
                  {currentEditingTier}
                </span>
                <a href="#packages-grid" style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", cursor: "pointer" }}>
                    select package
                  </span>
                </a>
              </div>
              <div className="order-price" style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--primary-color)" }}>
                ${activePackage.price || "0"}
              </div>
            </div>

            <div
              style={{
                display: "block",
                width: "100%",
                margin: "15px 0",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "15px",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  width: "100%",
                  whiteSpace: "normal",
                  fontSize: "1.1rem",
                  color: "#1e293b",
                }}
              >
                {activePackage.title || "Untitled Package"}
              </strong>
              <p
                className="order-desc"
                style={{
                  display: "block",
                  width: "100%",
                  whiteSpace: "normal",
                  marginTop: "5px",
                  color: "#62646a",
                  fontSize: "0.9rem",
                }}
              >
                {activePackage.desc || "No description provided."}
              </p>
            </div>

            <div
              className="order-delivery"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderTop: "1px solid #eee",
                paddingTop: "15px",
                marginTop: "10px",
              }}
            >
              <div className="delivery-item" style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "25px", display: "flex", justifyContent: "center", marginRight: "10px", color: "var(--primary-color)" }}>
                  <i className="fas fa-clock"></i>
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {activePackage.delivery} Days Delivery
                </span>
              </div>
              <div className="delivery-item" style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "25px", display: "flex", justifyContent: "center", marginRight: "10px", color: "var(--primary-color)" }}>
                  <i className="fas fa-sync-alt"></i>
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {activePackage.revisions} Revisions
                </span>
              </div>
            </div>

            <ul className="package-features" style={{ listStyle: "none", padding: "15px 0", fontSize: "0.85rem", borderBottom: "1px solid #eee" }}>
              {(activePackage.features || "")
                .split("\n")
                .filter((f) => f.trim())
                .map((feature, idx) => (
                  <li key={idx} style={{ marginBottom: "5px" }}>
                    <i className="fas fa-check" style={{ color: "var(--primary)", marginRight: "8px" }}></i>
                    {feature}
                  </li>
                ))}
            </ul>

            <button className="btn-primary full-width" style={{ marginTop: "20px", width: "100%" }}>
              Continue (${activePackage.price || "0"})
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}



        
{viewMode === "edit" && (
  <div className="form-container wide-container">
    <h1><i className="fas fa-clipboard-list"></i> Create Your Service (Gig)</h1>
    <p className="form-instruction">Define your service details and create up to three packages.</p>

    <form className="service-post-form" onSubmit={handleSubmit}>
      {/* ===== BASIC INFO ===== */}
<div className="form-group">
  <label htmlFor="service-title">Service Title</label>
  <input
    type="text"
    id="service-title"
    maxLength={80}
    placeholder="e.g., I will design a modern logo for you..."
    value={serviceTitle}
    onChange={(e) => setServiceTitle(e.target.value)}
    required
  />
  <small className="char-counter">
    <span id="title-count">{serviceTitle.length}</span>/80
  </small>
</div>

<div className="form-group">
  <label htmlFor="category">Service Category</label>
  <select
    id="category"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    required
  >
    <option value="">Select a Category</option>
    <option value="design">Graphics & Design</option>
    <option value="webdev">Web Development</option>
  </select>
</div>

<div className="form-group">
  <label htmlFor="description">Detailed Service Description</label>
  <textarea
    id="description"
    rows={6}
    maxLength={1200}
    placeholder="Outline what the buyer will receive..."
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    required
  />
  <small className="char-counter">
    <span id="desc-count">{description.length}</span>/1200
  </small>
</div>

<div className="form-group">
  <label htmlFor="keywords">Search Keywords (Tags)</label>
  <input
    type="text"
    id="keywords"
    placeholder="e.g., logo design, minimal, brand..."
    value={keywords}
    onChange={(e) => setKeywords(e.target.value)}
    required
  />
  <small>Separate each keyword with a comma. Max 5 keywords.</small>
</div>
  
  {/* ===== DESIGN BRIEF ===== */}
<section className="form-section">
  <h3>Define Your Design Brief</h3>
  <p className="section-help">
    Specify what information you need from the client to start the project.
  </p>

  <div className="brief-builder">
    <div className="input-group full-width">
      <label>Brief Introduction</label>
      <textarea
        name="brief_intro"
        className="brief-intro-textarea"
        placeholder="e.g., To deliver the best possible result..."
        value={briefIntro}
        onChange={(e) => setBriefIntro(e.target.value)}
      />
      <small className="input-help">
        This intro appears at the top of your design brief section.
      </small>
    </div>

    <div className="requirement-input-item">
      <label>Requirement 1: Project Overview</label>
      <textarea
        name="req_1"
        placeholder="Describe your brand/business..."
        value={req1}
        onChange={(e) => setReq1(e.target.value)}
      />
    </div>

    <div className="requirement-input-item">
      <label>Requirement 2: Preferred Style & Inspiration</label>
      <textarea
        name="req_2"
        placeholder="Style preferences, colors, fonts..."
        value={req2}
        onChange={(e) => setReq2(e.target.value)}
      />
    </div>

    <div className="requirement-input-item">
      <label>Requirement 3: Files & References</label>
      <textarea
        name="req_3"
        placeholder="Upload existing assets, moodboards..."
        value={req3}
        onChange={(e) => setReq3(e.target.value)}
      />
    </div>

    <div className="requirement-input-item">
      <label>Requirement 4: Additional Details</label>
      <textarea
        name="req_4"
        placeholder="Target audience, timeline, etc..."
        value={req4}
        onChange={(e) => setReq4(e.target.value)}
      />
    </div>
  </div>
</section>
      
      
      {/* ===== SHOWCASE YOUR WORK (MEDIA) ===== */}
<h2 className="section-heading">Showcase Your Work</h2>
<p className="form-instruction">
  Upload high-quality images and a short video (up to 60 seconds) that best represent your service.
</p>

{/* Images */}
<div ref={imagesSectionRef} className="form-group media-upload-group">
  <label htmlFor="images">Images (Required, up to 3)</label>
  <input
    type="file"
    id="images"
    accept="image/*"
    multiple
    onChange={handleImageUpload}
  />
  <small>
    Formats: JPG, PNG. Max size: 5MB per file.{" "}
    <strong>Plan Limit: Up to {planLimits[selectedPlan].images} images.</strong>
  </small>
 <div id="image-preview-grid" className="media-preview-grid">
  {selectedImages.map((file, index) => (
    <ImagePreviewItem 
      key={index} 
      file={file} 
      onRemove={() => requestRemoveItem("images", index)} 
    />
  ))}
</div>
  
</div>

{/* Video */}
<div className="form-group media-upload-group">
  <label htmlFor="video">Video (Optional, 60s max)</label>
  <input
    type="file"
    id="video"
    accept="video/mp4,video/quicktime"
    multiple
    onChange={handleVideoUpload}
  />
  <small>
    Format: MP4 recommended. Max size: 50MB.{" "}
    <strong>Plan Limit: Up to {planLimits[selectedPlan].videos} video(s).</strong>
  </small>
  <div id="video-preview-list" className="media-preview-grid">
    {selectedVideos.map((file, index) => (
      <div key={index} className="preview-item">
        <div className="file-info">
          <i className="fas fa-video"></i>
          <span>{file.name}</span>
        </div>
        <button
          type="button"
          className="remove-btn"
          onClick={() => requestRemoveItem("videos", index)}
        >
          &times;
        </button>
      </div>
    ))}
  </div>
</div>
      
{/* Audio */}
<div className="form-group media-upload-group">
  <label htmlFor="audio">Audio Sample (Optional, 30s max)</label>
  <input
    type="file"
    id="audio"
    accept="audio/*"
    multiple
    onChange={handleAudioUpload}
  />
  <small>
    Formats: MP3, WAV recommended. Max size: 10MB.{" "}
    <strong>Plan Limit: Up to {planLimits[selectedPlan].audio} audio(s).</strong>
  </small>
  <div id="audio-preview-list" className="media-preview-grid">
    {selectedAudios.map((file, index) => (
      <div key={index} className="preview-item">
        <div className="file-info">
          <i className="fas fa-music"></i>
          <span>{file.name}</span>
        </div>
        <button
          type="button"
          className="remove-btn"
          onClick={() => requestRemoveItem("audio", index)}
        >
          &times;
        </button>
      </div>
    ))}
  </div>
</div>      
      
      {/* ===== DEFINE YOUR PACKAGES ===== */}
<h2 className="section-heading">Define Your Packages</h2>
<p className="section-subheading">
  Create up to three packages (Basic, Standard, Premium) with different pricing and features.
</p>

{/* Package Selector Cards */}
<div className="package-selection-cards">
  <div
    className={`package-selector-card ${currentEditingTier === "basic" ? "active" : ""}`}
    data-tier="basic"
    onClick={() => switchPackageTier("basic")}
  >
    <i className="fas fa-ribbon"></i>
    <h4>Basic</h4>
  </div>
  <div
    className={`package-selector-card ${currentEditingTier === "standard" ? "active" : ""}`}
    data-tier="standard"
    onClick={() => switchPackageTier("standard")}
  >
    <i className="fas fa-trophy"></i>
    <h4>Standard</h4>
  </div>
  <div
    className={`package-selector-card ${currentEditingTier === "premium" ? "active" : ""}`}
    data-tier="premium"
    onClick={() => switchPackageTier("premium")}
  >
    <i className="far fa-star"></i>
    <h4>Premium</h4>
  </div>
</div>

{/* Package Details Block */}
<div className="package-details-block">
  <div className="form-group">
    <label htmlFor="package-title">Package Title</label>
    <input
      type="text"
      id="package-title"
      maxLength={50}
      placeholder="e.g., Basic Logo Design"
      value={pkgTitle}
      onChange={(e) => setPkgTitle(e.target.value)}
    />
    <small className="char-counter">
      <span id="pkg-title-count">{pkgTitle.length}</span>/50
    </small>
  </div>

  <div className="form-group">
    <label htmlFor="package-description">Description</label>
    <textarea
      id="package-description"
      rows={3}
      maxLength={100}
      placeholder="Briefly describe what this package includes..."
      value={pkgDesc}
      onChange={(e) => setPkgDesc(e.target.value)}
    />
    <small className="char-counter">
      <span id="pkg-desc-count">{pkgDesc.length}</span>/100
    </small>
  </div>

  <div className="form-group inline-group price-delivery-row">
    <div className="form-group-item price-input">
      <label htmlFor="package-price">Price</label>
      <div className="input-with-icon">
        <span>$</span>
        <input
          type="number"
          id="package-price"
          placeholder="20"
          min={5}
          value={pkgPrice}
          onChange={(e) => setPkgPrice(e.target.value)}
          required
        />
      </div>
    </div>

    {/* Earnings Breakdown */}
    <div className="earnings-breakdown" id="earnings-calc">
      <div className="earnings-row">
        <span>Selling Price</span>
        <span id="calc-gross">${gross.toFixed(2)}</span>
      </div>
      <div className="earnings-row fee-row">
        <span>Marketplace Fee (12%)</span>
        <span id="calc-fee">-${fee.toFixed(2)}</span>
      </div>
      <div className="earnings-row total-row">
        <span>You&apos;ll Receive</span>
        <span id="calc-net">${net.toFixed(2)}</span>
      </div>
    </div>

    <div className="form-group-item select-input">
      <label htmlFor="package-delivery">Complete in</label>
      <select
        id="package-delivery"
        value={pkgDelivery}
        onChange={(e) => setPkgDelivery(e.target.value)}
        required
      >
        <option value="1">1 day</option>
        <option value="2">2 days</option>
        <option value="3">3 days</option>
        <option value="5">5 days</option>
        <option value="7">7 days</option>
        <option value="10">10 days</option>
      </select>
    </div>
  </div>

  <div className="form-group">
    <label htmlFor="package-revisions">Revisions Included</label>
    <input
      type="number"
      id="package-revisions"
      min={0}
      value={pkgRevisions}
      onChange={(e) => setPkgRevisions(e.target.value)}
      placeholder="Number of revisions"
    />
  </div>

  <div className="form-group">
    <label htmlFor="package-features-list">What&apos;s Included? Key Features (One per line)</label>
    <textarea
      id="package-features-list"
      rows={4}
      placeholder={"List key deliverables\ne.g., - High-resolution JPG\n- Unlimited color options"}
      value={pkgFeatures}
      onChange={(e) => setPkgFeatures(e.target.value)}
    />
  </div>
</div>
    
    
    {/* ===== WHY CHOOSE ME (ATTRIBUTES) ===== */}
<h2 className="section-heading">Why Choose Me? (Key Attributes)</h2>
<p className="section-subheading">
  Select the attributes that best describe your professional work ethic and profile.
</p>

<div className="form-group attribute-selection-group">
  <div className="attribute-list">
    {[
      { value: "certified", label: "Certified" },
      { value: "expert", label: "Expert" },
      { value: "experienced", label: "Experienced" },
      { value: "punctual", label: "Punctual" },
      { value: "organized", label: "Organized" },
      { value: "creative", label: "Creative" },
      { value: "professional", label: "Professional" },
      { value: "flexible", label: "Flexible" },
      { value: "emotional-intelligent", label: "Emotionally Intelligent" },
      { value: "proficient", label: "Proficient" },
    ].map((attr) => (
      <label key={attr.value}>
        <input
          type="checkbox"
          name="attribute"
          value={attr.value}
          checked={selectedAttributes.includes(attr.value)}
          onChange={() => toggleAttribute(attr.value)}
        />{" "}
        {attr.label}
      </label>
    ))}
  </div>
  <small>Clients can see these highlighted qualities on your service page.</small>
</div>

{/* ===== ADD-ONS ===== */}
<h2 className="section-heading">Service Customization & Add-Ons</h2>
<p className="section-subheading">
  Offer extra services (e.g., faster delivery, source files) for an additional fee.
</p>

<div className="feature-section-container add-ons-section">
  {addons.map((addon, index) => (
    <div key={index} className="add-on-item-new">
      <div className="add-on-details">
        <label>
          <input
            type="checkbox"
            checked={addon.checked}
            onChange={() => toggleAddon(index)}
          />{" "}
          {addon.label}
        </label>
        <small>{addon.desc}</small>
      </div>
      <div className="add-on-price">
        <span className="price-prefix">$</span>
        <input
          type="number"
          min={5}
          value={addon.price}
          onChange={(e) => updateAddonPrice(index, e.target.value)}
        />
      </div>
    </div>
  ))}

  <button type="button" className="btn-secondary btn-add-more" onClick={addMoreAddon}>
    + Add More Add-Ons
  </button>
</div>

{/* ===== FAQ ===== */}
<h2 className="section-heading">Frequently Asked Questions (FAQ)</h2>
<p className="section-subheading">
  Anticipate customer queries to save time and increase bookings.
</p>

<div className="feature-section-container faq-section">
  {faqs.map((faq, index) => (
    <div key={index} className="faq-item-new">
      <div className="form-group">
        
        <div style={{ display: "flex", justifyContent: "space-between" }}>
  <label>Question {index + 1}</label>
  <button
    type="button"
    className="remove-item"
    style={{ color: "#d9534f", border: "none", background: "none", cursor: "pointer" }}
    onClick={() => requestRemoveItem("faq", index)}
  >
    <i className="fas fa-trash"></i>
  </button>
</div>
        
        <input
          type="text"
          placeholder="e.g., Do you provide unlimited revisions?"
          value={faq.question}
          onChange={(e) => updateFaq(index, "question", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Answer {index + 1}</label>
        <textarea
          rows={2}
          placeholder="My standard package includes 1 revision..."
          value={faq.answer}
          onChange={(e) => updateFaq(index, "answer", e.target.value)}
        />
      </div>
    </div>
  ))}

  {/* Button is placed inside the container wrapper */}
  <button type="button" className="btn-secondary btn-add-more" onClick={addMoreFaq}>
    + Add More FAQ
  </button>
</div>
  
  {/* ===== PACKAGE PLAN UPGRADE ===== */}
<h2 className="section-heading">Package Plan Upgrade</h2>
<p className="section-subheading">
  Increase your visibility by upgrading your plan to add more images and videos to your service post.
</p>

<div className="feature-section-container package-plan-selection-container">
  <div className="plan-options">
    {/* Free Plan */}
    <div className={`plan-card ${selectedPlan === "free" ? "active" : ""}`}>
      <input
        type="radio"
        id="plan-free"
        name="package-plan"
        value="free"
        checked={selectedPlan === "free"}
        onChange={() => handlePlanChange("free")}
      />
      <label htmlFor="plan-free">
        <h4>Free Plan (Default)</h4>
        <p className="plan-limit">Images: 3 / Videos: 1</p>
        <p className="plan-duration">Lifetime Access</p>
        <p className="plan-price">$0/mon</p>
      </label>
    </div>

    {/* Silver Plan */}
    <div className={`plan-card ${selectedPlan === "silver" ? "active" : ""}`}>
      <input
        type="radio"
        id="plan-silver"
        name="package-plan"
        value="silver"
        checked={selectedPlan === "silver"}
        onChange={() => handlePlanChange("silver")}
      />
      <label htmlFor="plan-silver">
        <h4>Silver Plan</h4>
        <p className="plan-limit">Images: 5 / Videos: 2</p>
        <p className="plan-duration">Expires in 30 days</p>
        <p className="plan-price">$5/mon</p>
      </label>
    </div>

    {/* Gold Plan */}
    <div className={`plan-card ${selectedPlan === "gold" ? "active" : ""}`}>
      <input
        type="radio"
        id="plan-gold"
        name="package-plan"
        value="gold"
        checked={selectedPlan === "gold"}
        onChange={() => handlePlanChange("gold")}
      />
      <label htmlFor="plan-gold">
        <h4>Gold Plan</h4>
        <p className="plan-limit">Images: 8 / Videos: 4</p>
        <p className="plan-duration">Expires in 90 days</p>
        <p className="plan-price">$8/mon</p>
      </label>
    </div>
  </div>
  <small className="plan-note">
    Switching plans may change the media limits applied to your service.
  </small>
</div>

{/* ===== SERVICE AVAILABILITY ===== */}
<h2 className="section-heading">Service Availability</h2>
<p className="section-subheading">
  Control whether your service is currently available and visible on the marketplace.
</p>

<div className="feature-section-container job-availability-section">
  <div className="form-group status-select-group">
    <label htmlFor="service-status">Availability Status</label>
    <select
      id="service-status"
      value={serviceStatus}
      onChange={(e) => setServiceStatus(e.target.value)}
      required
    >
      <option value="available">Available (Go Live)</option>
      <option value="unavailable">Unavailable (Paused)</option>
    </select>
    <small>Set to &apos;Available&apos; to publish your service on the marketplace.</small>
  </div>
</div>

{/* ===== SERVICE SUMMARY (Read Only) ===== */}
<h2 className="section-heading">Service Summary & Metrics</h2>
<p className="section-subheading">
  A quick overview of this service&apos;s performance and plan status (Read Only).
</p>

<div className="feature-section-container job-summary-section">
  <div className="summary-grid">
    <div className="summary-item">
      <span className="summary-label">Date Created:</span>
      <span className="summary-value">October 25, 2025</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Current Plan:</span>
      <span className={`summary-value plan-${selectedPlan}`}>
        {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
      </span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Plan Expiry:</span>
      <span className="summary-value">November 24, 2025</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Total Views:</span>
      <span className="summary-value metric-views">1,452</span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Category:</span>
      <span className="summary-value">
        {category === "design" ? "Graphics & Design" : category === "webdev" ? "Web Development" : "—"}
      </span>
    </div>
    <div className="summary-item">
      <span className="summary-label">Current Status:</span>
      <span className={`summary-value ${serviceStatus === "available" ? "status-active" : ""}`}>
        {serviceStatus === "available" ? "Available" : "Unavailable"}
      </span>
    </div>
  </div>
</div>
  
  
  {/* ===== SAVE & PUBLISH BUTTONS ===== */}
<div className="form-button-group">
  <button type="button" className="btn-secondary draft-button" onClick={handleSaveDraft}>
    Save as Draft
  </button>
  <button type="submit" className="btn-primary publish-button">
    Publish Service
  </button>
</div>
    </form>
      
      
      
  </div>
)}
      
  
  
  {/* Toast Container */}
        <div id="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast ${
                toast.type === "warning" ? "removed" : ""
              } ${toast.type === "info" ? "info-toast" : ""}`}
            >
              <i
                className={`fas ${
                  toast.type === "success"
                    ? "fa-check-circle"
                    : toast.type === "warning"
                    ? "fa-exclamation-triangle"
                    : "fa-info-circle"
                }`}
              ></i>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>

        {/* Confirm Modal */}
        {showConfirmModal && (
          <div
            id="custom-confirm-modal"
            className="modal-overlay"
            style={{ display: "flex" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <i className="fas fa-exclamation-circle"></i>
                <h3>Are you sure?</h3>
              </div>
              <p>
                This action cannot be undone. Do you really want to remove this
                item?
              </p>
              <div className="modal-actions">
                <button
                  id="modal-cancel"
                  className="btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="modal-confirm"
                  className="btn-danger"
                  onClick={confirmRemove}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
      }

// ==========================================
// HELPER COMPONENTS (Placed OUTSIDE main component)
// ==========================================

function ImagePreviewItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!objectUrl) return null;

  return (
    <div className="preview-item">
      <img src={objectUrl} alt="preview" />
      <button type="button" className="remove-btn" onClick={onRemove}>
        &times;
      </button>
    </div>
  );
}


      
      function PreviewMediaGallery({
  images,
  videos,
  audios,
}: {
  images: File[];
  videos: File[];
  audios: File[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Safely memoize object URLs so they are only recreated when files change
  const imageUrls = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  const videoUrls = useMemo(() => videos.map((file) => URL.createObjectURL(file)), [videos]);
  const audioUrls = useMemo(() => audios.map((file) => URL.createObjectURL(file)), [audios]);

  // Cleanup object URLs when media lists change or component unmounts
  useEffect(() => {
    return () => {
      [...imageUrls, ...videoUrls, ...audioUrls].forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls, videoUrls, audioUrls]);

  // Reset active thumbnail index if selected image list shrinks
  useEffect(() => {
    if (activeIndex >= imageUrls.length) {
      setActiveIndex(0);
    }
  }, [imageUrls.length, activeIndex]);

  return (
    <div className="preview-media-container">
      {/* Main Image View */}
      <div className="main-image-wrapper">
        <img
          src={
            imageUrls.length > 0
              ? imageUrls[activeIndex]
              : "https://picsum.photos/id/201/900/550"
          }
          className="main-image featured-preview"
          alt="Main Preview"
        />
      </div>

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <div className="thumbnail-grid">
          {imageUrls.map((url, idx) => (
            <div
              key={idx}
              className={`thumb-item ${idx === activeIndex ? "active" : ""}`}
              onClick={() => setActiveIndex(idx)}
            >
              <img src={url} alt={`Thumbnail ${idx + 1}`} />
            </div>
          ))}
        </div>
      )}

      {/* Videos */}
      {videoUrls.map((url, idx) => (
        <div key={idx} className="preview-media-item video-block">
          <video controls>
            <source src={url} />
          </video>
        </div>
      ))}

      {/* Audio Samples */}
      {audioUrls.map((url, idx) => (
        <div key={idx} className="preview-media-item audio-block">
          <audio controls>
            <source src={url} />
          </audio>
        </div>
      ))}
    </div>
  );
}