// app/post-service/client.tsx

"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { MARKETPLACE_FEE_PERCENTAGE } from "@/lib/constants";
import { PlanKey, PLAN_LIMITS, validateMediaFile, validateMediaQuantity } from "@/lib/validation";

import CategorySelect from "@/components/PostService/CategorySelect";
import { CATEGORIES, CategoryKey } from "@/lib/categories";

import '../../styles/pages/post-service.css';
import '../../styles/pages/service-details.css';


// Shared Types for Draft Hydration & API Validation
interface PackageItem {
  title?: string;
  desc?: string;
  price?: string | number;
  delivery?: string;
  revisions?: string;
  features?: string;
}

interface PackagesPayload {
  basic?: PackageItem;
  standard?: PackageItem;
  premium?: PackageItem;
}

interface AddonItem {
  label: string;
  desc?: string;
  price: number;
  enabled?: boolean;
  selected?: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ServiceDraftResponse {
  draftId?: string;
  _id?: string;
  title?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  keywords?: string[] | string;
  selectedPlan?: PlanKey;
  packages?: PackagesPayload;
  addons?: AddonItem[];
  faqs?: FaqItem[];
  requirements?: string[];
  briefIntro?: string;
  // Remote media URLs returned by the draft API
  images?: string[];
  videos?: string[];
  audio?: string[];
  existingImages?: string[];
  existingVideos?: string[];
  existingAudio?: string[];
}



// Component Definition 
export default function PostServiceClient() {
  // --- All state will go here ---
  
  const router = useRouter();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0); // Default first item open
  
  const searchParams = useSearchParams();
  const [draftId, setDraftId] = useState<string | null>(searchParams.get('draftId'));
// --- Toast ---
const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);

const showToast = useCallback((message: string, type: "success" | "warning" | "info" = "success") => {
  const id = Date.now();
  setToasts((prev) => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 2800);
}, []);

    
    
    // For Edit mode (Seller toggles if this add-on is available for this gig)
const toggleAddonEnabled = (index: number) => {
  setAddons((prev) =>
    prev.map((a, i) => (i === index ? { ...a, enabled: !a.enabled } : a))
  );
};

// For Preview mode (Buyer checks/unchecks to add to their order total)
const toggleAddonSelected = (index: number) => {
  setAddons((prev) =>
    prev.map((a, i) => (i === index ? { ...a, selected: !a.selected } : a))
  );
};

  
 // Hydrate form fields if editing an existing draft
