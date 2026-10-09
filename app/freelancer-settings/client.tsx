// app/freelancer-settings/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-settings.css";

type PanelId =
  | "profile-panel"
  | "payout-panel"
  | "security-panel"
  | "notifications-panel"
  | "legal-panel";

type ProfileData = {
  fullName?: string;
  displayName?: string;
  professionalTitle?: string;
  tagline?: string;
  bio?: string;
  skills?: string[] | string;
  avatar?: string;
  profilePicture?: string;
  coverImage?: string;
  onlineStatus?: string;
  location?: { country?: string; city?: string } | string;
  languages?: string[] | string;
  availability?: string;
  education?: string;
  legalBusinessName?: string;
  taxId?: string;
  payout?: {
    method?: "bank" | "payoneer";
    accountName?: string;
    bankName?: string;
    bankCountry?: string;
    routingNumber?: string;
    accountNumber?: string;
    payoneerEmail?: string;
    schedule?: "automatic" | "manual";
  };
  notifications?: {
    emailMessages?: boolean;
    orderRequests?: boolean;
    promotional?: boolean;
  };
};

function showToast(
  message: string,
  type: "success" | "removed" | "info" = "success"
) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  let icon = "fa-check-circle";
  if (type === "removed") icon = "fa-exclamation-triangle";
  if (type === "info") icon = "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function skillsToString(skills?: string[] | string) {
  if (Array.isArray(skills)) return skills.join(", ");
  return skills || "";
}

function languagesToString(langs?: string[] | string) {
  if (Array.isArray(langs)) return langs.join(", ");
  return langs || "";
}

function locationToString(loc?: ProfileData["location"]) {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  return [loc.city, loc.country].filter(Boolean).join(", ") || loc.country || "";
}

