// app/affiliate-settings/client.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/affiliate-settings.css";

type SectionId =
  | "profile"
  | "financials"
  | "tracking"
  | "security"
  | "marketing"
  | "profile-strength";

const SECTION_META: Record<
  SectionId,
  { title: string; color: string; label: string; icon: string }
> = {
  profile: {
    title: "profile-settings",
    color: "#ff4757",
    label: "Profile Identity",
    icon: "fa-user-circle",
  },
  financials: {
    title: "growth-financials",
    color: "#2ed573",
    label: "Growth & Financials",
    icon: "fa-chart-line",
  },
  tracking: {
    title: "tracking-compliance",
    color: "#1e90ff",
    label: "Tracking & Compliance",
    icon: "fa-shield-alt",
  },
  security: {
    title: "security-access",
    color: "#ffa502",
    label: "Security & Access",
    icon: "fa-lock",
  },
  marketing: {
    title: "marketing-kit",
    color: "#e056fd",
    label: "Marketing Kit",
    icon: "fa-ad",
  },
  "profile-strength": {
    title: "account-health",
    color: "#70a1ff",
    label: "Profile Strength",
    icon: "fa-user-shield",
  },
};

type SocialAccount = {
  platform: string;
  handle?: string;
  profileUrl?: string;
  verified?: boolean;
  connectedAt?: string;
};

type ConversionRow = {
  id: string;
  name: string;
  email?: string;
  role?: string;
  verified?: boolean;
  joinedAt?: string;
};

type PayoutRow = {
  _id: string;
  amount: number;
  status: string;
  method?: string;
  createdAt?: string;
  processedAt?: string;
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  display: string;
  createdAt?: string;
  lastUsedAt?: string;
};