useEffect(() => {
  if (!draftId) return;

  const controller = new AbortController();

  async function loadDraft() {
    try {
      showToast("Loading saved draft...", "info");

      const response = await fetch(`/api/services/draft/${draftId}`, {
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to fetch draft");

      const data: ServiceDraftResponse = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error("Invalid draft payload structure received");
      }

      // Track whether essential sections loaded completely
      let missingFields: string[] = [];

      // Safe hydration for scalar fields
      if (typeof data.title === "string") setServiceTitle(data.title);
      else missingFields.push("title");

      if (typeof data.description === "string") setDescription(data.description);
      else missingFields.push("description");

      if (typeof data.category === "string") setCategory(data.category);
      if (typeof data.subCategory === "string") setSubCategory(data.subCategory);

      if (data.keywords) {
        setKeywords(Array.isArray(data.keywords) ? data.keywords.join(", ") : String(data.keywords));
      }

      if (data.selectedPlan && ["free", "silver", "gold"].includes(data.selectedPlan)) {
        setSelectedPlan(data.selectedPlan);
      }

      if (typeof data.briefIntro === "string") setBriefIntro(data.briefIntro);

      // Safe hydration for Requirements (always reset all four slots)
      if (Array.isArray(data.requirements) && data.requirements.length > 0) {
        setReq1(data.requirements[0] || "");
        setReq2(data.requirements[1] || "");
        setReq3(data.requirements[2] || "");
        setReq4(data.requirements[3] || "");
      } else {
        setReq1("");
        setReq2("");
        setReq3("");
        setReq4("");
        missingFields.push("requirements");
      }

      // Safe hydration for FAQs array
      if (Array.isArray(data.faqs) && data.faqs.length > 0) {
        const validatedFaqs = data.faqs
          .filter((f): f is FaqItem => typeof f === "object" && f !== null && typeof f.question === "string")
          .map((f) => ({
            question: f.question || "",
            answer: f.answer || "",
          }));
        if (validatedFaqs.length > 0) setFaqs(validatedFaqs);
      }

     // Inside loadDraft() within useEffect:
if (Array.isArray(data.addons) && data.addons.length > 0) {
  const validatedAddons = data.addons
    .filter((a): a is AddonItem => typeof a === "object" && a !== null && typeof a.label === "string")
    .map((addon) => ({
      label: addon.label || "",
      desc: addon.desc || "",
      price: typeof addon.price === "number" ? addon.price : parseFloat(addon.price || "0") || 0,
      enabled: addon.enabled !== undefined ? Boolean(addon.enabled) : true,
      selected: Boolean(addon.selected),
    }));
  if (validatedAddons.length > 0) setAddons(validatedAddons);
}

    // Safe hydration for Packages payload
      if (data.packages && typeof data.packages === "object" && data.packages.basic) {
        setPackagesData({
          basic: {
            title: data.packages.basic?.title || "",
            desc: data.packages.basic?.desc || "",
            price: data.packages.basic?.price ? String(data.packages.basic.price) : "",
            delivery: data.packages.basic?.delivery || "3",
            revisions: data.packages.basic?.revisions || "1",
            features: data.packages.basic?.features || "",
          },
          standard: {
            title: data.packages.standard?.title || "",
            desc: data.packages.standard?.desc || "",
            price: data.packages.standard?.price ? String(data.packages.standard.price) : "",
            delivery: data.packages.standard?.delivery || "5",
            revisions: data.packages.standard?.revisions || "3",
            features: data.packages.standard?.features || "",
          },
          premium: {
            title: data.packages.premium?.title || "",
            desc: data.packages.premium?.desc || "",
            price: data.packages.premium?.price ? String(data.packages.premium.price) : "",
            delivery: data.packages.premium?.delivery || "7",
            revisions: data.packages.premium?.revisions || "Unlimited",
            features: data.packages.premium?.features || "",
          },
        });
      } else {
        missingFields.push("packages");
      }

      // Safe hydration for remote media (edit mode)
      const remoteImages = data.existingImages || data.images;
      const remoteVideos = data.existingVideos || data.videos;
      const remoteAudios = data.existingAudio || data.audio;

      if (Array.isArray(remoteImages) && remoteImages.length > 0) {
        setExistingImages(remoteImages.filter((u): u is string => typeof u === "string"));
      }
      if (Array.isArray(remoteVideos) && remoteVideos.length > 0) {
        setExistingVideos(remoteVideos.filter((u): u is string => typeof u === "string"));
      }
      if (Array.isArray(remoteAudios) && remoteAudios.length > 0) {
        setExistingAudios(remoteAudios.filter((u): u is string => typeof u === "string"));
      }

      // Display status toast based on completeness
      if (missingFields.length === 0) {
        showToast("Draft fully loaded successfully!", "success");
      } else {
        showToast(
          `Draft partially loaded. Missing or incomplete: ${missingFields.join(", ")}.`,
          "info"
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;

      console.error("Error loading draft:", err);
      showToast(err?.message || "Failed to load draft details.", "warning");
    }
  }

  loadDraft();

  return () => {
    controller.abort();
  };
}, [draftId, showToast]);
  
  // Ref for scrolling to images container without DOM lookup 
  const imagesSectionRef = useRef<HTMLDivElement>(null);
  
// --- Package Data (Single Source of Truth) ---
const [packagesData, setPackagesData] = useState({
  basic: { title: "", desc: "", price: "", delivery: "3", revisions: "1", features: "" },
  standard: { title: "", desc: "", price: "", delivery: "5", revisions: "3", features: "" },
  premium: { title: "", desc: "", price: "", delivery: "7", revisions: "Unlimited", features: "" },
});

    const [currentEditingTier, setCurrentEditingTier] = useState<"basic" | "standard" | "premium">("basic");
    const [selectedPreviewPackage, setSelectedPreviewPackage] = useState<"basic" | "standard" | "premium">("basic");

// Derived current package for concise JSX bindings
const currentPackage = packagesData[currentEditingTier];

// Generic helper to update any field on the currently active package tier
const updateCurrentPackageField = (field: string, value: string) => {
  setPackagesData((prev) => ({
    ...prev,
    [currentEditingTier]: {
      ...prev[currentEditingTier],
      [field]: value,
    },
  }));
};

// --- Media State (Separated Remote vs. Local Files) ---
// Newly staged local File objects
const [selectedImages, setSelectedImages] = useState<File[]>([]);
const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
const [selectedAudios, setSelectedAudios] = useState<File[]>([]);

// Existing remote media URLs/metadata loaded from draft backend
const [existingImages, setExistingImages] = useState<string[]>([]);
const [existingVideos, setExistingVideos] = useState<string[]>([]);
const [existingAudios, setExistingAudios] = useState<string[]>([]);

// Track IDs/Keys of existing remote media marked for deletion
const [deletedMediaKeys, setDeletedMediaKeys] = useState<string[]>([]);


// --- View & Pagination ---
const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
const [currentStep, setCurrentStep] = useState<number>(1);
  
const [isSubmitting, setIsSubmitting] = useState(false);

// Helper to commit current package form inputs into package state object

const nextStep = () => {
  // Validate Step 1 before proceeding
  if (currentStep === 1) {
    if (!serviceTitle.trim()) {
      showToast("Please enter a service title.", "warning");
      return;
    }
    if (!category) {
      showToast("Please select a category.", "warning");
      return;
    }
    if (!description.trim()) {
      showToast("Please enter a service description.", "warning");
      return;
    }
  }

  // Validate Step 2 before proceeding
  if (currentStep === 2) {
    if (!packagesData.basic.title.trim() || !packagesData.basic.price) {
      showToast("Please fill in at least the Basic package title and price.", "warning");
      return;
    }
  }

  // Validate Step 3 before proceeding
  if (currentStep === 3) {
    if (selectedImages.length === 0 && existingImages.length === 0) {
      showToast("Please upload or retain at least one image.", "warning");
      return;
    }
  }

  setCurrentStep((prev) => Math.min(prev + 1, 4));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const prevStep = () => {
  setCurrentStep((prev) => Math.max(prev - 1, 1));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// --- Form fields (basic info) ---
const [serviceTitle, setServiceTitle] = useState("");
const [category, setCategory] = useState("");
const [subCategory, setSubCategory] = useState("");
const [description, setDescription] = useState("");
const [keywords, setKeywords] = useState("");
  

// --- Plan ---
const [selectedPlan, setSelectedPlan] = useState<PlanKey>("free");

  
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
    

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].images;
  const currentTotal = existingImages.length + selectedImages.length;
  if (currentTotal + files.length > max) {
    showToast(`Total images cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedImages((prev) => [...prev, ...files]);
  showToast(`${files.length} image(s) added.`, "success");
  e.target.value = "";
};

const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].videos;
  const currentTotal = existingVideos.length + selectedVideos.length;
  if (currentTotal + files.length > max) {
    showToast(`Total videos cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedVideos((prev) => [...prev, ...files]);
  showToast(`${files.length} video(s) added.`, "info");
  e.target.value = "";
};

const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const max = planLimits[selectedPlan].audio;
  const currentTotal = existingAudios.length + selectedAudios.length;
  if (currentTotal + files.length > max) {
    showToast(`Total audio files cannot exceed ${max} on this plan.`, "warning");
    e.target.value = "";
    return;
  }
  setSelectedAudios((prev) => [...prev, ...files]);
  showToast(`${files.length} audio file(s) added.`, "info");
  e.target.value = "";
};

// Handlers for deleting existing server-hosted media vs newly staged files
const removeExistingImage = (urlOrKey: string) => {
  setExistingImages((prev) => prev.filter((item) => item !== urlOrKey));
  setDeletedMediaKeys((prev) => [...prev, urlOrKey]);
  showToast("Existing image removed", "warning");
};

const removeExistingVideo = (urlOrKey: string) => {
  setExistingVideos((prev) => prev.filter((item) => item !== urlOrKey));
  setDeletedMediaKeys((prev) => [...prev, urlOrKey]);
  showToast("Existing video removed", "warning");
};

const removeExistingAudio = (urlOrKey: string) => {
  setExistingAudios((prev) => prev.filter((item) => item !== urlOrKey));
  setDeletedMediaKeys((prev) => [...prev, urlOrKey]);
  showToast("Existing audio removed", "warning");
};
  
  
  const handlePlanChange = (plan: PlanKey) => {
  setSelectedPlan(plan);
  showToast(`Plan upgraded to ${planLimits[plan].label}. You can now upload more files!`, "info");
};

const switchPackageTier = (targetTier: "basic" | "standard" | "premium") => {
  setCurrentEditingTier(targetTier);
  showToast(`Switched to ${targetTier.charAt(0).toUpperCase() + targetTier.slice(1)} Package`, "info");
};

// Derived financial indicators
const priceNum = parseFloat(currentPackage.price) || 0;
const gross = priceNum;
const fee = Number((priceNum * MARKETPLACE_FEE_PERCENTAGE).toFixed(2));
const net = Number((gross - fee).toFixed(2));

  
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

const [addons, setAddons] = useState<AddonItem[]>([
  { label: "Extra Fast Delivery (1 Day)", desc: "Get your order in 24 hour express.", price: 25, enabled: true, selected: false },
  { label: "Include Source Files", desc: "The original, editable files for the design/code.", price: 15, enabled: true, selected: false },
  { label: "Extra Revision Round", desc: "One additional opportunity to request changes.", price: 10, enabled: true, selected: false },
]);

const [faqs, setFaqs] = useState([
  { question: "", answer: "" },
]);
    
    

const toggleAttribute = (value: string) => {
  setSelectedAttributes((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
};

const updateAddonField = (index: number, field: "label" | "desc" | "price", value: string) => {
  setAddons((prev) =>
    prev.map((a, i) => {
      if (i !== index) return a;
      if (field === "price") {
        const parsed = parseFloat(value);
        return { ...a, price: isNaN(parsed) ? 0 : parsed };
      }
      return { ...a, [field]: value };
    })
  );
};
    
    
    const removeAddon = (index: number) => {
  setAddons((prev) => prev.filter((_, i) => i !== index));
  showToast("Add-on removed", "warning");
};
    

const addMoreAddon = () => {
  setAddons((prev) => [
    ...prev,
    { label: "Extra Service", desc: "", price: 10, enabled: true, selected: false },
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
    
    
    const [serviceStatus, setServiceStatus] = useState("active");

    
    
    const [showConfirmModal, setShowConfirmModal] = useState(false);
const [pendingRemove, setPendingRemove] = useState<{ type: string; index: number } | null>(null);

  
 // Helper to aggregate all form state into a single FormData payload
const buildServiceFormData = () => {
  // serviceStatus is already "active" | "paused" from the select
  const mappedStatus = serviceStatus === "active" ? "active" : "paused";

  const formData = new FormData();
  formData.append("title", serviceTitle);
  formData.append("category", category);
  formData.append("subCategory", subCategory);
  formData.append("description", description);
  formData.append("keywords", keywords);
  formData.append("selectedPlan", selectedPlan);
  formData.append("status", mappedStatus);
  formData.append("briefIntro", briefIntro);
  formData.append("requirements", JSON.stringify([req1, req2, req3, req4].filter(Boolean)));
  
  // Directly append packagesData since standalone pkg states were removed
  formData.append("packages", JSON.stringify(packagesData));
  
  formData.append("attributes", JSON.stringify(selectedAttributes));
  formData.append("addons", JSON.stringify(addons.filter((a) => a.enabled)));
  formData.append("faqs", JSON.stringify(faqs.filter((f) => f.question.trim())));

  // Explicit media collection strategy (Retain + Add + Delete)
  formData.append("mediaStrategy", "merge");
  formData.append("existingImages", JSON.stringify(existingImages));
  formData.append("existingVideos", JSON.stringify(existingVideos));
  formData.append("existingAudio", JSON.stringify(existingAudios));
  formData.append("deletedMediaKeys", JSON.stringify(deletedMediaKeys));

  // Append newly added binary files
  selectedImages.forEach((file) => formData.append("images", file));
  selectedVideos.forEach((file) => formData.append("videos", file));
  selectedAudios.forEach((file) => formData.append("audio", file));

  return formData;
};

const handleSaveDraft = async () => {
  try {
    setIsSubmitting(true);
    showToast("Saving progress to drafts...", "info");

    const payload = buildServiceFormData();
    // Use set() so we overwrite the status from buildServiceFormData (not append a second value)
    payload.set("status", "draft");

    if (draftId) {
      payload.append("draftId", draftId);
    }

    const endpoint = draftId ? `/api/services/draft/update` : `/api/services/draft`;
    const method = draftId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      body: payload,
    });

    if (!response.ok) {
      throw new Error("Failed to save draft");
    }

    const data = await response.json();
    const savedId = data.draftId || data._id || draftId;

    // Update state so subsequent saves become PUT updates rather than creating new drafts
    if (savedId && savedId !== draftId) {
      setDraftId(savedId);
    }

    showToast(draftId ? "Draft updated successfully!" : "Service draft saved successfully!", "success");
    return savedId;
  } catch (err) {
    console.error("Save draft error:", err);
    showToast("Failed to save draft. Please try again.", "warning");
    return null;
  } finally {
    setIsSubmitting(false);
  }
};
  
  
  
// Helper to validate a package tier object with strict numeric boundaries
const validatePackageTier = (
  pkg: { title: string; desc: string; price: string; delivery: string; revisions: string; features: string },
  tierName: string
): string | null => {
  // 1. Text validations
  if (!pkg.title.trim()) return `Please enter a title for the ${tierName} package.`;
  if (!pkg.desc.trim()) return `Please enter a description for the ${tierName} package.`;

  // 2. Strict Price Validation (Min: $5, Max: $10,000, Max 2 decimal places)
  const numericPrice = Number(pkg.price);
  if (
    !pkg.price.trim() ||
    isNaN(numericPrice) ||
    !isFinite(numericPrice) ||
    numericPrice < 5 ||
    numericPrice > 10000 ||
    !/^\d+(\.\d{1,2})?$/.test(pkg.price.trim())
  ) {
    return `Please enter a valid price for the ${tierName} package ($5 to $10,000, up to 2 decimal places).`;
  }

  // 3. Strict Delivery Time Validation (Min: 1 day, Max: 90 days, integer only)
  const numericDelivery = Number(pkg.delivery);
  if (
    !pkg.delivery.trim() ||
    isNaN(numericDelivery) ||
    !Number.isInteger(numericDelivery) ||
    numericDelivery < 1 ||
    numericDelivery > 90
  ) {
    return `Please select a valid delivery time for the ${tierName} package (1 to 90 days).`;
  }

  // 4. Strict Revisions Validation (0 to 10 integer revisions or "unlimited")
  const revTrimmed = pkg.revisions.trim().toLowerCase();
  if (revTrimmed !== "unlimited") {
    const numericRevisions = Number(pkg.revisions);
    if (
      !pkg.revisions.trim() ||
      isNaN(numericRevisions) ||
      !Number.isInteger(numericRevisions) ||
      numericRevisions < 0 ||
      numericRevisions > 10
    ) {
      return `Please enter valid revisions for the ${tierName} package (0 to 10 or 'unlimited').`;
    }
  }

  // 5. Feature check
  if (!pkg.features.trim()) return `Please enter key features for the ${tierName} package.`;

  return null;
};
  
  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Validate essential fields (Images) — allow existing remote images
  if (selectedImages.length === 0 && existingImages.length === 0) {
    showToast("Please upload or retain at least one image for your service.", "warning");
    imagesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // 2. Validate Basic package (ALWAYS required)
  const basicError = validatePackageTier(packagesData.basic, "Basic");
  if (basicError) {
    showToast(basicError, "warning");
    setCurrentStep(2);
    return;
  }

  // 3. Validate Standard package if any field has content
  const std = packagesData.standard;
  const isStandardStarted = Boolean(std.title || std.desc || std.price || std.features);
  if (isStandardStarted) {
    const stdError = validatePackageTier(std, "Standard");
    if (stdError) {
      showToast(stdError, "warning");
      setCurrentStep(2);
      return;
    }
  }

  // 4. Validate Premium package if any field has content
  const prem = packagesData.premium;
  const isPremiumStarted = Boolean(prem.title || prem.desc || prem.price || prem.features);
  if (isPremiumStarted) {
    const premError = validatePackageTier(prem, "Premium");
    if (premError) {
      showToast(premError, "warning");
      setCurrentStep(2);
      return;
    }
  }

  setIsSubmitting(true);

  // 5. Save draft to backend first to get active draftId
  const activeDraftId = await handleSaveDraft();

  if (!activeDraftId) {
    setIsSubmitting(false);
    return; // Stop if draft saving failed
  }

  // 6. Branch based on selected plan
  if (selectedPlan === "silver" || selectedPlan === "gold") {
    try {
      showToast("Initializing secure checkout...", "info");

      const response = await fetch("/api/checkout/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: activeDraftId, selectedPlan }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Checkout session failed.");

      // Redirect to authentic server-generated payment URL
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error("Checkout redirect failed:", err);
      showToast(err.message || "Failed to initiate payment.", "warning");
      setIsSubmitting(false);
    }
  } else {
    // Free Plan - Send actual HTTP publish request to API
    try {
      showToast("Publishing your service for free...", "info");

      const response = await fetch("/api/services/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: activeDraftId,
          serviceStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to publish service.");
      }

      const data = await response.json();

      showToast("Success! Your service is now live.", "success");

      setTimeout(() => {
        router.push(data.redirectUrl || "/freelancer-dashboard");
      }, 1200);
    } catch (err: any) {
      console.error("Error publishing service:", err);
      showToast(err.message || "Publication failed. Please try again.", "warning");
    } finally {
      setIsSubmitting(false);
    }
  }
};
  
  
// Local staged files + FAQs: remove immediately (no modal) to avoid overlay freezes
// Remote/existing media: still confirm via modal
const requestRemoveItem = (
  type: "images" | "videos" | "audio" | "faq" | "existing-images" | "existing-videos" | "existing-audio",
  index: number
) => {
  // Immediate path for local / FAQ
  if (type === "images") {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    showToast("Image removed", "warning");
    return;
  }
  if (type === "videos") {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
    showToast("Video removed", "warning");
    return;
  }
  if (type === "audio") {
    setSelectedAudios((prev) => prev.filter((_, i) => i !== index));
    showToast("Audio sample removed", "warning");
    return;
  }
  if (type === "faq") {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
    showToast("FAQ removed", "warning");
    return;
  }

  // Existing remote media → confirm first
  setPendingRemove({ type, index });
  setShowConfirmModal(true);
};

const confirmRemove = () => {
  if (!pendingRemove) return;

  const { type, index } = pendingRemove;

  if (type === "existing-images") {
    const key = existingImages[index];
    if (key) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
      setDeletedMediaKeys((prev) => [...prev, key]);
      showToast("Existing image removed", "warning");
    }
  } else if (type === "existing-videos") {
    const key = existingVideos[index];
    if (key) {
      setExistingVideos((prev) => prev.filter((_, i) => i !== index));
      setDeletedMediaKeys((prev) => [...prev, key]);
      showToast("Existing video removed", "warning");
    }
  } else if (type === "existing-audio") {
    const key = existingAudios[index];
    if (key) {
      setExistingAudios((prev) => prev.filter((_, i) => i !== index));
      setDeletedMediaKeys((prev) => [...prev, key]);
      showToast("Existing audio removed", "warning");
    }
  }

  setShowConfirmModal(false);
  setPendingRemove(null);
};

const cancelRemove = () => {
  setShowConfirmModal(false);
  setPendingRemove(null);
};
  
  const handlePreviewClick = () => {
  setViewMode("preview");
  window.scrollTo(0, 0);
};


// Derive active package data directly from single source of truth (Buyer preview selection)
const activePackage = packagesData[selectedPreviewPackage];

// Addon total calculation in live preview
const selectedAddonsTotal = addons
  .filter((a) => a.enabled && a.selected)
  .reduce((sum, a) => sum + a.price, 0);

const basePackagePrice = parseFloat(activePackage.price) || 0;
const grandTotalPrice = basePackagePrice + selectedAddonsTotal;

  

const categoryText =
  category && category in CATEGORIES
    ? CATEGORIES[category as CategoryKey].label
    : "Category";
  
  
  
  

  return (
    <>
          
      <main className="form-layout">
        {/* Violet/Indigo Glassmorphism Sticky Bar */}
        <div className="view-toggle-container">
          {/* Icon-Only Toggle Group */}
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${viewMode === "edit" ? "active" : ""}`}
              onClick={() => setViewMode("edit")}
              title="Edit Details"
            >
              <i className="fas fa-edit"></i>
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "preview" ? "active" : ""}`}
              onClick={handlePreviewClick}
              title="Live Preview"
            >
              <i className="fas fa-external-link-alt"></i>
            </button>
          </div>

          {/* Integrated Slim Progress Bar (Edit mode only) */}
          {viewMode === "edit" && (
            <div className="sticky-progress-container">
              <div className="sticky-progress-track">
                <div 
                  className="sticky-progress-fill" 
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>


{viewMode === "preview" && (
  <div id="live-preview-wrapper" className="service-details-main" style={{ background: "#fff" }}>
    <div className="preview-container">
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
  existingImages={existingImages}
  existingVideos={existingVideos}
  existingAudios={existingAudios}
  newImages={selectedImages}
  newVideos={selectedVideos}
  newAudios={selectedAudios}
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
      if (data.title || data.price || tier === selectedPreviewPackage) {
        const d = packagesData[tier];
        const featureList = (d.features || "")
          .split("\n")
          .filter((f) => f.trim());

        return (
          <div
            key={tier}
            className={`package-card ${tier === selectedPreviewPackage ? "active" : ""}`}
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
    background: tier === selectedPreviewPackage ? "var(--primary-color)" : "#64748b",
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
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", marginTop: "auto" }}
              onClick={() => setSelectedPreviewPackage(tier)}
            >
              Select {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          </div>
        );
      }
      return null;
    })}
  </div>
</section>

          {/* Addons Section (PREVIEW MODE) */}
<section className="addons-section">
  <h2>Available Add-ons</h2>
  <div className="addons-list">
    {addons.filter((a) => a.enabled).length > 0 ? (
      addons
        .filter((a) => a.enabled)
        .map((a, index) => {
          // Find original index in addons array to update state correctly
          const originalIdx = addons.findIndex((item) => item === a);

          return (
            <label 
              key={index} 
              className="addon-item"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                marginBottom: "10px",
                cursor: "pointer",
                background: a.selected ? "#f8fafc" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="checkbox"
                  className="preview-addon-chk"
                  checked={a.selected || false}
                  onChange={() => toggleAddonSelected(originalIdx)}
                />
                <div>
                  <span style={{ fontWeight: "600", display: "block" }}>{a.label}</span>
                  {a.desc && <small style={{ color: "#64748b" }}>{a.desc}</small>}
                </div>
              </div>
              <span className="addon-price" style={{ fontWeight: "700", color: "var(--primary-color)" }}>
                +${a.price}
              </span>
            </label>
          );
        })
    ) : (
      <p>No add-ons available.</p>
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
                  .map((f, i) => {
                    const isOpen = openFaqIndex === i;
                    return (
                      <div
                        key={i}
                        className={`faq-item ${isOpen ? "active" : ""}`}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          padding: "12px 0",
                          cursor: "pointer",
                        }}
                        onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                      >
                        <div
                          className="faq-question"
                          style={{
                            fontWeight: "600",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>{f.question}</span>
                          
                        </div>

                        <div
                          className="faq-answer"
                          style={{
                            display: isOpen ? "block" : "none",
                            marginTop: "8px",
                            color: "#475569",
                            fontSize: "0.95rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {f.answer || (
                            <em style={{ color: "#94a3b8" }}>
                              No answer provided yet.
                            </em>
                          )}
                        </div>
                      </div>
                    );
                  })
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
  {selectedPreviewPackage}
</span>
                <a href="#packages-grid" style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", cursor: "pointer" }}>
                    select package
                  </span>
                </a>
              </div>
              <div className="order-price" style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--primary-color)" }}>
                ${grandTotalPrice}
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
            
            
            {/* SELECTED ADD-ONS SUMMARY IN SIDEBAR */}
{addons.some((a) => a.enabled && a.selected) && (
  <div
    className="order-addons-summary"
    style={{
      padding: "12px 0",
      borderTop: "1px solid #eee",
      margin: "10px 0 0 0",
    }}
  >
    <div
      style={{
        fontSize: "0.85rem",
        fontWeight: "700",
        marginBottom: "8px",
        color: "#475569",
      }}
    >
      Selected Add-ons
    </div>
    {addons
      .filter((a) => a.enabled && a.selected)
      .map((addon, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.85rem",
            color: "#64748b",
            marginBottom: "6px",
          }}
        >
          <span>+ {addon.label}</span>
          <span style={{ fontWeight: "600", color: "#1e293b" }}>
            ${addon.price}
          </span>
        </div>
      ))}
  </div>
)}
                        

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
              Continue (${grandTotalPrice})
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}



{viewMode === "edit" && (
  <div className="form-container wide-container">
    <form className="service-post-form" onSubmit={handleSubmit}>
      
      {/* ==================== PAGE 1: OVERVIEW & BASIC INFO ==================== */}
      {currentStep === 1 && (
        <div className="step-page">
          <h2><i className="fas fa-info-circle"></i> Step 1: Service Overview</h2>
          <p className="form-instruction">Provide basic information about your service so buyers can find it.</p>

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

      <CategorySelect
  category={category}
  subCategory={subCategory}
  onCategoryChange={setCategory}
  onSubCategoryChange={setSubCategory}
/>    
      
      
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

          {/* PAGE 1 NAVIGATION */}
          <div className="step-navigation-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", gap: "10px" }}>
            <button type="button" className="btn-secondary draft-button" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="button" className="btn-primary" onClick={nextStep}>
              Next: Packages & Pricing <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}






 
      {/* ==================== PAGE 2: PRICING, PACKAGES & ADD-ONS ==================== */}
      {currentStep === 2 && (
        <div className="step-page">
          <h2><i className="fas fa-tags"></i> Step 2: Pricing & Packages</h2>
          <p className="form-instruction">Create up to three packages with transparent pricing, delivery times, and optional add-ons.</p>

          {/* ===== DEFINE YOUR PACKAGES ===== */}
          <h3 className="section-heading">Define Your Packages</h3>
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
              <i className="fas fa-star"></i>
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
      value={currentPackage.title}
      onChange={(e) => updateCurrentPackageField("title", e.target.value)}
    />
    <small className="char-counter">
      <span id="pkg-title-count">{currentPackage.title.length}</span>/50
    </small>
  </div>

  <div className="form-group">
    <label htmlFor="package-description">Description</label>
    <textarea
      id="package-description"
      rows={3}
      maxLength={100}
      placeholder="Briefly describe what this package includes..."
      value={currentPackage.desc}
      onChange={(e) => updateCurrentPackageField("desc", e.target.value)}
    />
    <small className="char-counter">
      <span id="pkg-desc-count">{currentPackage.desc.length}</span>/100
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
          value={currentPackage.price}
          onChange={(e) => updateCurrentPackageField("price", e.target.value)}
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
        value={currentPackage.delivery}
        onChange={(e) => updateCurrentPackageField("delivery", e.target.value)}
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
      value={currentPackage.revisions}
      onChange={(e) => updateCurrentPackageField("revisions", e.target.value)}
      placeholder="Number of revisions"
    />
  </div>

  <div className="form-group">
    <label htmlFor="package-features-list">What&apos;s Included? Key Features (One per line)</label>
    <textarea
      id="package-features-list"
      rows={4}
      placeholder={"List key deliverables\ne.g., - High-resolution JPG\n- Unlimited color options"}
      value={currentPackage.features}
      onChange={(e) => updateCurrentPackageField("features", e.target.value)}
    />
  </div>
</div>

          {/* ===== ADD-ONS (EDIT MODE) ===== */}
          <h3 className="section-heading" style={{ marginTop: "40px" }}>Service Customization & Add-Ons</h3>
          <p className="section-subheading">
            Offer extra services (e.g., faster delivery, source files) for an additional fee.
          </p>

          <div className="feature-section-container add-ons-section">
            {addons.map((addon, index) => (
              <div 
                key={index} 
                className="add-on-item-new" 
                style={{ 
                  flexDirection: "column", 
                  gap: "10px", 
                  padding: "15px", 
                  border: "1px solid #e2e8f0", 
                  borderRadius: "8px", 
                  marginBottom: "15px", 
                  background: "#f1f5f9"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={addon.enabled}
                      onChange={() => toggleAddonEnabled(index)}
                    />
                    Enable Option
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => removeAddon(index)}
                    style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>

                <div style={{ display: "flex", gap: "15px", width: "100%", flexWrap: "wrap" }}>
                  <div style={{ flex: "2", minWidth: "200px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Add-on Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Extra Fast Delivery"
                      value={addon.label}
                      onChange={(e) => updateAddonField(index, "label", e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div style={{ flex: "1", minWidth: "120px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Price ($)</label>
                    <div className="add-on-price" style={{ marginTop: "0" }}>
                      <span className="price-prefix">$</span>
                      <input
                        type="number"
                        min={5}
                        value={addon.price}
                        onChange={(e) => updateAddonField(index, "price", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ width: "100%" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief details about this add-on..."
                    value={addon.desc}
                    onChange={(e) => updateAddonField(index, "desc", e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              </div>
            ))}

            <button type="button" className="btn-secondary btn-add-more" onClick={addMoreAddon}>
              + Add More Add-Ons
            </button>
          </div>

          {/* PAGE 2 NAVIGATION */}
          <div className="step-navigation-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={prevStep}>
              <i className="fas fa-arrow-left"></i> Previous
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn-secondary draft-button" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Next: Media & Brief <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}



        
      
      
      
    
      {/* ==================== PAGE 3: MEDIA & DESIGN BRIEF ==================== */}
      {currentStep === 3 && (
        <div className="step-page">
          <h2><i className="fas fa-photo-video"></i> Step 3: Media & Client Brief</h2>
          <p className="form-instruction">Upload media showcasing your work and set requirements for your buyers.</p>

          {/* ===== SHOWCASE YOUR WORK (MEDIA) ===== */}
          <h3 className="section-heading">Showcase Your Work</h3>
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
              {/* Existing remote images (edit mode) */}
              {existingImages.map((url, index) => (
                <div key={`existing-img-${index}`} className="preview-item">
                  <img src={url} alt={`Existing image ${index + 1}`} />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => requestRemoveItem("existing-images", index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {/* Newly staged local images */}
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
              {existingVideos.map((url, index) => (
                <div key={`existing-vid-${index}`} className="preview-item">
                  <div className="file-info">
                    <i className="fas fa-video"></i>
                    <span>Existing video {index + 1}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => requestRemoveItem("existing-videos", index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {selectedVideos.map((file, index) => (
                <div key={`new-vid-${index}`} className="preview-item">
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
              {existingAudios.map((url, index) => (
                <div key={`existing-aud-${index}`} className="preview-item">
                  <div className="file-info">
                    <i className="fas fa-music"></i>
                    <span>Existing audio {index + 1}</span>
                  </div>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => requestRemoveItem("existing-audio", index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {selectedAudios.map((file, index) => (
                <div key={`new-aud-${index}`} className="preview-item">
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

          {/* ===== DESIGN BRIEF ===== */}
          <section className="form-section" style={{ marginTop: "40px" }}>
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

          {/* PAGE 3 NAVIGATION */}
          <div className="step-navigation-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={prevStep}>
              <i className="fas fa-arrow-left"></i> Previous
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn-secondary draft-button" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Next: Options & Publish <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      )}
      
         
    
    
      {/* ==================== PAGE 4: ATTRIBUTES, FAQ & PUBLISH ==================== */}
      {currentStep === 4 && (
        <div className="step-page">
          <h2><i className="fas fa-rocket"></i> Step 4: Final Options & Publish</h2>
          <p className="form-instruction">Add finishing details, choose your visibility plan, and publish your service.</p>

          {/* ===== WHY CHOOSE ME (ATTRIBUTES) ===== */}
          <h3 className="section-heading">Why Choose Me? (Key Attributes)</h3>
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

          {/* ===== FAQ ===== */}
          <h3 className="section-heading" style={{ marginTop: "30px" }}>Frequently Asked Questions (FAQ)</h3>
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

            <button type="button" className="btn-secondary btn-add-more" onClick={addMoreFaq}>
              + Add More FAQ
            </button>
          </div>

          {/* ===== PACKAGE PLAN UPGRADE ===== */}
          <h3 className="section-heading" style={{ marginTop: "30px" }}>Package Plan Upgrade</h3>
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
          <h3 className="section-heading" style={{ marginTop: "30px" }}>Service Availability</h3>
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
      <option value="active">Active (Go Live)</option>
      <option value="paused">Paused (Unavailable)</option>
    </select>
    <small>Set to &apos;Active&apos; to publish your service on the marketplace.</small>
  </div>
</div>

          {/* ===== SERVICE SUMMARY (Read Only) ===== */}
          <h3 className="section-heading" style={{ marginTop: "30px" }}>Service Summary & Metrics</h3>
          <p className="section-subheading">
            A quick overview of this service&apos;s performance and plan status (Read Only).
          </p>

          <div className="feature-section-container job-summary-section">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Date Created:</span>
                <span className="summary-value">—</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Current Plan:</span>
                <span className={`summary-value plan-${selectedPlan}`}>
                  {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Plan Expiry:</span>
                <span className="summary-value">—</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Views:</span>
                <span className="summary-value metric-views">—</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Category:</span>
                <span className="summary-value">
                  {categoryText || "—"}
                </span>
              </div>
              <div className="summary-item">
  <span className="summary-label">Current Status:</span>
  <span className={`summary-value ${serviceStatus === "active" ? "status-active" : ""}`}>
    {serviceStatus === "active" ? "Active" : "Paused"}
  </span>
</div>
            </div>
          </div>

          {/* PAGE 4 NAVIGATION & SUBMIT */}
          <div className="step-navigation-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", gap: "10px" }}>
            <button type="button" className="btn-secondary" onClick={prevStep}>
              <i className="fas fa-arrow-left"></i> Previous
            </button>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" className="btn-secondary draft-button" onClick={handleSaveDraft} disabled={isSubmitting}>
                Save as Draft
              </button>
              <button type="submit" className="btn-primary publish-button" disabled={isSubmitting}>
                {isSubmitting ? "Publishing..." : "Publish Service"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            style={{
              display: "flex",
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.45)",
            }}
            onClick={cancelRemove}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                  onClick={cancelRemove}
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
  existingImages = [],
  existingVideos = [],
  existingAudios = [],
  newImages = [],
  newVideos = [],
  newAudios = [],
}: {
  existingImages?: string[];
  existingVideos?: string[];
  existingAudios?: string[];
  newImages?: File[];
  newVideos?: File[];
  newAudios?: File[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Derive a stable signature so we only rebuild object URLs when files actually change
  const imageSig = useMemo(
    () => newImages.map((f) => `${f.name}-${f.size}-${f.lastModified}`).join("|"),
    [newImages]
  );
  const videoSig = useMemo(
    () => newVideos.map((f) => `${f.name}-${f.size}-${f.lastModified}`).join("|"),
    [newVideos]
  );
  const audioSig = useMemo(
    () => newAudios.map((f) => `${f.name}-${f.size}-${f.lastModified}`).join("|"),
    [newAudios]
  );

  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [newVideoUrls, setNewVideoUrls] = useState<string[]>([]);
  const [newAudioUrls, setNewAudioUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setNewImageUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSig]);

  useEffect(() => {
    const urls = newVideos.map((file) => URL.createObjectURL(file));
    setNewVideoUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoSig]);

  useEffect(() => {
    const urls = newAudios.map((file) => URL.createObjectURL(file));
    setNewAudioUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSig]);

  const allImageUrls = useMemo(
    () => [...existingImages, ...newImageUrls],
    [existingImages, newImageUrls]
  );

  useEffect(() => {
    if (allImageUrls.length > 0 && activeIndex >= allImageUrls.length) {
      setActiveIndex(0);
    }
  }, [allImageUrls.length, activeIndex]);

  return (
    <div className="preview-media-container">
      {/* Main Image View */}
      <div className="main-image-wrapper">
        <img
          src={
            allImageUrls.length > 0
              ? allImageUrls[activeIndex]
              : "https://picsum.photos/id/201/900/550"
          }
          className="main-image featured-preview"
          alt="Main Preview"
        />
      </div>

      {/* Thumbnails */}
      {allImageUrls.length > 1 && (
        <div className="thumbnail-grid">
          {allImageUrls.map((url, idx) => (
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

      {/* Existing + new Videos */}
      {existingVideos.map((url, idx) => (
        <div key={`ev-${idx}`} className="preview-media-item video-block">
          <video controls>
            <source src={url} />
          </video>
        </div>
      ))}
      {newVideoUrls.map((url, idx) => (
        <div key={`nv-${idx}`} className="preview-media-item video-block">
          <video controls>
            <source src={url} />
          </video>
        </div>
      ))}

      {/* Existing + new Audio Samples */}
      {existingAudios.map((url, idx) => (
        <div key={`ea-${idx}`} className="preview-media-item audio-block">
          <audio controls>
            <source src={url} />
          </audio>
        </div>
      ))}
      {newAudioUrls.map((url, idx) => (
        <div key={`na-${idx}`} className="preview-media-item audio-block">
          <audio controls>
            <source src={url} />
          </audio>
        </div>
      ))}
    </div>
  );
}
