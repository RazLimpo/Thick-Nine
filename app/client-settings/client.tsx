// app/client-settings/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/client-settings.css";

type PanelId =
  | "account-panel"
  | "security-panel"
  | "billing-panel"
  | "notifications-panel"
  | "templates-panel"
  | "privacy-panel";

type ClientProfile = {
  fullName?: string;
  displayName?: string;
  tagline?: string;
  bio?: string;
  avatar?: string;
  profilePicture?: string;
  coverImage?: string;
  location?: string | { city?: string; country?: string };
  languages?: string[] | string;
  preferredSkills?: string[] | string;
  projectTypes?: string[];
  preferredProjectType?: string;
  projectScale?: string;
  keyRequirements?: string;
  timezone?: string;
  contactPref?: string;
  minBudget?: number;
  maxBudget?: number;
  escrowPref?: string;
  profileVisibility?: boolean;
  orderVisibility?: boolean;
  notifications?: {
    emailOrders?: boolean;
    appOrders?: boolean;
    marketing?: boolean;
  };
  twoFactorEnabled?: boolean;
};

type JobTemplate = {
  id: string;
  _id?: string;
  internalName: string;
  jobTitle: string;
  category: string;
  description: string;
  deliverables: string;
  skills: string;
  updatedAt?: string;
};

type PaymentMethod = {
  _id?: string;
  brand: string;
  last4: string;
  label?: string;
  isDefault?: boolean;
  addedAt?: string;
};

type LoginRow = {
  _id?: string;
  ip?: string;
  device?: string;
  userAgent?: string;
  success?: boolean;
  createdAt?: string;
};

function showToast(
  message: string,
  type: "success" | "removed" | "info" = "success"
) {
  if (typeof document === "undefined") return;
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type === "removed" ? "removed" : ""}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "removed"
        ? "fa-exclamation-triangle"
        : "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i><span></span>`;
  const span = toast.querySelector("span");
  if (span) span.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function toList(v?: string[] | string) {
  if (Array.isArray(v)) return v.join(", ");
  return v || "";
}