function showToast(message: string, type: "success" | "removed" | "info" = "success") {
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

export default function AffiliateSettingsClient() {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);

  // Payout / financials
  const [payoutMethod, setPayoutMethod] = useState<"Payoneer" | "Bank" | "None">(
    "Payoneer"
  );
  const [payoneerEmail, setPayoneerEmail] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [threshold, setThreshold] = useState(50);
  const [tierLabel, setTierLabel] = useState("Bronze");
  const [tierProgress, setTierProgress] = useState(10);
  const [earnings, setEarnings] = useState(0);
  const [nextTierGap, setNextTierGap] = useState(0);

  // Overview batch
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [earnLifetime, setEarnLifetime] = useState(0);
  const [earnAvailable, setEarnAvailable] = useState(0);
  const [earnPending, setEarnPending] = useState(0);
  const [earnMonth, setEarnMonth] = useState(0);
  const [minPayout, setMinPayout] = useState(50);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Tracking
  const [taxId, setTaxId] = useState("");
  const [cookieDays, setCookieDays] = useState("90");
  const [postbackUrl, setPostbackUrl] = useState("");
  // referralCode is declared in Overview batch above

  // Security
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [socialOpen, setSocialOpen] = useState(false);

  // API keys
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(false);

  // Marketing UI
  const [audience, setAudience] = useState("Freelancers");
  const [brandColor, setBrandColor] = useState("#d96464");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [assetFilter, setAssetFilter] = useState("banners");

  // Dropdown open states
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  }, []);

  const switchSection = (id: SectionId) => {
    setSection(id);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "") as SectionId;
    if (hash && SECTION_META[hash]) setSection(hash);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        router.replace("/?auth=login");
        return;
      }

      const [profRes, affRes] = await Promise.all([
        fetch("/api/users/profile", {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }),
        fetch("/api/users/affiliate/me", {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }).catch(() => null),
      ]);

      const prof = await profRes.json().catch(() => ({}));
      if (profRes.status === 401) {
        router.replace("/?auth=login");
        return;
      }
      if (profRes.ok) {
        const u = prof.user || prof || {};
        setDisplayName(u.displayName || u.fullName || "");
        setUsername(u.username ? `@${String(u.username).replace(/^@/, "")}` : "");
        setBio(u.bio || "");
        setPublicProfile(u.settings?.publicProfile !== false);
        setTaxId(u.taxId || "");
        setReferralCode(u.referralCode || "");
        setTwoFactorEnabled(Boolean(u.twoFactorEnabled));

        const pay = u.payoutDetails || {};
        const m = String(pay.method || "Payoneer");
        if (m === "Bank" || m === "bank") setPayoutMethod("Bank");
        else if (m === "None" || m === "none") setPayoutMethod("None");
        else setPayoutMethod("Payoneer");
        setPayoneerEmail(pay.accountEmail || pay.payoneerEmail || "");
        setAccountName(pay.accountName || "");
        setBankName(pay.bankName || "");
      }

      if (affRes && affRes.ok) {
        const a = await affRes.json().catch(() => ({}));
        const tier = a.tierInfo || {};
        setTierLabel(tier.currentTier || a.affiliateProfile?.currentTier || "Bronze");
        setEarnings(Number(tier.currentEarnings) || 0);
        const target = Number(tier.tierTargetEarnings) || 1000;
        const cur = Number(tier.currentEarnings) || 0;
        setNextTierGap(Math.max(0, target - cur));
        const pct = target > 0 ? Math.min(100, Math.round((cur / target) * 100)) : 10;
        setTierProgress(pct);
        if (a.referralCode) setReferralCode(a.referralCode);
      }

      // Overview: referral, earnings, conversions
      try {
        const [oRes, payRes] = await Promise.all([
          fetch("/api/affiliate-settings/overview", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch("/api/affiliate-settings/payouts", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ]);
        const oData = await oRes.json().catch(() => ({}));
        const payData = await payRes.json().catch(() => ({}));
        if (oRes.ok && oData.success !== false) {
          if (oData.referralCode) {
            setReferralCode(oData.referralCode);
          }
          if (oData.referralLink) {
            setReferralLink(oData.referralLink);
            // QR via public API (no key)
            setQrDataUrl(
              `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(oData.referralLink)}`
            );
          }
          if (oData.earnings) {
            setEarnLifetime(Number(oData.earnings.lifetime) || 0);
            setEarnAvailable(Number(oData.earnings.available) || 0);
            setEarnPending(Number(oData.earnings.pending) || 0);
            setEarnMonth(Number(oData.earnings.thisMonth) || 0);
            setEarnings(Number(oData.earnings.lifetime) || 0);
          }
          if (oData.minPayout != null) {
            setMinPayout(Number(oData.minPayout) || 50);
            setThreshold(Number(oData.minPayout) || 50);
          }
          if (Array.isArray(oData.conversions)) setConversions(oData.conversions);
          if (oData.tracking) {
            if (oData.tracking.cookieDays)
              setCookieDays(String(oData.tracking.cookieDays));
            if (oData.tracking.postbackUrl != null)
              setPostbackUrl(oData.tracking.postbackUrl);
          }
        }
        if (payRes.ok && Array.isArray(payData.payouts)) {
          setPayouts(payData.payouts);
        }
      } catch {
        /* overview optional */
      }

      try {
        const [sRes, kRes] = await Promise.all([
          fetch("/api/affiliate-settings/social", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
          fetch("/api/affiliate-settings/api-keys", {
            credentials: "include",
            headers: getAuthHeaders(),
            cache: "no-store",
          }),
        ]);
        const sData = await sRes.json().catch(() => ({}));
        const kData = await kRes.json().catch(() => ({}));
        if (sRes.ok && Array.isArray(sData.socialAccounts)) {
          setSocialAccounts(sData.socialAccounts);
        }
        if (kRes.ok && Array.isArray(kData.keys)) {
          setApiKeys(kData.keys);
        }
      } catch {
        /* ignore secondary */
      }
    } catch {
      showToast("Failed to load settings.", "removed");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, router]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const body = {
        displayName: displayName.trim(),
        username: username.replace(/^@/, "").trim(),
        bio: bio.trim(),
        settings: { publicProfile },
        taxId: taxId.trim(),
        payoutDetails: {
          method: payoutMethod,
          accountEmail: payoneerEmail.trim(),
          payoneerEmail: payoneerEmail.trim(),
          accountName: accountName.trim(),
          bankName: bankName.trim(),
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
        showToast(data.message || "Could not save.", "removed");
        return;
      }
      showToast("Settings saved.", "success");
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setSaving(false);
    }
  };

  const toggle2FA = async () => {
    try {
      const res = await fetch("/api/client/2fa", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !twoFactorEnabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "2FA update failed.", "removed");
        return;
      }
      setTwoFactorEnabled(!!data.twoFactorEnabled);
      showToast(
        data.message ||
          (data.twoFactorEnabled
            ? "2FA flag enabled (login challenge later)."
            : "2FA disabled."),
        "success"
      );
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const pixelSnippet = referralCode
    ? `<script src="https://thick-nine.vercel.app/track.js?ref=${encodeURIComponent(referralCode)}"></script>`
    : `<script src="https://thick-nine.vercel.app/track.js?id=YOUR_REF"></script>`;

  const withRef = (text: string) => {
    if (!referralLink) return text;
    if (text.includes(referralLink)) return text;
    return `${text} ${referralLink}`;
  };

  const requestPayout = async () => {
    if (earnAvailable < minPayout) {
      showToast(`Need at least $${minPayout} available.`, "removed");
      return;
    }
    if (!confirm(`Request payout of $${earnAvailable.toFixed(2)}?`)) return;
    setPayoutBusy(true);
    try {
      const res = await fetch("/api/affiliate-settings/payouts", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: earnAvailable }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Payout request failed.", "removed");
        return;
      }
      showToast(data.message || "Payout requested.", "success");
      if (data.payout) setPayouts((prev) => [data.payout, ...prev]);
      setEarnAvailable(0);
      setEarnPending((p) => p + (Number(data.payout?.amount) || 0));
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setPayoutBusy(false);
    }
  };

  const saveTracking = async () => {
    try {
      const res = await fetch("/api/affiliate-settings/tracking", {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cookieDays: Number(cookieDays),
          postbackUrl,
          autoPayoutThreshold: threshold,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not save tracking.", "removed");
        return;
      }
      showToast("Tracking preferences saved.", "success");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const testPostback = async () => {
    try {
      const res = await fetch("/api/affiliate-settings/postback/test", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      showToast(
        data.message || (data.success ? "OK" : "Failed"),
        data.success ? "success" : "removed"
      );
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const downloadBanner = () => {
    if (!previewSrc) {
      showToast("Generate a banner first.", "info");
      return;
    }
    const a = document.createElement("a");
    a.href = previewSrc;
    a.download = `thick9-banner-${audience.replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("Download started.", "success");
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard!", "success");
    } catch {
      showToast("Could not copy.", "removed");
    }
  };


  const connectSocial = async (platform: string) => {
    try {
      // Try OAuth start first
      const oRes = await fetch(
        `/api/affiliate-settings/social/oauth/${encodeURIComponent(platform)}`,
        {
          credentials: "include",
          headers: getAuthHeaders(),
          cache: "no-store",
        }
      ).catch(() => null);

      if (oRes && oRes.ok) {
        const oData = await oRes.json().catch(() => ({}));
        if (oData.authorizeUrl) {
          window.location.href = oData.authorizeUrl;
          return;
        }
      }

      // Manual connect (persisted on User.socialAccounts)
      const res = await fetch("/api/affiliate-settings/social", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not connect.", "removed");
        return;
      }
      setSocialAccounts(data.socialAccounts || []);
      setSocialOpen(false);
      showToast(data.message || `${platform} connected.`, "success");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const disconnectSocial = async (platform: string) => {
    try {
      const res = await fetch(
        `/api/affiliate-settings/social/${encodeURIComponent(platform)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: getAuthHeaders(),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not disconnect.", "removed");
        return;
      }
      setSocialAccounts(data.socialAccounts || []);
      showToast("Disconnected.", "info");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const createApiKey = async () => {
    setKeysLoading(true);
    setNewRawKey(null);
    try {
      const res = await fetch("/api/affiliate-settings/api-keys", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Production Key" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not create key.", "removed");
        return;
      }
      if (data.rawKey) setNewRawKey(data.rawKey);
      if (data.key) setApiKeys((prev) => [data.key, ...prev]);
      showToast("Key created — copy it now.", "success");
    } catch {
      showToast("Network error.", "removed");
    } finally {
      setKeysLoading(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (!confirm("Revoke this API key? It will stop working immediately.")) return;
    try {
      const res = await fetch(`/api/affiliate-settings/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not revoke.", "removed");
        return;
      }
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      showToast("Key revoked.", "info");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const generateBanner = async () => {
    try {
      const res = await fetch("/api/affiliate-settings/generate-banner", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: displayName || "Thick 9",
          subtitle: "Start freelancing smarter",
          brandColor,
          audience,
          width: assetFilter === "stories" ? 1080 : 728,
          height: assetFilter === "stories" ? 1920 : 90,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.dataUrl) {
        showToast(data.message || "Generation failed.", "removed");
        return;
      }
      setPreviewSrc(data.dataUrl);
      setPreviewTitle(`Generated · ${audience}`);
      showToast("Banner generated.", "success");
    } catch {
      showToast("Network error.", "removed");
    }
  };

  const socialConnected = socialAccounts.length > 0;
  const socialPlatform = socialAccounts[0]?.platform || "";

  const healthPercent = (() => {
    let p = 40;
    if (displayName) p += 15;
    if (bio) p += 10;
    if (payoneerEmail || accountName) p += 15;
    if (taxId) p += 10;
    if (socialConnected) p += 10;
    return Math.min(100, p);
  })();

  const meta = SECTION_META[section];

  if (loading) {
    return (
      <div className="affiliate-settings-page aff-dash-bg">
        <div className="aff-dash-wrapper">
          <p style={{ padding: 40, color: "#64748b" }}>Loading ambassador settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="affiliate-settings-page aff-dash-bg">
      <div className="aff-dash-wrapper">
        <aside className="aff-sidebar">
          <div className="aff-card nav-widget">
            <div className="sidebar-label" style={{ padding: "0 8px 12px", fontWeight: 700, color: "#64748b", fontSize: "0.8rem" }}>
              Account Configuration
            </div>
            <nav id="settings-nav">
              {(Object.keys(SECTION_META) as SectionId[]).map((id) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={section === id ? "active" : ""}
                  data-title={SECTION_META[id].title}
                  onClick={(e) => {
                    e.preventDefault();
                    switchSection(id);
                  }}
                >
                  <i className={`fas ${SECTION_META[id].icon}`} />{" "}
                  {SECTION_META[id].label}
                </a>
              ))}
            </nav>
          </div>

          <Link href="/affiliate-dashboard" className="return-widget">
            <i className="fa-solid fa-arrow-left" />
            <span>Return to Dashboard</span>
          </Link>
        </aside>

        <main className="aff-main">
          <header className="aff-top-bar">
            <div className="page-title-container">
              <div className="glass-id-badge">
                <span
                  className="dot"
                  id="title-dot"
                  style={{ backgroundColor: meta.color }}
                />
                <div id="dynamic-title">
                  <span className="hash-symbol">#</span>
                  {meta.title}
                </div>
              </div>
            </div>
            <div className="aff-user-pill">
              <span>Ambassador Mode</span>
            </div>
          </header>

          {/* PROFILE */}
          <section
            id="profile"
            className="settings-page-section"
            style={{ display: section === "profile" ? "block" : "none" }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-id-card" />
              </div>
              <div className="intro-text">
                <h2>Profile Identity</h2>
                <p>
                  Manage how you appear to your audience. A complete profile
                  increases conversion rates.
                </p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Public Identity</h3>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Handle</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                  />
                </div>
              </div>
              <div
                className="input-group-glass"
                style={{ marginTop: 20, flexDirection: "column" }}
              >
                <label>Bio Intro</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-main-red"
                style={{ marginTop: 20 }}
                disabled={saving}
                onClick={saveProfile}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Referral link</h3>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Your code</label>
                  <input type="text" value={referralCode} readOnly />
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Share URL</label>
                  <input type="text" value={referralLink} readOnly />
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-main-red"
                  onClick={() => copyText(referralLink)}
                  disabled={!referralLink}
                >
                  <i className="fas fa-copy" /> Copy link
                </button>
                <button
                  type="button"
                  className="btn-glass-small"
                  style={{ color: "#333", border: "1px solid #ddd" }}
                  onClick={() => copyText(referralCode)}
                  disabled={!referralCode}
                >
                  Copy code
                </button>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Referral QR"
                    width={120}
                    height={120}
                    style={{ borderRadius: 8, border: "1px solid #eee" }}
                  />
                ) : null}
              </div>
              <p className="input-hint" style={{ marginTop: 8 }}>
                Visitors with ?ref={referralCode || "CODE"} are attributed to you when signup stores referredBy.
              </p>
            </div>

          </section>

          {/* FINANCIALS */}
          <section
            id="financials"
            className="settings-page-section"
            style={{ display: section === "financials" ? "block" : "none" }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-coins" />
              </div>
              <div className="intro-text">
                <h2>Growth &amp; Financials</h2>
                <p>Track your commission tiers and manage how you receive earnings.</p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Reward Progression</h3>
                <span className="badge-tier platinum">{tierLabel} Status</span>
              </div>
              <div className="tier-progress-container">
                <div className="progress-track-wrapper">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${tierProgress}%` }}
                  />
                </div>
                <div className="tier-footer-note">
                  <p>
                    <i className="fas fa-rocket" /> Lifetime earnings:{" "}
                    <strong>${earnings.toLocaleString()}</strong>
                    {nextTierGap > 0 && (
                      <>
                        {" "}
                        — <strong>${nextTierGap.toLocaleString()}</strong> to next
                        tier target
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>


            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Earnings snapshot</h3>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Lifetime</label>
                  <strong style={{ fontSize: "1.4rem" }}>${earnLifetime.toFixed(2)}</strong>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>This month</label>
                  <strong style={{ fontSize: "1.4rem" }}>${earnMonth.toFixed(2)}</strong>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Available</label>
                  <strong style={{ fontSize: "1.4rem", color: "#2ed573" }}>
                    ${earnAvailable.toFixed(2)}
                  </strong>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Pending payout</label>
                  <strong style={{ fontSize: "1.4rem" }}>${earnPending.toFixed(2)}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn-main-red"
                style={{ marginTop: 16 }}
                disabled={payoutBusy || earnAvailable < minPayout}
                onClick={requestPayout}
              >
                {payoutBusy
                  ? "Submitting…"
                  : earnAvailable < minPayout
                    ? `Min. payout $${minPayout}`
                    : `Request payout ($${earnAvailable.toFixed(2)})`}
              </button>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Recent conversions</h3>
              </div>
              {conversions.length === 0 ? (
                <p className="input-hint">
                  No referred signups yet. Share your link to get started.
                </p>
              ) : (
                conversions.map((c) => (
                  <div key={c.id} className="api-key-item" style={{ marginBottom: 8 }}>
                    <div className="key-details">
                      <strong>{c.name}</strong>
                      <p>
                        {c.role || "user"}
                        {c.verified ? " · verified" : ""}
                        {c.joinedAt
                          ? ` · ${new Date(c.joinedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <span className={`tag-status ${c.verified ? "green" : "orange"}`}>
                      {c.verified ? "OK" : "Pending"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Payout history</h3>
              </div>
              {payouts.length === 0 ? (
                <p className="input-hint">No payout requests yet.</p>
              ) : (
                payouts.map((row) => (
                  <div key={row._id} className="api-key-item" style={{ marginBottom: 8 }}>
                    <div className="key-details">
                      <strong>${Number(row.amount).toFixed(2)}</strong>
                      <p>
                        {row.method || "—"} ·{" "}
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`tag-status ${
                        row.status === "paid" || row.status === "approved"
                          ? "green"
                          : row.status === "rejected"
                            ? "orange"
                            : "orange"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Payout Configuration</h3>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Preferred Method</label>
                  <div className="custom-select-wrapper">
                    <div
                      className="custom-select-trigger"
                      onClick={() =>
                        setOpenSelect(openSelect === "method" ? null : "method")
                      }
                    >
                      <span>
                        {payoutMethod === "Payoneer"
                          ? `Payoneer (${payoneerEmail || "email"})`
                          : payoutMethod === "Bank"
                            ? "Local Bank"
                            : "None"}
                      </span>
                      <i className="fas fa-chevron-down" />
                    </div>
                    {openSelect === "method" && (
                      <div className="custom-options open">
                        {(["Payoneer", "Bank", "None"] as const).map((m) => (
                          <span
                            key={m}
                            className={`custom-option ${
                              payoutMethod === m ? "selected" : ""
                            }`}
                            onClick={() => {
                              setPayoutMethod(m);
                              setOpenSelect(null);
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>
                    {payoutMethod === "Bank" ? "Account name" : "Payoneer email"}
                  </label>
                  {payoutMethod === "Bank" ? (
                    <>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Account holder"
                      />
                      <input
                        type="text"
                        style={{ marginTop: 8 }}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank name"
                      />
                    </>
                  ) : (
                    <input
                      type="email"
                      value={payoneerEmail}
                      onChange={(e) => setPayoneerEmail(e.target.value)}
                      placeholder="you@payoneer.com"
                    />
                  )}
                </div>
              </div>

              <div className="auto-payout-box">
                <div className="payout-label-row">
                  <div className="label-main">
                    <strong>Auto-Withdrawal Threshold</strong>
                  </div>
                  <div className="threshold-display">
                    $<span id="payout-limit">{threshold}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={threshold}
                  className="premium-range"
                  id="threshold-slider"
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
                <p className="input-hint">
                  Preference only — automated payout runs when Payoneer mass-payout
                  is connected.
                </p>
              </div>

              <button
                type="button"
                className="btn-main-red"
                style={{ marginTop: 16 }}
                disabled={saving}
                onClick={saveProfile}
              >
                {saving ? "Saving…" : "Save payout settings"}
              </button>
            </div>
          </section>

          {/* TRACKING */}
          <section
            id="tracking"
            className="settings-page-section"
            style={{ display: section === "tracking" ? "block" : "none" }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-user-shield" />
              </div>
              <div className="intro-text">
                <h2>Tracking &amp; Compliance</h2>
                <p>Configure referrals tracking and legal documentation.</p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Tax &amp; Legal</h3>
                <span className={`tag-status ${taxId ? "green" : "orange"}`}>
                  <i className={`fas ${taxId ? "fa-check-circle" : "fa-exclamation-triangle"}`} />{" "}
                  {taxId ? "Tax ID on file" : "Optional"}
                </span>
              </div>
              <div className="input-group-glass" style={{ flexDirection: "column" }}>
                <label>VAT / Tax ID (Optional)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Tax ID"
                />
              </div>
              <button
                type="button"
                className="btn-main-red"
                style={{ marginTop: 12 }}
                onClick={saveProfile}
              >
                Save tax ID
              </button>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Tracking Engine</h3>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Cookie Lifetime (preference)</label>
                  <div className="custom-select-wrapper">
                    <div
                      className="custom-select-trigger"
                      onClick={() =>
                        setOpenSelect(openSelect === "cookie" ? null : "cookie")
                      }
                    >
                      <span>{cookieDays} Days</span>
                      <i className="fas fa-chevron-down" />
                    </div>
                    {openSelect === "cookie" && (
                      <div className="custom-options open">
                        {["30", "90", "180"].map((d) => (
                          <span
                            key={d}
                            className={`custom-option ${
                              cookieDays === d ? "selected" : ""
                            }`}
                            onClick={() => {
                              setCookieDays(d);
                              setOpenSelect(null);
                              showToast(`Cookie preference: ${d} days`, "info");
                            }}
                          >
                            {d} Days
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Postback URL</label>
                  <input
                    type="text"
                    value={postbackUrl}
                    onChange={(e) => setPostbackUrl(e.target.value)}
                    placeholder="https://api.yoursite.com/callback"
                  />
                </div>
              </div>
              <div className="pixel-tracking-area">
                <label className="glass-label">Referral / pixel snippet</label>
                <div className="code-copy-box">
                  <code>{pixelSnippet}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyText(pixelSnippet)}
                  >
                    <i className="fas fa-copy" />
                  </button>
                </div>
                {referralCode && (
                  <p className="input-hint">Your referral code: {referralCode}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <button type="button" className="btn-main-red" onClick={saveTracking}>
                  Save tracking prefs
                </button>
                <button
                  type="button"
                  className="btn-glass-small"
                  style={{ color: "#333", border: "1px solid #ccc" }}
                  onClick={testPostback}
                >
                  Test postback
                </button>
              </div>
            </div>
          </section>

          {/* SECURITY */}
          <section
            id="security"
            className="settings-page-section"
            style={{ display: section === "security" ? "block" : "none" }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-lock" />
              </div>
              <div className="intro-text">
                <h2>Security &amp; Access</h2>
                <p>
                  Protect earnings. Full 2FA login challenge is queued with the
                  main header login flow.
                </p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Two-Factor Authentication</h3>
                <span
                  className={`tag-status ${
                    twoFactorEnabled ? "green" : "orange"
                  }`}
                >
                  <i
                    className={`fas ${
                      twoFactorEnabled
                        ? "fa-check-circle"
                        : "fa-exclamation-triangle"
                    }`}
                  />{" "}
                  {twoFactorEnabled ? "Flag enabled" : "Not Enabled"}
                </span>
              </div>
              <div className="security-flex-row">
                <div className="security-info-text">
                  <strong>Authenticator flag</strong>
                  <p>
                    Toggles <code>twoFactorEnabled</code> on your account. OTP
                    challenge at login comes later.
                  </p>
                </div>
                <button type="button" className="btn-main-red" onClick={toggle2FA}>
                  {twoFactorEnabled ? "Disable 2FA flag" : "Enable 2FA flag"}
                </button>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>API Access Keys</h3>
              </div>
              <p className="input-hint">
                Public affiliate API keys are not issued yet. Use your referral
                link and tracking pixel for campaigns.
              </p>
            </div>

            <div className="aff-card settings-island danger-zone-border">
              <div className="island-header">
                <h3 style={{ color: "#d63031" }}>
                  <i className="fas fa-radiation" /> Danger Zone
                </h3>
              </div>
              <div className="settings-grid-duo">
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Account Data</label>
                  <button
                    type="button"
                    className="btn-outline-full"
                    onClick={() =>
                      showToast("Data export will be available soon.", "info")
                    }
                  >
                    Export Data (.zip)
                  </button>
                </div>
                <div className="input-group-glass" style={{ flexDirection: "column" }}>
                  <label>Account Status</label>
                  <button
                    type="button"
                    className="btn-outline-danger"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Deactivate your affiliate account? You will be signed out."
                        )
                      )
                        return;
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
                          showToast(
                            data.message || "Deactivation failed.",
                            "removed"
                          );
                          return;
                        }
                        localStorage.removeItem("token");
                        router.push("/?auth=login");
                      } catch {
                        showToast("Network error.", "removed");
                      }
                    }}
                  >
                    Close Account
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* MARKETING */}
          <section
            id="marketing"
            className="settings-page-section"
            style={{ display: section === "marketing" ? "block" : "none" }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-ad" />
              </div>
              <div className="intro-text">
                <h2>Marketing Kit</h2>
                <p>
                  Creative tools and captions. AI generation is a UI preview until
                  a media API is connected.
                </p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>
                  <i className="fas fa-magic" /> Asset Customizer
                </h3>
                <span className="badge-pro">UI</span>
              </div>
              <div className="ai-customizer-grid">
                <div className="customizer-controls">
                  <div className="input-group-glass" style={{ flexDirection: "column" }}>
                    <label>Brand Primary Color</label>
                    <input
                      type="color"
                      value={brandColor}
                      className="glass-color-picker"
                      onChange={(e) => setBrandColor(e.target.value)}
                    />
                  </div>
                  <div
                    className="input-group-glass"
                    style={{ marginTop: 15, flexDirection: "column" }}
                  >
                    <label>Target Audience</label>
                    <div className="custom-select-wrapper">
                      <div
                        className="custom-select-trigger"
                        onClick={() =>
                          setOpenSelect(
                            openSelect === "audience" ? null : "audience"
                          )
                        }
                      >
                        <span>{audience}</span>
                        <i className="fas fa-chevron-down" />
                      </div>
                      {openSelect === "audience" && (
                        <div className="custom-options open">
                          {[
                            "Freelancers",
                            "Enterprise Clients",
                            "Social Media Managers",
                          ].map((a) => (
                            <span
                              key={a}
                              className={`custom-option ${
                                audience === a ? "selected" : ""
                              }`}
                              onClick={() => {
                                setAudience(a);
                                setOpenSelect(null);
                              }}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-main-red"
                    style={{ marginTop: 20, width: "100%" }}
                    onClick={generateBanner}
                  >
                    Generate Custom Banner
                  </button>
                  <button
                    type="button"
                    className="btn-glass-small"
                    style={{
                      marginTop: 10,
                      width: "100%",
                      color: "#333",
                      border: "1px solid #ccc",
                    }}
                    onClick={downloadBanner}
                  >
                    <i className="fas fa-download" /> Download SVG
                  </button>
                </div>
                <div className="ai-preview-window">
                  {previewSrc ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSrc}
                        alt={previewTitle}
                        style={{
                          maxWidth: "100%",
                          borderRadius: 10,
                          border: `2px solid ${brandColor}`,
                        }}
                      />
                      <p style={{ marginTop: 10, fontSize: "0.8rem" }}>
                        Editing: <strong>{previewTitle}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="preview-placeholder">
                      <i className="fas fa-wand-magic-sparkles" />
                      <p>Select an asset below</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Creative Assets</h3>
                <div className="filter-tabs">
                  {["banners", "stories", "email"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`tab-mini ${assetFilter === f ? "active" : ""}`}
                      onClick={() => setAssetFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="asset-download-grid">
                {[
                  {
                    cat: "banners",
                    title: "Leaderboard Banner",
                    size: "728 x 90 • PNG",
                    src: "/default-cover.jpg",
                  },
                  {
                    cat: "stories",
                    title: "Instagram Story",
                    size: "1080 x 1920 • JPG",
                    src: "/default-avatar.png",
                  },
                ]
                  .filter((a) => a.cat === assetFilter)
                  .map((a) => (
                    <div
                      key={a.title}
                      className="asset-card"
                      data-category={a.cat}
                      onClick={() => {
                        setPreviewSrc(a.src);
                        setPreviewTitle(a.title);
                      }}
                    >
                      <div className="asset-preview-box">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.src} alt={a.title} />
                      </div>
                      <div className="asset-info">
                        <strong>{a.title}</strong>
                        <span>{a.size}</span>
                      </div>
                    </div>
                  ))}
                {["banners", "stories", "email"].includes(assetFilter) &&
                  [
                    {
                      cat: "banners",
                      title: "Leaderboard Banner",
                    },
                  ].filter((a) => a.cat === assetFilter).length === 0 && (
                    <p className="input-hint">No assets in this tab yet.</p>
                  )}
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="island-header">
                <h3>Pre-written Captions</h3>
              </div>
              <div className="caption-item-glass">
                <p>
                  &quot;Stop hunting for clients. Start building on Thick 9. 🚀
                  #FreelanceLife&quot;
                </p>
                <button
                  type="button"
                  className="copy-btn-dark"
                  onClick={() =>
                    copyText(
                      withRef(
                        "Stop hunting for clients. Start building on Thick 9. 🚀 #FreelanceLife"
                      )
                    )
                  }
                >
                  <i className="fas fa-copy" /> Copy
                </button>
              </div>
            </div>
          </section>

          {/* PROFILE STRENGTH */}
          <section
            id="profile-strength"
            className="settings-page-section"
            style={{
              display: section === "profile-strength" ? "block" : "none",
            }}
          >
            <div className="intro-glass-card">
              <div className="intro-image-blur">
                <i className="fas fa-thermometer" />
              </div>
              <div className="intro-text">
                <h2>Account Health</h2>
                <p>Complete your profile to strengthen your ambassador standing.</p>
              </div>
            </div>

            <div className="aff-card settings-island">
              <div className="health-stats-row">
                <div className="main-progress-wrapper">
                  <svg viewBox="0 0 36 36" className="circular-chart crimson">
                    <path
                      className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle"
                      id="health-progress-bar"
                      strokeDasharray={`${healthPercent}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text
                      x="18"
                      y="20.35"
                      className="percentage"
                      id="health-percent-text"
                    >
                      {healthPercent}%
                    </text>
                  </svg>
                </div>
                <div className="health-checklist-detailed">
                  <div className={`health-steps ${displayName ? "done" : ""}`}>
                    <i className="fas fa-check-circle" />
                    <div className="step-info">
                      <strong>Display name</strong>
                      <span>{displayName || "Add a display name"}</span>
                    </div>
                  </div>
                  <div
                    className={`health-steps ${
                      payoneerEmail || accountName ? "done" : "action-required"
                    }`}
                  >
                    <i
                      className={`fas ${
                        payoneerEmail || accountName
                          ? "fa-check-circle"
                          : "fa-exclamation-triangle"
                      }`}
                    />
                    <div className="step-info">
                      <strong>Payout Configuration</strong>
                      <span>
                        {payoneerEmail || accountName
                          ? `Method: ${payoutMethod}`
                          : "Add Payoneer or bank"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`health-steps ${
                      socialConnected ? "done" : "action-required"
                    }`}
                  >
                    <i
                      className={`fas ${
                        socialConnected
                          ? "fa-check-circle"
                          : "fa-exclamation-triangle"
                      }`}
                    />
                    <div className="step-info">
                      <strong>Social Media</strong>
                      <span>
                        {socialConnected
                          ? socialAccounts.map((s) => s.platform).join(", ")
                          : "Connect for network badges"}
                      </span>
                    </div>
                    {!socialConnected && (
                      <button
                        type="button"
                        className="btn-mini-glass"
                        id="connect-social-btn"
                        onClick={() => setSocialOpen(true)}
                      >
                        Connect Now
                      </button>
                    )}
                  </div>
                  <div className={`health-steps ${taxId ? "done" : "locked"}`}>
                    <i className={`fas ${taxId ? "fa-check-circle" : "fa-lock"}`} />
                    <div className="step-info">
                      <strong>Tax Documentation</strong>
                      <span>
                        {taxId ? "Tax ID saved" : "Optional until higher volume"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Social modal */}
      {socialOpen && (
        <div
          id="social-modal"
          className="glass-modal-overlay"
          style={{ display: "flex" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSocialOpen(false);
          }}
        >
          <div className="glass-modal-content">
            <div className="modal-header">
              <h3>Connect Social Media</h3>
              <button
                type="button"
                className="close-modal"
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "2rem",
                  cursor: "pointer",
                }}
                onClick={() => setSocialOpen(false)}
              >
                &times;
              </button>
            </div>
            <p>Select a platform (local badge for now — OAuth later).</p>
            <div className="social-connect-grid">
              {[
                ["Instagram", "fa-instagram"],
                ["Facebook", "fa-facebook-f"],
                ["LinkedIn", "fa-linkedin"],
                ["X-Twitter", "fa-x-twitter"],
              ].map(([platform, icon]) => (
                <div
                  key={platform}
                  className="social-option"
                  data-platform={platform}
                  onClick={() => connectSocial(platform)}
                >
                  <i className={`fab ${icon}`} />
                  <span>{platform}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div id="toast-container" />
    </div>
  );
}