export default function FreelancerSettingsClient() {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<PanelId>("profile-panel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [country, setCountry] = useState("");
  const [languages, setLanguages] = useState("");
  const [availability, setAvailability] = useState("Full-Time");
  const [education, setEducation] = useState("");
  const [onlineAvailable, setOnlineAvailable] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("/default-avatar.png");
  const [coverUrl, setCoverUrl] = useState("");

  // Payout
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "payoneer">("bank");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankCountry, setBankCountry] = useState("US");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [payoneerEmail, setPayoneerEmail] = useState("");
  const [payoutSchedule, setPayoutSchedule] = useState<"automatic" | "manual">(
    "automatic"
  );

  // Notifications
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifOrders, setNotifOrders] = useState(false);
  const [notifPromo, setNotifPromo] = useState(false);

  // Legal
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");

  // Portfolio & skill media
  type PortfolioItem = { title: string; image: string; url: string };
  type SkillMediaItem = {
    title: string;
    url: string;
    type: "video" | "audio" | "image" | "link";
  };
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [skillMedia, setSkillMedia] = useState<SkillMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");

  // Password (local form only until endpoint exists)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const getAuthHeaders = (json = false): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (json) headers["Content-Type"] = "application/json";
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const switchPanel = useCallback((id: PanelId) => {
    setActivePanel(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
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
        // Fallback: try /api/users/me
        const res2 = await fetch("/api/users/me", {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const data2 = await res2.json().catch(() => ({}));
        if (!res2.ok) {
          showToast(data.message || "Could not load profile", "removed");
          return;
        }
        applyProfile((data2.user || data2.profile || data2) as ProfileData);
        return;
      }
      applyProfile((data.user || data.profile || data) as ProfileData);
    } catch {
      showToast("Network error loading profile", "removed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function applyProfile(p: any) {
    setFullName(p.fullName || p.displayName || "");
    setTagline(p.professionalTitle || p.tagline || "");
    setBio(p.bio || "");
    setSkills(skillsToString(p.skills));
    setCountry(locationToString(p.location));
    setLanguages(languagesToString(p.languages));
    setAvailability(p.availability || "Full-Time");
    // education may be array of { school, degree, year }
    if (Array.isArray(p.education) && p.education.length) {
      const e0 = p.education[0];
      setEducation(
        [e0.degree, e0.school, e0.year].filter(Boolean).join(" — ") ||
          e0.school ||
          ""
      );
    } else {
      setEducation(typeof p.education === "string" ? p.education : "");
    }
    const os = (p.onlineStatus || "").toLowerCase();
    setOnlineAvailable(os === "online" || os === "");
    setAvatarUrl(p.avatar || p.profilePicture || "/default-avatar.png");
    setCoverUrl(p.coverImage || "");

    const pay = p.payoutDetails || p.payout || {};
    const method = String(pay.method || "").toLowerCase();
    setPayoutMethod(method === "payoneer" ? "payoneer" : "bank");
    setAccountName(pay.accountName || "");
    setBankName(pay.bankName || "");
    setBankCountry(pay.bankCountry || "US");
    setRoutingNumber(pay.routingNumber || "");
    setAccountNumber(pay.accountNumber || "");
    setPayoneerEmail(pay.accountEmail || pay.payoneerEmail || "");
    setPayoutSchedule(pay.schedule === "automatic" ? "automatic" : "manual");

    const n = p.settings || p.notifications || {};
    setNotifMessages(
      n.emailNotifications !== false && n.emailMessages !== false
    );
    setNotifOrders(!!(n.smsNotifications || n.orderRequests));
    setNotifPromo(!!(n.marketingEmails || n.promotional));

    setLegalName(p.legalBusinessName || "");
    setTaxId(p.taxId || "");
    setPortfolio(
      Array.isArray(p.portfolio)
        ? p.portfolio.map((x: any) => ({
            title: x.title || "",
            image: x.image || "",
            url: x.url || "",
          }))
        : []
    );
    setSkillMedia(
      Array.isArray(p.skillMedia)
        ? p.skillMedia.map((x: any) => ({
            title: x.title || "",
            url: x.url || "",
            type: (x.type || "link") as SkillMediaItem["type"],
          }))
        : []
    );
    setTwoFactorEnabled(Boolean(p.twoFactorEnabled));
  }

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as PanelId;
    const valid: PanelId[] = [
      "profile-panel",
      "payout-panel",
      "security-panel",
      "notifications-panel",
      "legal-panel",
    ];
    if (hash && valid.includes(hash)) {
      setActivePanel(hash);
    }
  }, []);

  const uploadMediaFile = async (
    file: File,
    kind: "avatar" | "cover" | "portfolio" | "media"
  ): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch("/api/users/upload", {
      method: "POST",
      credentials: "include",
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.message || "Upload failed", "removed");
      return null;
    }
    return data.url || null;
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Local preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const url = await uploadMediaFile(file, "avatar");
      if (url) {
        setAvatarUrl(url);
        // Persist immediately
        await fetch("/api/users/profile", {
          method: "PUT",
          credentials: "include",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ avatar: url }),
        });
        showToast("Avatar uploaded", "success");
      }
    } finally {
      setUploading(false);
    }
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const url = await uploadMediaFile(file, "cover");
      if (url) {
        setCoverUrl(url);
        await fetch("/api/users/profile", {
          method: "PUT",
          credentials: "include",
          headers: getAuthHeaders(true),
          body: JSON.stringify({ coverImage: url }),
        });
        showToast("Cover photo uploaded", "success");
      }
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const body = {
        fullName: fullName.trim(),
        professionalTitle: tagline.trim(),
        bio: bio.trim(),
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        location: { country: country.trim() },
        languages: languages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        availability,
        education: education.trim(),
        onlineStatus: onlineAvailable ? "online" : "offline",
        avatar: avatarUrl.startsWith("data:") ? undefined : avatarUrl,
        coverImage: coverUrl.startsWith("data:") ? undefined : coverUrl,
        portfolio,
        skillMedia,
      };
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to save profile", "removed");
        return;
      }
      showToast("Profile saved", "success");
      if (typeof window !== "undefined") {
        localStorage.setItem("isProfileComplete", "true");
      }
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSaving(false);
    }
  };

  const savePayout = async () => {
    setSaving(true);
    try {
      const payoutDetails = {
        method: payoutMethod === "payoneer" ? "Payoneer" : "Bank",
        schedule: payoutSchedule,
        ...(payoutMethod === "bank"
          ? {
              accountName: accountName.trim(),
              bankName: bankName.trim(),
              bankCountry,
              routingNumber: routingNumber.trim(),
              accountNumber: accountNumber.trim(),
            }
          : {
              accountEmail: payoneerEmail.trim(),
            }),
      };
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ payoutDetails }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to save payout settings", "removed");
        return;
      }
      showToast("Payout settings saved", "success");
    } catch {
      showToast("Network error", "removed");
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          settings: {
            emailNotifications: notifMessages,
            smsNotifications: notifOrders,
            marketingEmails: notifPromo,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to save notifications", "removed");
        return;
      }
      showToast("Notification preferences saved", "success");
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSaving(false);
    }
  };

  const saveLegal = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          legalBusinessName: legalName.trim(),
          taxId: taxId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Failed to save legal details", "removed");
        return;
      }
      showToast("Legal details saved", "success");
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Fill in current and new password", "removed");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "removed");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters", "removed");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Password update failed", "removed");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated", "success");
    } catch {
      showToast("Network error", "removed");
    } finally {
      setSaving(false);
    }
  };

  const signOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("isProfileComplete");
      localStorage.removeItem("emailVerified");
    }
    router.replace("/?auth=login");
  };

  if (loading) {
    return (
      <main className="dashboard-layout">
        <p style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          Loading settings…
        </p>
      </main>
    );
  }

  return (
    <>
      <main className="dashboard-layout">
        <div className="main-content-padding">
          <div className="settings-master-layout">
            {/* Sidebar */}
            <nav className="settings-nav-sidebar">
              <h3>Account Management</h3>
              <ul>
                <li className={activePanel === "profile-panel" ? "active" : ""}>
                  <a
                    href="#profile-panel"
                    data-target="profile-panel"
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel("profile-panel");
                    }}
                  >
                    <i className="fas fa-user-circle" /> Profile & Public Info
                  </a>
                </li>
                <li className={activePanel === "payout-panel" ? "active" : ""}>
                  <a
                    href="#payout-panel"
                    data-target="payout-panel"
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel("payout-panel");
                    }}
                  >
                    <i className="fas fa-wallet" /> Payout Settings
                  </a>
                </li>
                <li className={activePanel === "security-panel" ? "active" : ""}>
                  <a
                    href="#security-panel"
                    data-target="security-panel"
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel("security-panel");
                    }}
                  >
                    <i className="fas fa-shield-alt" /> Security & Password
                  </a>
                </li>
                <li
                  className={
                    activePanel === "notifications-panel" ? "active" : ""
                  }
                >
                  <a
                    href="#notifications-panel"
                    data-target="notifications-panel"
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel("notifications-panel");
                    }}
                  >
                    <i className="fas fa-bell" /> Notifications
                  </a>
                </li>
                <li className={activePanel === "legal-panel" ? "active" : ""}>
                  <a
                    href="#legal-panel"
                    data-target="legal-panel"
                    onClick={(e) => {
                      e.preventDefault();
                      switchPanel("legal-panel");
                    }}
                  >
                    <i className="fas fa-file-contract" /> Legal & Tax Info
                  </a>
                </li>
              </ul>

              <button
                type="button"
                className="btn-secondary sign-out-btn"
                onClick={signOut}
              >
                <i className="fas fa-sign-out-alt" /> Sign Out
              </button>
            </nav>

            <div className="settings-content-area">
              {/* ========== PROFILE ========== */}
              <section
                id="profile-panel"
                className={`settings-page-container content-panel${
                  activePanel === "profile-panel" ? " active" : " hidden"
                }`}
              >
                <h1>Profile & Public Info</h1>
                <p className="section-subheading">
                  Manage your bio, skills, portfolio, and profile status.
                </p>

                <div className="content-card profile-branding-card">
                  <div className="branding-editor-container">
                    <div
                      className="cover-editor"
                      id="cover-preview"
                      style={{
                        backgroundImage: coverUrl
                          ? `url('${coverUrl}')`
                          : undefined,
                      }}
                    >
                      <label htmlFor="cover-upload" className="cover-edit-btn">
                        <i className="fas fa-camera" /> Edit Cover Photo
                        <input
                          type="file"
                          id="cover-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={onCoverChange}
                        />
                      </label>
                    </div>

                    <div className="avatar-editor-wrapper">
                      <div className="avatar-preview-container">
                        <Image
                          src={avatarUrl || "/default-avatar.png"}
                          id="avatar-preview"
                          alt="Profile"
                          width={120}
                          height={120}
                          unoptimized
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="avatar-edit-badge"
                        >
                          <i className="fas fa-pen" />
                          <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={onAvatarChange}
                          />
                        </label>
                      </div>
                      <div className="branding-text-hint">
                        <h3>Profile Media</h3>
                        <p>Update your branding images for the marketplace</p>
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  className="settings-form profile-edit-layout"
                  onSubmit={saveProfile}
                >
                  <div className="profile-edit-main">
                    <div className="content-card">
                      <h2>
                        <i className="fas fa-id-card" /> Basic Profile Information
                      </h2>
                      <div className="form-group">
                        <label htmlFor="full-name">Full Name</label>
                        <input
                          type="text"
                          id="full-name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="tagline">Professional Tagline</label>
                        <input
                          type="text"
                          id="tagline"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                        />
                      </div>
                      <div className="form-group status-toggle-switch">
                        <input
                          type="checkbox"
                          id="online-status-toggle"
                          checked={onlineAvailable}
                          onChange={(e) => setOnlineAvailable(e.target.checked)}
                        />
                        <label htmlFor="online-status-toggle">
                          Online Status:{" "}
                          {onlineAvailable ? "Available" : "Offline"}
                        </label>
                      </div>
                    </div>

                    <div className="content-card">
                      <h2>
                        <i className="fas fa-file-alt" /> Professional Summary
                      </h2>
                      <div className="form-group">
                        <textarea
                          id="bio"
                          rows={8}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="content-card">
                      <h2>
                        <i className="fas fa-code" /> Skills & Expertise
                      </h2>
                      <div className="form-group">
                        <input
                          type="text"
                          value={skills}
                          onChange={(e) => setSkills(e.target.value)}
                          placeholder="Python, Django, React, PostgreSQL"
                        />
                      </div>
                    </div>

                    <div className="content-card">
                      <h2>
                        <i className="fas fa-project-diagram" /> Portfolio
                        Management
                      </h2>
                      <p style={{ marginBottom: 12, color: "#666" }}>
                        Showcase work on your public profile. Save profile to
                        persist.
                      </p>
                      {portfolio.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div className="form-group">
                            <label>Title</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPortfolio((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, title: v } : p
                                  )
                                );
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label>Image URL</label>
                            <input
                              type="text"
                              value={item.image}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPortfolio((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, image: v } : p
                                  )
                                );
                              }}
                              placeholder="https://…"
                            />
                          </div>
                          <div className="form-group">
                            <label>Project URL</label>
                            <input
                              type="text"
                              value={item.url}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPortfolio((prev) =>
                                  prev.map((p, i) =>
                                    i === idx ? { ...p, url: v } : p
                                  )
                                );
                              }}
                              placeholder="https://…"
                            />
                          </div>
                          <label
                            className="btn btn-secondary"
                            style={{ marginRight: 8, cursor: "pointer" }}
                          >
                            {uploading ? "Uploading…" : "Upload image"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                try {
                                  const url = await uploadMediaFile(
                                    file,
                                    "portfolio"
                                  );
                                  if (url) {
                                    setPortfolio((prev) =>
                                      prev.map((p, i) =>
                                        i === idx ? { ...p, image: url } : p
                                      )
                                    );
                                    showToast("Image uploaded", "success");
                                  }
                                } finally {
                                  setUploading(false);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              setPortfolio((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary full-width-btn add-item-btn"
                        onClick={() =>
                          setPortfolio((prev) => [
                            ...prev,
                            { title: "", image: "", url: "" },
                          ])
                        }
                      >
                        <i className="fas fa-plus" /> Add New Portfolio Item
                      </button>
                    </div>

                    <div className="content-card media-center-section">
                      <h2>
                        <i className="fas fa-video" /> Skill Media Center
                      </h2>
                      <p style={{ marginBottom: 12, color: "#666" }}>
                        Video demos, audio samples, or links. Save profile to
                        persist.
                      </p>
                      {skillMedia.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 10,
                          }}
                        >
                          <div className="form-group">
                            <label>Title</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSkillMedia((prev) =>
                                  prev.map((m, i) =>
                                    i === idx ? { ...m, title: v } : m
                                  )
                                );
                              }}
                            />
                          </div>
                          <div className="form-group">
                            <label>Type</label>
                            <select
                              value={item.type}
                              onChange={(e) => {
                                const v = e.target
                                  .value as SkillMediaItem["type"];
                                setSkillMedia((prev) =>
                                  prev.map((m, i) =>
                                    i === idx ? { ...m, type: v } : m
                                  )
                                );
                              }}
                            >
                              <option value="video">Video</option>
                              <option value="audio">Audio</option>
                              <option value="image">Image</option>
                              <option value="link">Link</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>URL</label>
                            <input
                              type="text"
                              value={item.url}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSkillMedia((prev) =>
                                  prev.map((m, i) =>
                                    i === idx ? { ...m, url: v } : m
                                  )
                                );
                              }}
                              placeholder="https://…"
                            />
                          </div>
                          <label
                            className="btn btn-secondary"
                            style={{ marginRight: 8, cursor: "pointer" }}
                          >
                            {uploading ? "Uploading…" : "Upload file"}
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploading(true);
                                try {
                                  const url = await uploadMediaFile(
                                    file,
                                    "media"
                                  );
                                  if (url) {
                                    const isVid = file.type.startsWith(
                                      "video/"
                                    );
                                    setSkillMedia((prev) =>
                                      prev.map((m, i) =>
                                        i === idx
                                          ? {
                                              ...m,
                                              url,
                                              type: isVid ? "video" : "image",
                                            }
                                          : m
                                      )
                                    );
                                    showToast("Media uploaded", "success");
                                  }
                                } finally {
                                  setUploading(false);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              setSkillMedia((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary full-width-btn add-item-btn"
                        onClick={() =>
                          setSkillMedia((prev) => [
                            ...prev,
                            { title: "", url: "", type: "video" },
                          ])
                        }
                      >
                        <i className="fas fa-plus" /> Add New Media Item
                      </button>
                    </div>
                  </div>

                  <aside className="profile-edit-sidebar">
                    <div className="sidebar-card basic-info-card">
                      <h3>
                        <i className="fas fa-globe" /> Location & Languages
                      </h3>
                      <div className="form-group">
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Country"
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          value={languages}
                          onChange={(e) => setLanguages(e.target.value)}
                          placeholder="English, French"
                        />
                      </div>
                    </div>
                    <div className="sidebar-card stats-card">
                      <h3>
                        <i className="fas fa-clock" /> Availability
                      </h3>
                      <div className="form-group">
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value)}
                        >
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="As Needed">As Needed</option>
                          <option value="Not Available">Not Available</option>
                        </select>
                      </div>
                    </div>
                    <div className="sidebar-card education-card">
                      <h3>
                        <i className="fas fa-graduation-cap" /> Education
                      </h3>
                      <div className="form-group">
                        <input
                          type="text"
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                          placeholder="M.Sc. Computer Science"
                        />
                      </div>
                    </div>
                  </aside>

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

              {/* ========== PAYOUT ========== */}
              <section
                id="payout-panel"
                className={`settings-page-container content-panel${
                  activePanel === "payout-panel" ? " active" : " hidden"
                }`}
              >
                <h1>Payout Settings</h1>
                <p className="section-subheading">
                  Manage your withdrawal methods and schedule.
                </p>

                <div className="settings-layout">
                  <div className="form-container-card payout-method-card">
                    <div className="card-header-line">
                      <h2>1. Select Payout Method</h2>
                    </div>
                    <p className="info-text">
                      Choose how you want to receive your earnings.
                    </p>

                    <div className="payout-options-grid">
                      <label
                        className={`payout-option-card${
                          payoutMethod === "bank" ? " active" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="payout_method"
                          value="bank"
                          checked={payoutMethod === "bank"}
                          onChange={() => setPayoutMethod("bank")}
                        />
                        <i className="fas fa-university" />
                        <h4>Bank Transfer (ACH/Wire)</h4>
                        <p>
                          Standard method to transfer funds directly to your bank
                          account.
                        </p>
                      </label>

                      <label
                        className={`payout-option-card${
                          payoutMethod === "payoneer" ? " active" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="payout_method"
                          value="payoneer"
                          checked={payoutMethod === "payoneer"}
                          onChange={() => setPayoutMethod("payoneer")}
                        />
                        <i className="fas fa-credit-card" />
                        <h4>Payoneer</h4>
                        <p>
                          Receive payouts to your Payoneer account or Payoneer
                          debit card.
                        </p>
                      </label>
                    </div>
                  </div>

                  {payoutMethod === "bank" && (
                    <div
                      className="form-container-card payout-details-form"
                      id="bank-details-form"
                    >
                      <div className="card-header-line">
                        <h2>2. Bank Account Details</h2>
                      </div>

                      <div className="form-group">
                        <label htmlFor="account-name">Account Holder Name</label>
                        <input
                          type="text"
                          id="account-name"
                          placeholder="Name on bank account"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                        />
                      </div>

                      <div className="form-group-row">
                        <div className="form-group">
                          <label htmlFor="bank-name">Bank Name</label>
                          <input
                            type="text"
                            id="bank-name"
                            placeholder="e.g., Chase, Barclays"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="country">Bank Country</label>
                          <select
                            id="country"
                            value={bankCountry}
                            onChange={(e) => setBankCountry(e.target.value)}
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="GB">United Kingdom</option>
                            <option value="GH">Ghana</option>
                            <option value="NG">Nigeria</option>
                            <option value="KE">Kenya</option>
                            <option value="ZA">South Africa</option>
                            <option value="IN">India</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group-row">
                        <div className="form-group">
                          <label htmlFor="routing-number">
                            Routing Number / Sort Code
                          </label>
                          <input
                            type="text"
                            id="routing-number"
                            placeholder="9-digit number"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="account-number">Account Number</label>
                          <input
                            type="text"
                            id="account-number"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {payoutMethod === "payoneer" && (
                    <div
                      className="form-container-card payout-details-form"
                      id="payoneer-details-form"
                    >
                      <div className="card-header-line">
                        <h2>2. Payoneer Account Details</h2>
                      </div>

                      <div className="form-group">
                        <label htmlFor="payoneer-email">
                          Payoneer Email Address
                        </label>
                        <input
                          type="email"
                          id="payoneer-email"
                          placeholder="Your verified Payoneer email"
                          value={payoneerEmail}
                          onChange={(e) => setPayoneerEmail(e.target.value)}
                        />
                        <p className="note-text">
                          Use the email registered on your Payoneer account. We
                          will send payouts to this Payoneer identity.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="form-container-card payout-schedule-card">
                    <div className="card-header-line">
                      <h2>3. Withdrawal Schedule</h2>
                    </div>

                    <div className="form-group">
                      <label>
                        How often would you like to receive payouts?
                      </label>

                      <div className="schedule-options">
                        <label>
                          <input
                            type="radio"
                            name="schedule"
                            value="automatic"
                            checked={payoutSchedule === "automatic"}
                            onChange={() => setPayoutSchedule("automatic")}
                          />
                          <strong>Automatic Payouts:</strong> Every 1st and 15th
                          of the month.
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="schedule"
                            value="manual"
                            checked={payoutSchedule === "manual"}
                            onChange={() => setPayoutSchedule("manual")}
                          />
                          <strong>Manual Withdrawal:</strong> I will request
                          payouts when ready (minimum $20).
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary full-width-btn save-payout-btn"
                    onClick={savePayout}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Payout Settings"}
                  </button>
                </div>
              </section>

              {/* ========== SECURITY ========== */}
              <section
                id="security-panel"
                className={`settings-page-container content-panel${
                  activePanel === "security-panel" ? " active" : " hidden"
                }`}
              >
                <h1>Security & Login</h1>
                <p className="section-subheading">
                  Manage your password, two-factor authentication, and account
                  activity.
                </p>

                <div className="content-card">
                  <div className="setting-block">
                    <h3>Change Password</h3>
                    <p>We recommend updating your password every 6 months.</p>
                    <div className="form-group">
                      <label htmlFor="current-password">Current password</label>
                      <input
                        type="password"
                        id="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="new-password">New password</label>
                      <input
                        type="password"
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="confirm-password">Confirm new password</label>
                      <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={changePassword}
                      disabled={saving}
                    >
                      Update Password
                    </button>
                  </div>
                  <div className="setting-block">
                    <h3>Two-Factor Authentication (2FA)</h3>
                    <p>
                      Status:{" "}
                      <strong>
                        {twoFactorEnabled ? "Enabled" : "Disabled"}
                      </strong>
                      . When enabled, a second step is required at login
                      (email/app challenge).
                    </p>
                    <div className="form-group">
                      <label htmlFor="twofa-password">
                        Confirm password to{" "}
                        {twoFactorEnabled ? "disable" : "enable"} 2FA
                      </label>
                      <input
                        type="password"
                        id="twofa-password"
                        value={twoFactorPassword}
                        onChange={(e) => setTwoFactorPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={async () => {
                        if (!twoFactorPassword) {
                          showToast("Enter your password to continue", "removed");
                          return;
                        }
                        setSaving(true);
                        try {
                          // Verify password via change-password no-op is not ideal;
                          // we toggle flag; login challenge enforces 2FA later.
                          const next = !twoFactorEnabled;
                          const res = await fetch("/api/users/profile", {
                            method: "PUT",
                            credentials: "include",
                            headers: getAuthHeaders(true),
                            body: JSON.stringify({
                              twoFactorEnabled: next,
                              // password echo for future server-side verify
                              confirmPassword: twoFactorPassword,
                            }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            showToast(
                              data.message || "Could not update 2FA",
                              "removed"
                            );
                            return;
                          }
                          setTwoFactorEnabled(next);
                          setTwoFactorPassword("");
                          showToast(
                            next
                              ? "2FA enabled on your account"
                              : "2FA disabled",
                            "success"
                          );
                        } catch {
                          showToast("Network error", "removed");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                  </div>
                </div>
              </section>

              {/* ========== NOTIFICATIONS ========== */}
              <section
                id="notifications-panel"
                className={`settings-page-container content-panel${
                  activePanel === "notifications-panel" ? " active" : " hidden"
                }`}
              >
                <h1>Notifications</h1>
                <p className="section-subheading">
                  Control how you receive alerts about messages, orders, and
                  platform updates.
                </p>

                <div className="content-card">
                  <div className="form-group status-toggle-switch">
                    <input
                      type="checkbox"
                      id="notif-messages"
                      checked={notifMessages}
                      onChange={(e) => setNotifMessages(e.target.checked)}
                    />
                    <label htmlFor="notif-messages">
                      Email me for new message alerts.
                    </label>
                  </div>
                  <div className="form-group status-toggle-switch">
                    <input
                      type="checkbox"
                      id="notif-orders"
                      checked={notifOrders}
                      onChange={(e) => setNotifOrders(e.target.checked)}
                    />
                    <label htmlFor="notif-orders">
                      Send platform notifications for new order requests.
                    </label>
                  </div>
                  <div className="form-group status-toggle-switch">
                    <input
                      type="checkbox"
                      id="notif-promo"
                      checked={notifPromo}
                      onChange={(e) => setNotifPromo(e.target.checked)}
                    />
                    <label htmlFor="notif-promo">
                      Receive promotional emails.
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={saveNotifications}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save notification preferences"}
                  </button>
                </div>
              </section>

              {/* ========== LEGAL ========== */}
              <section
                id="legal-panel"
                className={`settings-page-container content-panel${
                  activePanel === "legal-panel" ? " active" : " hidden"
                }`}
              >
                <h1>Legal & Tax Info</h1>
                <p className="section-subheading">
                  Update your legal business name, address, and tax identification
                  details.
                </p>

                <div className="content-card">
                  <div className="form-group">
                    <label htmlFor="legal-name">Legal Business Name</label>
                    <input
                      type="text"
                      id="legal-name"
                      placeholder="As per official documents"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tax-id">Tax ID / SSN</label>
                    <input
                      type="text"
                      id="tax-id"
                      placeholder="******1234"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveLegal}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Legal Details"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <div id="toast-container" />
    </>
  );
}