function fromList(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function locationStr(loc?: ClientProfile["location"]) {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  return [loc.city, loc.country].filter(Boolean).join(", ");
}

export default function ClientSettingsClient() {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelId>("account-panel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("/default-avatar.png");
  const [coverImage, setCoverImage] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [projectType, setProjectType] = useState("fixed");
  const [projectScale, setProjectScale] = useState("medium");
  const [keyRequirements, setKeyRequirements] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("est");
  const [languages, setLanguages] = useState("");
  const [contactPref, setContactPref] = useState("messaging");
  const [minBudget, setMinBudget] = useState("0");
  const [maxBudget, setMaxBudget] = useState("0");
  const [escrowPref, setEscrowPref] = useState("always");
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [orderVisibility, setOrderVisibility] = useState(true);

  // Notifications
  const [emailOrders, setEmailOrders] = useState(true);
  const [appOrders, setAppOrders] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // Security modal
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Templates (local until JobTemplate API exists)
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplJobTitle, setTplJobTitle] = useState("");
  const [tplCategory, setTplCategory] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplDeliverables, setTplDeliverables] = useState("");
  const [tplSkills, setTplSkills] = useState("");

  // Billing
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pmBrand, setPmBrand] = useState("Visa");
  const [pmLast4, setPmLast4] = useState("");
  const [pmLabel, setPmLabel] = useState("");

  // Login activity
  const [loginActivity, setLoginActivity] = useState<LoginRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  }, []);

  const switchPanel = (id: PanelId) => {
    setPanel(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as PanelId;
    const valid: PanelId[] = [
      "account-panel",
      "security-panel",
      "billing-panel",
      "notifications-panel",
      "templates-panel",
      "privacy-panel",
    ];
    if (hash && valid.includes(hash)) setPanel(hash);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        router.replace("/?auth=login");
        return;
      }
      const res = await fetch("/api/users/profile", {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/?auth=login");
        return;
      }
      if (!res.ok) {
        showToast(data.message || "Failed to load profile.", "removed");
        return;
      }
      const u: ClientProfile = data.user || data.profile || data || {};
      setDisplayName(u.displayName || u.fullName || "");
      setTagline(u.tagline || "");
      setBio(u.bio || "");
      setAvatar(u.avatar || u.profilePicture || "/default-avatar.png");
      setCoverImage(u.coverImage || "");
      setPreferredSkills(toList(u.preferredSkills));
      setProjectTypes(Array.isArray(u.projectTypes) ? u.projectTypes : []);
      setProjectType(u.preferredProjectType || "fixed");
      setProjectScale(u.projectScale || "medium");
      setKeyRequirements(u.keyRequirements || "");
      setLocation(locationStr(u.location));
      setTimezone(u.timezone || "est");
      setLanguages(toList(u.languages));
      setContactPref(u.contactPref || "messaging");
      setMinBudget(String(u.minBudget ?? 0));
      setMaxBudget(String(u.maxBudget ?? 0));
      setEscrowPref(u.escrowPref || "always");
      setProfileVisibility(u.profileVisibility !== false);
      setOrderVisibility(u.orderVisibility !== false);
      setEmailOrders(u.notifications?.emailOrders !== false);
      setAppOrders(u.notifications?.appOrders !== false);
      setMarketing(Boolean(u.notifications?.marketing));
      setTwoFactorEnabled(Boolean(u.twoFactorEnabled));

      // Templates + payment methods from API
      try {
        const [tRes, pRes] = await Promise.all([
          fetch("/api/client/templates", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch("/api/client/payment-methods", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ]);
        const tData = await tRes.json().catch(() => ({}));
        const pData = await pRes.json().catch(() => ({}));
        if (tRes.ok && Array.isArray(tData.templates)) {
          setTemplates(
            tData.templates.map((x: JobTemplate & { _id?: string }) => ({
              ...x,
              id: String(x._id || x.id),
            }))
          );
        }
        if (pRes.ok && Array.isArray(pData.paymentMethods)) {
          setPaymentMethods(pData.paymentMethods);
        }
      } catch {
        /* ignore secondary loads */
      }
    } catch {
      showToast("Network error loading profile.", "removed");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const uploadMedia = async (file: File, kind: "avatar" | "cover") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind === "cover" ? "cover" : "avatar");
    const headers = getAuthHeaders();
    delete headers["Content-Type"];
    const res = await fetch("/api/users/upload", {
      method: "POST",
      credentials: "include",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Upload failed.");
    }
    return (data.url || data.secure_url || data.avatar || data.coverImage) as string;
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "avatar");
      if (url) {
        setAvatar(url);
        showToast("Profile photo updated.", "success");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed.",
        "removed"
      );
    }
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file, "cover");
      if (url) {
        setCoverImage(url);
        showToast("Cover photo updated.", "success");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed.",
        "removed"
      );
    }
  };

  const saveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const body = {
        displayName: displayName.trim(),
        tagline: tagline.trim(),
        bio: bio.trim(),
        preferredSkills: fromList(preferredSkills),
        projectTypes,
        preferredProjectType: projectType,
        projectScale,
        keyRequirements: keyRequirements.trim(),
        location: location.trim(),
        timezone,
        languages: fromList(languages),
        contactPref,
        minBudget: Number(minBudget) || 0,
        maxBudget: Number(maxBudget) || 0,
        escrowPref,
        profileVisibility,
        orderVisibility,
        notifications: {
          emailOrders,
          appOrders,
          marketing,
        },
      };
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not save profile.", "removed");
        return;
      }
      showToast("Profile saved.", "success");
    } catch {
      showToast("Network error while saving.", "removed");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notifications: { emailOrders, appOrders, marketing },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || "Could not save notifications.", "removed");
        return;
      }
      showToast("Notification preferences saved.", "success");
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setSaving(false);
    }
  };

  const savePrivacy = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileVisibility, orderVisibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || "Could not save privacy settings.", "removed");
        return;
      }
      showToast("Privacy settings saved.", "success");
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters.", "removed");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "removed");
      return;
    }
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not change password.", "removed");
        return;
      }
      showToast("Password updated.", "success");
      setPwdOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const saveTemplate = async () => {
    if (!tplName.trim() || !tplJobTitle.trim()) {
      showToast("Template name and job title are required.", "removed");
      return;
    }
    try {
      const res = await fetch("/api/client/templates", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          internalName: tplName.trim(),
          jobTitle: tplJobTitle.trim(),
          category: tplCategory,
          description: tplDesc,
          deliverables: tplDeliverables,
          skills: tplSkills,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not save template.", "removed");
        return;
      }
      const tpl = data.template;
      if (tpl) {
        setTemplates((prev) => [
          { ...tpl, id: String(tpl._id || tpl.id) },
          ...prev,
        ]);
      }
      setTplName("");
      setTplJobTitle("");
      setTplCategory("");
      setTplDesc("");
      setTplDeliverables("");
      setTplSkills("");
      showToast("Template saved.", "success");
    } catch {
      showToast("Network error saving template.", "removed");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/client/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not delete template.", "removed");
        return;
      }
      setTemplates((prev) => prev.filter((x) => x.id !== id));
      showToast("Template removed.", "info");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const loadLoginActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await fetch("/api/client/login-activity?limit=20", {
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.activity)) {
        setLoginActivity(data.activity);
      } else {
        showToast(data.message || "Could not load activity.", "removed");
      }
    } catch {
      showToast("Network error loading activity.", "removed");
    } finally {
      setActivityLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    try {
      const res = await fetch("/api/client/payment-methods", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: pmBrand,
          last4: pmLast4,
          label: pmLabel,
          isDefault: paymentMethods.length === 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not add method.", "removed");
        return;
      }
      setPaymentMethods(data.paymentMethods || []);
      setPmLast4("");
      setPmLabel("");
      showToast("Payment method saved (last4 only).", "success");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const removePaymentMethod = async (id: string) => {
    if (!confirm("Remove this payment method?")) return;
    try {
      const res = await fetch(`/api/client/payment-methods/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not remove.", "removed");
        return;
      }
      setPaymentMethods(data.paymentMethods || []);
      showToast("Payment method removed.", "info");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const toggle2FA = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/client/2fa", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not update 2FA.", "removed");
        return;
      }
      setTwoFactorEnabled(!!data.twoFactorEnabled);
      showToast(data.message || (enabled ? "2FA enabled." : "2FA disabled."), "success");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const deactivateAccount = async () => {
    if (
      !confirm(
        "Permanently deactivate your account? You will be signed out. Support can reactivate later."
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/client/deactivate", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Deactivation failed.", "removed");
        return;
      }
      showToast("Account deactivated.", "info");
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {
        /* ignore */
      }
      router.push("/?auth=login");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const signOut = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {
      /* ignore */
    }
    router.push("/?auth=login");
  };

  const toggleProjectType = (value: string) => {
    setProjectTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  if (loading) {
    return (
      <main className="client-settings-page page-container account-management-page">
        <div className="dashboard-layout">
          <p style={{ padding: 40, color: "#64748b" }}>Loading settings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="client-settings-page page-container account-management-page">
      <div className="dashboard-layout">
        <h1>Client Account Management</h1>
        <p className="page-intro">
          Manage your public profile, security settings, payment methods, and
          communication preferences.
        </p>

        <div className="dashboard-content">
          <nav className="settings-nav-sidebar">
            <h3>Client Settings</h3>
            <ul>
              {(
                [
                  ["account-panel", "fa-user-circle", "Account"],
                  ["security-panel", "fa-shield-alt", "Security & Login"],
                  ["billing-panel", "fa-credit-card", "Billing & Payments"],
                  ["notifications-panel", "fa-bell", "Notifications"],
                  ["templates-panel", "fa-layer-group", "Project Templates"],
                  ["privacy-panel", "fa-lock", "Privacy & Data"],
                ] as [PanelId, string, string][]
              ).map(([id, icon, label]) => (
                <li key={id} className={panel === id ? "active" : ""}>
                  <a
                    href={`#${id}`}
                    data-target={id}
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel(id);
                    }}
                  >
                    <i className={`fas ${icon}`} /> {label}
                  </a>
                </li>
              ))}
              <li className="separator" />
              <li>
                <Link href="/about">
                  <i className="fas fa-question-circle" /> Help & Support
                </Link>
              </li>
            </ul>
            <button type="button" className="sign-out-btn" onClick={signOut}>
              <i className="fas fa-sign-out-alt" /> Sign Out
            </button>
          </nav>

          <div className="content-area">
            {/* ACCOUNT */}
            <section
              id="account-panel"
              className={`content-panel ${
                panel === "account-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-user-edit" /> Public Profile Management
              </h2>
              <p className="panel-description">
                This is the information freelancers see when viewing your
                profile.
              </p>

              <form
                className="settings-form client-profile-edit-layout"
                onSubmit={saveProfile}
              >
                <div className="profile-edit-main">
                  <div className="sidebar-card">
                    <h2>
                      <i className="fas fa-id-card-alt" /> Visual Identity &amp;
                      Branding
                    </h2>

                    <div className="form-group profile-cover-edit">
                      <label>Profile Cover Photo</label>
                      <div
                        className="current-cover-preview"
                        id="cover-preview-container"
                        style={
                          coverImage
                            ? {
                                backgroundImage: `url(${coverImage})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        {!coverImage && (
                          <div className="cover-placeholder">
                            No Cover Image Selected
                          </div>
                        )}
                      </div>
                      <div className="upload-controls">
                        <input
                          type="file"
                          id="client-cover-photo"
                          accept="image/*"
                          onChange={onCoverChange}
                        />
                        <p className="form-help-text">
                          Recommended size: 1200x300px. Max size 5MB.
                        </p>
                      </div>
                    </div>

                    <div className="form-group profile-photo-edit">
                      <label>Profile Picture / Logo</label>
                      <div
                        className="profile-photo-preview"
                        id="avatar-preview-container"
                      >
                        <Image
                          src={avatar || "/default-avatar.png"}
                          alt="Avatar"
                          width={150}
                          height={150}
                          id="avatar-preview"
                          unoptimized
                        />
                      </div>
                      <div className="upload-controls">
                        <input
                          type="file"
                          id="client-profile-picture"
                          accept="image/*"
                          onChange={onAvatarChange}
                        />
                      </div>
                      <p className="form-help-text">
                        Upload your business logo or avatar. Max size 5MB.
                      </p>
                    </div>

                    <div className="section-divider" />

                    <div className="form-group">
                      <label htmlFor="client-display-name">
                        Display Name / Business Name
                      </label>
                      <input
                        type="text"
                        id="client-display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="client-tagline">
                        Bio Snippet (Short Tagline)
                      </label>
                      <input
                        type="text"
                        id="client-tagline"
                        maxLength={150}
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="A short sentence about your company"
                      />
                      <p className="form-help-text">
                        Appears under your name (max 150 characters).
                      </p>
                    </div>

                    <div className="section-divider" />

                    <div className="form-group">
                      <label htmlFor="client-bio">
                        About Me / Business Description
                      </label>
                      <textarea
                        id="client-bio"
                        rows={6}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sidebar-card">
                    <h2>
                      <i className="fas fa-briefcase" /> Project Preferences
                    </h2>

                    <div className="form-group">
                      <label htmlFor="preferred-skills">
                        Preferred Freelancer Skills (Tags)
                      </label>
                      <input
                        type="text"
                        id="preferred-skills"
                        value={preferredSkills}
                        onChange={(e) => setPreferredSkills(e.target.value)}
                        placeholder="AWS, React, Technical Writing"
                      />
                      <p className="form-help-text">
                        Comma-separated skills you hire for most often.
                      </p>
                    </div>

                    <div className="form-group">
                      <label>Typical Project Types</label>
                      <div className="project-type-checks">
                        {[
                          ["web-app-dev", "Web App Development"],
                          ["cloud-infra", "Cloud Infrastructure"],
                          ["ux-design", "UX/UI Design"],
                          ["seo", "SEO & Marketing"],
                          ["tech-writing", "Technical Writing"],
                        ].map(([val, label]) => (
                          <label key={val} className="status-toggle-switch">
                            <input
                              type="checkbox"
                              checked={projectTypes.includes(val)}
                              onChange={() => toggleProjectType(val)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="project-type">
                        Preferred Project Type
                      </label>
                      <select
                        id="project-type"
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                      >
                        <option value="fixed">Fixed Price</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="project-scale">
                        Average Project Scale
                      </label>
                      <select
                        id="project-scale"
                        value={projectScale}
                        onChange={(e) => setProjectScale(e.target.value)}
                      >
                        <option value="small">
                          Small (Quick Tasks, &lt; $500)
                        </option>
                        <option value="medium">
                          Medium (Standard Projects, $500 – $5k)
                        </option>
                        <option value="large">
                          Large (Enterprise / Long-term, $5k+)
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="key-requirements">
                        Key Requirements (comma separated)
                      </label>
                      <input
                        type="text"
                        id="key-requirements"
                        value={keyRequirements}
                        onChange={(e) => setKeyRequirements(e.target.value)}
                        placeholder="e.g. NDA Required, Specific Timezone"
                      />
                    </div>
                  </div>

                  <div className="sidebar-card contact-card">
                    <h2>
                      <i className="fas fa-map-marked-alt" /> Communication &amp;
                      Location
                    </h2>
                    <div className="form-group">
                      <label htmlFor="client-location">
                        Location (City, Country)
                      </label>
                      <input
                        type="text"
                        id="client-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="client-timezone">Time Zone</label>
                      <select
                        id="client-timezone"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                      >
                        <option value="est">EST (UTC-5)</option>
                        <option value="pst">PST (UTC-8)</option>
                        <option value="gmt">GMT (UTC+0)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="client-languages">Languages Spoken</label>
                      <input
                        type="text"
                        id="client-languages"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        placeholder="English, Spanish"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="contact-pref">
                        Freelancer Contact Preference
                      </label>
                      <select
                        id="contact-pref"
                        value={contactPref}
                        onChange={(e) => setContactPref(e.target.value)}
                      >
                        <option value="messaging">
                          Platform Messaging Only
                        </option>
                        <option value="email">Email</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>

                  <div className="sidebar-card budget-card">
                    <h3>
                      <i className="fas fa-money-bill-wave" /> Budget &amp;
                      Payment Preferences
                    </h3>
                    <div className="form-group">
                      <label htmlFor="min-budget">
                        Typical Minimum Budget ($)
                      </label>
                      <input
                        type="number"
                        id="min-budget"
                        min={0}
                        value={minBudget}
                        onChange={(e) => setMinBudget(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="max-budget">
                        Typical Maximum Budget ($)
                      </label>
                      <input
                        type="number"
                        id="max-budget"
                        min={0}
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="escrow-pref">Escrow Service Usage</label>
                      <select
                        id="escrow-pref"
                        value={escrowPref}
                        onChange={(e) => setEscrowPref(e.target.value)}
                      >
                        <option value="always">Always Use Escrow</option>
                        <option value="sometimes">Sometimes Use Escrow</option>
                        <option value="never">Rarely Use Escrow</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Manage Payment Methods</label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-full-width"
                        onClick={() => switchPanel("billing-panel")}
                      >
                        <i className="fas fa-credit-card" /> Go to Billing
                      </button>
                    </div>
                  </div>

                  <div className="sidebar-card security-card">
                    <h3>
                      <i className="fas fa-user-shield" /> Privacy &amp; Security
                    </h3>
                    <div className="form-group status-toggle-switch">
                      <input
                        type="checkbox"
                        id="profile-visibility"
                        checked={profileVisibility}
                        onChange={(e) =>
                          setProfileVisibility(e.target.checked)
                        }
                      />
                      <label htmlFor="profile-visibility">
                        Public Profile Visibility
                      </label>
                    </div>
                    <div className="form-group status-toggle-switch">
                      <input
                        type="checkbox"
                        id="order-visibility"
                        checked={orderVisibility}
                        onChange={(e) => setOrderVisibility(e.target.checked)}
                      />
                      <label htmlFor="order-visibility">
                        Order History Visible to Public
                      </label>
                    </div>
                    <div className="security-action-group">
                      <div className="form-group">
                        <label>Two-Factor Authentication (2FA)</label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => switchPanel("security-panel")}
                        >
                          <i className="fas fa-lock" /> Manage 2FA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="save-action-bar">
                  <button
                    type="submit"
                    className="btn btn-primary btn-large"
                    disabled={saving}
                  >
                    <i className="fas fa-save" />{" "}
                    {saving ? "Saving…" : "Save Profile Changes"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => loadProfile()}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>

            {/* SECURITY */}
            <section
              id="security-panel"
              className={`content-panel ${
                panel === "security-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-shield-alt" /> Security &amp; Login
              </h2>
              <p className="panel-description">
                Protect your account with strong passwords and two-factor
                authentication.
              </p>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-key" /> Password
                </h3>
                <p>Update your login password regularly.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="reset-password-btn"
                  onClick={() => setPwdOpen(true)}
                >
                  Change Password
                </button>
              </div>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-qrcode" /> Two-Factor Authentication
                  (2FA)
                </h3>
                <p className={twoFactorEnabled ? "status-good" : ""}>
                  <i
                    className={`fas ${
                      twoFactorEnabled ? "fa-check-circle" : "fa-info-circle"
                    }`}
                  />{" "}
                  Status: {twoFactorEnabled ? "Enabled" : "Not enabled yet"}
                </p>
                <p className="form-help-text">
                  2FA setup at login is queued (same as freelancer settings).
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggle2FA(!twoFactorEnabled)}
                >
                  {twoFactorEnabled ? "Disable 2FA flag" : "Enable 2FA flag"}
                </button>
                <p className="form-help-text">
                  Login OTP challenge is still wired later in the header login flow.
                </p>
              </div>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-history" /> Login History
                </h3>
                <p className="form-help-text">
                  Activity log endpoint is not live yet.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadLoginActivity}
                  disabled={activityLoading}
                >
                  {activityLoading ? "Loading…" : "View Activity Log"}
                </button>
                {loginActivity.length > 0 && (
                  <div className="activity-list" style={{ width: "100%", marginTop: 12 }}>
                    {loginActivity.map((row) => (
                      <div
                        key={row._id || row.createdAt}
                        className="template-item"
                        style={{ marginBottom: 8 }}
                      >
                        <div className="template-info">
                          <strong>
                            {(row.device || "device").toUpperCase()} ·{" "}
                            {row.success === false ? "Failed" : "OK"}
                          </strong>
                          <span>
                            {row.ip || "—"} ·{" "}
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* BILLING */}
            <section
              id="billing-panel"
              className={`content-panel ${
                panel === "billing-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-credit-card" /> Billing &amp; Payments
              </h2>
              <p className="panel-description">
                Manage payment methods and view transaction history.
              </p>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-wallet" /> Payment Methods
                </h3>
                <p className="form-help-text">
                  We only store brand + last 4 digits until a card processor
                  (Stripe / Paystack) is connected. Never enter full card numbers.
                </p>
                <div className="form-group" style={{ width: "100%" }}>
                  <label>Brand</label>
                  <select value={pmBrand} onChange={(e) => setPmBrand(e.target.value)}>
                    <option>Visa</option>
                    <option>Mastercard</option>
                    <option>Amex</option>
                    <option>PayPal</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ width: "100%" }}>
                  <label>Last 4 digits</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={pmLast4}
                    onChange={(e) => setPmLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4242"
                  />
                </div>
                <div className="form-group" style={{ width: "100%" }}>
                  <label>Label (optional)</label>
                  <input
                    type="text"
                    value={pmLabel}
                    onChange={(e) => setPmLabel(e.target.value)}
                    placeholder="Work card"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addPaymentMethod}
                >
                  <i className="fas fa-plus" /> Add method
                </button>
                <div className="template-list" style={{ width: "100%", marginTop: 16 }}>
                  {paymentMethods.length === 0 ? (
                    <p className="form-help-text">No saved methods yet.</p>
                  ) : (
                    paymentMethods.map((m) => (
                      <div key={m._id} className="template-item">
                        <div className="template-info">
                          <strong>
                            {m.brand} ···· {m.last4}
                            {m.isDefault ? " (default)" : ""}
                          </strong>
                          <span>{m.label || "Saved method"}</span>
                        </div>
                        <div className="template-actions">
                          <button
                            type="button"
                            className="btn-icon danger"
                            title="Remove"
                            onClick={() => m._id && removePaymentMethod(m._id)}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-file-invoice-dollar" /> Invoices &amp;
                  History
                </h3>
                <p className="form-help-text">
                  Order invoices are available from each completed order page.
                </p>
                <Link href="/orders" className="btn btn-secondary">
                  View orders
                </Link>
              </div>
            </section>

            {/* NOTIFICATIONS */}
            <section
              id="notifications-panel"
              className={`content-panel ${
                panel === "notifications-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-bell" /> Notification Preferences
              </h2>
              <p className="panel-description">
                Control how we notify you about messages, order status, and
                promotions.
              </p>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-clipboard-list" /> Order Status Alerts
                </h3>
                <div className="status-toggle-switch">
                  <input
                    type="checkbox"
                    id="email-orders"
                    checked={emailOrders}
                    onChange={(e) => setEmailOrders(e.target.checked)}
                  />
                  <label htmlFor="email-orders">
                    Email me when an order milestone is completed.
                  </label>
                </div>
                <div className="status-toggle-switch">
                  <input
                    type="checkbox"
                    id="app-orders"
                    checked={appOrders}
                    onChange={(e) => setAppOrders(e.target.checked)}
                  />
                  <label htmlFor="app-orders">
                    In-app alert for new project proposals.
                  </label>
                </div>
              </div>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-bullhorn" /> Marketing &amp; Promotions
                </h3>
                <div className="status-toggle-switch">
                  <input
                    type="checkbox"
                    id="marketing-promo"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  <label htmlFor="marketing-promo">
                    Receive occasional emails about new features and promotions.
                  </label>
                </div>
              </div>

              <div className="save-action-bar">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={saveNotifications}
                >
                  {saving ? "Saving…" : "Save notification prefs"}
                </button>
              </div>
            </section>

            {/* TEMPLATES */}
            <section
              id="templates-panel"
              className={`content-panel ${
                panel === "templates-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-layer-group" /> Project Templates
              </h2>
              <p className="section-intro">
                Save recurring job briefs to post projects faster. Synced to
                your account.
              </p>

              <div className="sidebar-card">
                <h3>
                  <i className="fas fa-plus-circle" /> Create New Template
                </h3>
                <div className="profile-edit-main">
                  <div className="form-group">
                    <label htmlFor="template-name">
                      Template Title (Internal Name)
                    </label>
                    <input
                      type="text"
                      id="template-name"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="e.g., SEO Monthly Blog"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-job-title">Default Job Title</label>
                    <input
                      type="text"
                      id="template-job-title"
                      value={tplJobTitle}
                      onChange={(e) => setTplJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-category">Project Category</label>
                    <select
                      id="template-category"
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value)}
                    >
                      <option value="">Select Category</option>
                      <option value="writing">Writing &amp; Translation</option>
                      <option value="dev">Web Development</option>
                      <option value="design">Graphics &amp; Design</option>
                      <option value="marketing">Digital Marketing</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-desc">Template Description</label>
                    <textarea
                      id="template-desc"
                      rows={4}
                      value={tplDesc}
                      onChange={(e) => setTplDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-deliverables">
                      Key Deliverables
                    </label>
                    <textarea
                      id="template-deliverables"
                      rows={3}
                      value={tplDeliverables}
                      onChange={(e) => setTplDeliverables(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="template-skills">
                      Required Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      id="template-skills"
                      value={tplSkills}
                      onChange={(e) => setTplSkills(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "fit-content" }}
                    onClick={saveTemplate}
                  >
                    Save Template
                  </button>
                </div>
              </div>

              <div className="section-divider" />

              <div className="sidebar-card">
                <h3>
                  <i className="fas fa-list-ul" /> Your Saved Templates
                </h3>
                <div className="template-list">
                  {templates.length === 0 ? (
                    <p className="form-help-text">No templates yet.</p>
                  ) : (
                    templates.map((t) => (
                      <div key={t.id} className="template-item">
                        <div className="template-info">
                          <strong>{t.internalName}</strong>
                          <span>{t.jobTitle}</span>
                        </div>
                        <div className="template-actions">
                          <button
                            type="button"
                            className="btn-icon danger"
                            title="Delete"
                            onClick={() => deleteTemplate(t.id)}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* PRIVACY */}
            <section
              id="privacy-panel"
              className={`content-panel ${
                panel === "privacy-panel" ? "active" : "hidden"
              }`}
            >
              <h2>
                <i className="fas fa-lock" /> Privacy &amp; Data
              </h2>
              <p className="panel-description">
                Manage who can see your information and how your data is used.
              </p>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-eye" /> Profile Visibility
                </h3>
                <div className="status-toggle-switch">
                  <input
                    type="checkbox"
                    id="public-profile-toggle"
                    checked={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.checked)}
                  />
                  <label htmlFor="public-profile-toggle">
                    Allow public search engines to index my profile.
                  </label>
                </div>
                <p className="form-help-text">
                  Disabling this will not hide your profile from logged-in
                  freelancers.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={savePrivacy}
                >
                  {saving ? "Saving…" : "Save privacy settings"}
                </button>
              </div>

              <div className="setting-block">
                <h3>
                  <i className="fas fa-times-circle" /> Account Deactivation
                </h3>
                <p className="form-help-text">
                  Permanently close your account. Certain data may be retained
                  for legal purposes.
                </p>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deactivateAccount}
                >
                  <i className="fas fa-trash-alt" /> Deactivate Account
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Password modal */}
      {pwdOpen && (
        <div
          id="password-reset-modal"
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPwdOpen(false);
          }}
        >
          <div className="modal-content">
            <button
              type="button"
              className="close-btn"
              onClick={() => setPwdOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h3>Change Your Password</h3>
            <form onSubmit={submitPassword}>
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </main>
  );
}
