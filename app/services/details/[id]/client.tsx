// app/services/details/[id]/client.tsx

"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Service, ServicePackage, ServiceAddon } from "@/types/service";
import "@/styles/pages/service-details.css";

type PackageKey = "basic" | "standard" | "premium";

interface ServiceDetailsClientProps {
  service: Service;
}

function getPackagePrice(pkg?: ServicePackage): number {
  if (!pkg) return 0;
  const n = Number(pkg.price);
  return Number.isFinite(n) ? n : 0;
}

function getAddonLabel(addon: ServiceAddon): string {
  return (addon.label || addon.title || "Add-on").trim();
}

function getAddonPrice(addon: ServiceAddon): number {
  const n = Number(addon.price);
  return Number.isFinite(n) ? n : 0;
}

/** Badge always shows the tier (BASIC / STANDARD / PREMIUM), not free-form title */
function tierLabel(key: PackageKey | string): string {
  return String(key || "").toUpperCase();
}

function cleanText(value?: string | null, max = 0): string {
  if (!value) return "";
  let s = String(value).replace(/\s+/g, " ").trim();
  // Collapse accidental triple-paste of the same phrase
  const half = Math.floor(s.length / 2);
  if (half > 12 && s.slice(0, half) === s.slice(half, half * 2)) {
    s = s.slice(0, half).trim();
  }
  if (max > 0 && s.length > max) s = s.slice(0, max).trim() + "…";
  return s;
}

function showToast(message: string, type: "info" | "success" | "error" = "info") {
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
  window.setTimeout(() => {
    el.remove();
  }, 3200);
}

export default function ServiceDetailsClient({
  service,
}: ServiceDetailsClientProps) {
  const router = useRouter();
  const [messaging, setMessaging] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  const packages = service.packages || {};
  const availableKeys = (
    ["basic", "standard", "premium"] as PackageKey[]
  ).filter((k) => packages[k] && (packages[k]?.title || packages[k]?.price));

  const defaultKey: PackageKey = availableKeys.includes("standard")
    ? "standard"
    : availableKeys[0] || "basic";

  const [selectedKey, setSelectedKey] = useState<PackageKey>(defaultKey);
  const [selectedAddonIndexes, setSelectedAddonIndexes] = useState<Set<number>>(
    new Set()
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [galleryPaused, setGalleryPaused] = useState(false);

  const selectedPkg = packages[selectedKey];
  const basePrice = getPackagePrice(selectedPkg);

  const addons = useMemo(
    () => (Array.isArray(service.addons) ? service.addons : []),
    [service.addons]
  );

  const selectedAddons = useMemo(
    () =>
      addons
        .filter((_, i) => selectedAddonIndexes.has(i))
        .map((a) => ({
          title: getAddonLabel(a),
          price: getAddonPrice(a),
        })),
    [addons, selectedAddonIndexes]
  );

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const total = basePrice + addonsTotal;

  const images =
    service.images && service.images.length > 0
      ? service.images
      : ["/default-service.png"];

  const seller = service.sellerId;
  const sellerName =
    service.sellerName ||
    seller?.displayName ||
    seller?.fullName ||
    "Freelancer";
  const sellerAvatar =
    service.sellerAvatar || seller?.avatar || "/default-avatar.png";
  const sellerLevel = service.level || seller?.level || "Level 1 Seller";
  const isVerified = seller?.isVerified ?? false;
  const rawOnline =
    (seller as { onlineStatus?: string; isOnline?: boolean } | undefined)
      ?.onlineStatus ||
    (service as { isOnline?: boolean }).isOnline;
  const onlineKey = String(
    typeof rawOnline === "boolean"
      ? rawOnline
        ? "online"
        : "offline"
      : rawOnline || "offline"
  ).toLowerCase();
  const isOnline =
    onlineKey === "online" || onlineKey === "true" || onlineKey === "1";
  const isAway = onlineKey === "away";
  const presenceClass = isOnline ? "online" : isAway ? "away" : "offline";
  const presenceLabel = isOnline ? "Online" : isAway ? "Away" : "Offline";
  const sellerId = String(seller?._id || seller?.id || "").trim();
  const sellerProfileHref = sellerId
    ? `/freelancer-profile?id=${encodeURIComponent(sellerId)}`
    : "/freelancer-profile";
  const serviceId = String(service.id || service._id || "").trim();
  const rating = service.rating ?? 0;
  const reviewsCount = service.reviewsCount ?? 0;

  const delivery =
    selectedPkg?.delivery != null
      ? String(selectedPkg.delivery)
      : String(service.deliveryTime ?? 3);
  const revisions =
    selectedPkg?.revisions != null ? String(selectedPkg.revisions) : "—";

  const packageDesc = cleanText(
    selectedPkg?.desc || service.description || "",
    140
  );


  /* ---------- favourite hydrate (Bookmark API) ---------- */
  useEffect(() => {
    if (!serviceId || typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      setIsFavorited(
        Boolean((service as { isFavorited?: boolean }).isFavorited)
      );
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/bookmarks/check?itemType=Service&itemId=${encodeURIComponent(serviceId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (res.ok && typeof json.favorited !== "undefined") {
          setIsFavorited(Boolean(json.favorited));
        }
      } catch {
        /* leave current state */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [serviceId, service]);

  /* ---------- auto-rotate gallery every 6s ---------- */
  useEffect(() => {
    if (images.length < 2 || galleryPaused) return;
    const timer = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [images.length, galleryPaused]);

  /* ---------- view tracking ---------- */
  useEffect(() => {
    if (!service?.id && !service?._id) return;

    const id = service.id || service._id;
    if (!id) return;

    const ua = navigator.userAgent || "";
    let device: "desktop" | "mobile" | "tablet" | "unknown" = "desktop";
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) device = "mobile";
    else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) device = "tablet";

    const ref = document.referrer || "";
    let source: "direct" | "social" | "external" | "search" | "unknown" =
      "direct";
    if (!ref) {
      source = "direct";
    } else {
      try {
        const host = new URL(ref).hostname.toLowerCase();
        if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(host)) {
          source = "search";
        } else if (
          /facebook\.|instagram\.|twitter\.|x\.com|linkedin\.|tiktok\.|pinterest\./.test(
            host
          )
        ) {
          source = "social";
        } else if (host === window.location.hostname) {
          source = "direct";
        } else {
          source = "external";
        }
      } catch {
        source = "unknown";
      }
    }

    fetch(`/api/services/${id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, device, referrer: ref.slice(0, 500) }),
    }).catch(() => {});
  }, [service?.id, service?._id]);

  const toggleAddon = (index: number) => {
    setSelectedAddonIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const contactSeller = async () => {
    if (!sellerId) {
      showToast("Seller profile is unavailable.", "error");
      return;
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Please log in to message the freelancer.", "info");
      router.push("/?auth=login");
      return;
    }
    // Cannot start a DM with yourself (own service)
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        const myId = String(u.id || u._id || "").trim();
        if (myId && myId === String(sellerId)) {
          showToast("You can't message yourself on your own service.", "info");
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setMessaging(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: sellerId,
          serviceId: serviceId || undefined,
          initialMessage: `Hi! I'm interested in "${service.title || "your service"}".`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.message || "Could not start a conversation.", "error");
        return;
      }
      const cid = data.conversationId || data.conversation?._id;
      showToast("Opening chat…", "success");
      if (cid) {
        router.push(`/messages?c=${cid}`);
      } else {
        router.push("/messages");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setMessaging(false);
    }
  };


  const toggleFavorite = async () => {
    if (!serviceId) {
      showToast("Service unavailable.", "error");
      return;
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      showToast("Please log in to save favourites.", "info");
      router.push("/?auth=login");
      return;
    }
    const next = !isFavorited;
    setIsFavorited(next);
    setFavBusy(true);
    try {
      if (next) {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          credentials: "include",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemType: "Service", itemId: serviceId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 409) {
          setIsFavorited(false);
          showToast(json.message || "Could not save favourite.", "error");
          return;
        }
        showToast("Saved to favourites.", "success");
      } else {
        const res = await fetch("/api/bookmarks", {
          method: "DELETE",
          credentials: "include",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemType: "Service", itemId: serviceId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setIsFavorited(true);
          showToast(json.message || "Could not remove favourite.", "error");
          return;
        }
        showToast("Removed from favourites.", "success");
      }
    } catch {
      setIsFavorited((prev) => !prev);
      showToast("Network error. Please try again.", "error");
    } finally {
      setFavBusy(false);
    }
  };

  const shareService = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/services/details/${serviceId}`;
    const title = service.title || "Service on Thick 9";
    try {
      if (navigator.share) {
        await navigator.share({ title, url, text: title });
        showToast("Thanks for sharing!", "success");
        return;
      }
    } catch (err: unknown) {
      // user cancelled share sheet
      if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "AbortError") {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard.", "success");
    } catch {
      // fallback prompt
      window.prompt("Copy this link:", url);
      showToast("Copy the link to share.", "info");
    }
  };

  const proceedToCheckout = () => {
    const serviceId = service.id || service._id || "";
    const sellerId = seller?._id || seller?.id || "";

    const deliveryTimeDays = Math.max(
      1,
      parseInt(String(delivery).replace(/\D/g, ""), 10) ||
        Number(service.deliveryTime) ||
        3
    );

    let clientId = "";
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          clientId = u.id || u._id || "";
        }
      } catch {
        /* ignore */
      }
    }

    const params = new URLSearchParams({
      serviceId,
      sellerId,
      title: service.title || "Service",
      price: String(basePrice),
      deliveryTime: String(deliveryTimeDays),
      packageKey: selectedKey,
      addons: JSON.stringify(selectedAddons),
    });

    if (clientId) params.set("clientId", clientId);

    fetch(`/api/services/${serviceId}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "continue" }),
    }).catch(() => {});

    window.location.href = `/client-checkout?${params.toString()}`;
  };

  return (
    <main className="service-details-main">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep" aria-hidden>
            /
          </span>
          {service.category ? (
            <>
              <Link
                href={`/services/${encodeURIComponent(service.category)}`}
                className="breadcrumb-mid"
              >
                {service.category}
              </Link>
              <span className="breadcrumb-sep" aria-hidden>
                /
              </span>
            </>
          ) : null}
          <span className="breadcrumb-current" title={service.title}>
            {service.title}
          </span>
        </nav>

        {/* Header */}
        <div className="service-header">
          <div className="service-meta">
            <h1 className="service-title">{service.title}</h1>
            <div className="seller-row">
              <Link
                href={sellerProfileHref}
                className="seller-avatar-wrapper seller-profile-link"
                title="View profile"
                aria-label="View profile"
              >
                <Image
                  src={sellerAvatar}
                  alt={sellerName}
                  width={52}
                  height={52}
                  className="seller-avatar"
                />
                <span
                  className={`seller-status-dot ${presenceClass}`}
                  title={presenceLabel}
                  aria-label={presenceLabel}
                />
              </Link>
              <div className="seller-info">
                <div className="seller-name">
                  <Link
                    href={sellerProfileHref}
                    className="seller-name-link"
                    title="View profile"
                  >
                    {sellerName}
                  </Link>{" "}
                  {isVerified && (
                    <span className="verified">
                      <i className="fas fa-check-circle" />
                    </span>
                  )}
                </div>
                <div className="rating-row">
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <i
                        key={s}
                        className={`fas fa-star${
                          s > Math.round(rating) ? " far" : ""
                        }`}
                        style={{
                          color:
                            s <= Math.round(rating) ? "#eab308" : "#cbd5e1",
                        }}
                      />
                    ))}
                  </div>
                  <span className="rating-score">{rating.toFixed(1)}</span>
                  {reviewsCount > 0 && (
                    <span className="review-count">
                      ({reviewsCount} reviews)
                    </span>
                  )}
                </div>
                <span className="seller-level">{sellerLevel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="content-grid">
          {/* LEFT COLUMN */}
          <div className="main-column">
            {/* Gallery */}
            <section
              className="gallery-section"
              onMouseEnter={() => setGalleryPaused(true)}
              onMouseLeave={() => setGalleryPaused(false)}
            >
              <div className="main-image-wrapper">
                <Image
                  id="main-image"
                  src={images[activeImageIndex]}
                  alt={service.title}
                  width={900}
                  height={550}
                  className="main-image"
                  style={{ width: "100%", height: "auto", objectFit: "cover" }}
                  priority
                />
              </div>
              {images.length > 1 && (
                <div className="thumbnail-strip">
                  {images.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      className={`thumbnail ${
                        idx === activeImageIndex ? "active" : ""
                      }`}
                      onClick={() => setActiveImageIndex(idx)}
                      style={{
                        padding: 0,
                        border: "none",
                        background: "none",
                      }}
                    >
                      <Image
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        width={120}
                        height={80}
                        style={{ objectFit: "cover", borderRadius: 10 }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {service.videos && service.videos.length > 0 && (
                <div className="video-showcase">
                  <h3 className="media-subheading">
                    <i className="fas fa-play-circle" /> Video
                  </h3>
                  {service.videos.map((url, i) => (
                    <video
                      key={`video-${i}`}
                      controls
                      width="100%"
                      style={{ marginBottom: 12 }}
                    >
                      <source src={url} />
                    </video>
                  ))}
                </div>
              )}

              {service.audio && service.audio.length > 0 && (
                <div className="audio-showcase">
                  <h3 className="media-subheading">
                    <i className="fas fa-headphones" /> Audio sample
                  </h3>
                  {service.audio.map((url, i) => (
                    <audio
                      key={`audio-${i}`}
                      controls
                      style={{ width: "100%", marginBottom: 8 }}
                    >
                      <source src={url} />
                    </audio>
                  ))}
                </div>
              )}
            </section>

            {/* Favourite + Share (under gallery) */}
            <div className="service-quick-actions" role="group" aria-label="Service actions">
              <button
                type="button"
                className={`quick-action-btn${isFavorited ? " is-active" : ""}`}
                onClick={toggleFavorite}
                disabled={favBusy}
                title={isFavorited ? "Remove from favourites" : "Add to favourites"}
                aria-label={isFavorited ? "Remove from favourites" : "Add to favourites"}
                aria-pressed={isFavorited}
              >
                <i className={isFavorited ? "fas fa-heart" : "far fa-heart"} />
              </button>
              <button
                type="button"
                className="quick-action-btn"
                onClick={shareService}
                title="Share"
                aria-label="Share"
              >
                <i className="fas fa-share-nodes" />
              </button>
            </div>

            <section className="description-section">
              <h2>About This Service</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {service.description || "No description provided."}
              </p>
            </section>

            {service.tags && service.tags.length > 0 && (
              <div className="tags-row">
                {service.tags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {service.requirements && service.requirements.length > 0 && (
              <section className="requirements-section">
                <h2>What I Need From You</h2>
                <div className="requirements-list">
                  {service.requirements.map((req, i) => (
                    <div key={`req-${i}`} className="requirement-item">
                      <p>{req}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {service.attributes && service.attributes.length > 0 && (
              <section className="attributes-section">
                <h2>Why Clients Choose Me</h2>
                <div className="attributes-grid">
                  {service.attributes.map((attr) => (
                    <div key={attr} className="attribute-pill">
                      <i className="fas fa-check" /> {attr}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Packages — badge = tier key (BASIC / STANDARD / PREMIUM) */}
            {availableKeys.length > 0 && (
              <section className="packages-section">
                <h2>Choose Your Package</h2>
                <div className="packages-grid" id="packages-grid">
                  {availableKeys.map((key) => {
                    const pkg = packages[key]!;
                    const price = getPackagePrice(pkg);
                    const isActive = selectedKey === key;
                    const isPopular = key === "standard";
                    return (
                      <div
                        key={key}
                        className={`package-card ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedKey(key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setSelectedKey(key);
                        }}
                      >
                        <div className="package-header">
                          <span className={`package-badge ${key}`}>
                            {tierLabel(key)}
                            {isPopular ? (
                              <span className="popular">Most Popular</span>
                            ) : null}
                          </span>
                          <div className="package-price">${price}</div>
                        </div>
                        {pkg.title &&
                          pkg.title.toLowerCase() !== key &&
                          pkg.title.toLowerCase() !== tierLabel(key).toLowerCase() && (
                            <p className="package-custom-title">{pkg.title}</p>
                          )}
                        {pkg.desc && (
                          <p className="package-desc-text">
                            {cleanText(pkg.desc, 160)}
                          </p>
                        )}
                        <ul className="package-features">
                          {pkg.features
                            ? String(pkg.features)
                                .split("\n")
                                .map((f) => f.trim())
                                .filter(Boolean)
                                .map((f, i) => (
                                  <li key={`${key}-f-${i}`}>
                                    <i className="fas fa-check" /> {f}
                                  </li>
                                ))
                            : null}
                          <li>
                            <i className="fas fa-check" />{" "}
                            {pkg.delivery ?? "—"} days delivery
                          </li>
                          <li>
                            <i className="fas fa-check" />{" "}
                            {pkg.revisions ?? "—"} revisions
                          </li>
                        </ul>
                        <button
                          type="button"
                          className="select-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKey(key);
                          }}
                        >
                          Select {tierLabel(key)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {addons.length > 0 && (
              <section className="addons-section">
                <h2>Optional Add-ons</h2>
                <div className="addons-list" id="addons-list">
                  {addons.map((addon, index) => {
                    const checked = selectedAddonIndexes.has(index);
                    return (
                      <label key={`addon-${index}`} className="addon-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(index)}
                        />
                        <span>{getAddonLabel(addon)}</span>
                        <span className="addon-price">
                          +${getAddonPrice(addon)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            {service.faqs && service.faqs.length > 0 && (
              <section className="faq-section">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-accordion">
                  {service.faqs.map((faq, index) => (
                    <div
                      key={`faq-${index}`}
                      className={`faq-item ${
                        openFaqIndex === index ? "active" : ""
                      }`}
                    >
                      <div
                        className="faq-question"
                        onClick={() =>
                          setOpenFaqIndex(
                            openFaqIndex === index ? null : index
                          )
                        }
                        role="button"
                        tabIndex={0}
                      >
                        {faq.question}
                      </div>
                      {openFaqIndex === index && (
                        <div
                          className="faq-answer"
                          style={{ display: "block" }}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN – sticky order card (desktop) */}
          <aside className="service-sidebar">
            <div className="order-card">
              <div className="order-header">
                <div className="pkg-badge-group">
                  <span
                    className={`package-badge ${selectedKey}`}
                    id="pkg-name"
                  >
                    {tierLabel(selectedKey)}
                  </span>
                  <a href="#packages-grid" className="select-package-link">
                    select package
                  </a>
                </div>
                <div className="package-price-large">
                  $<span id="pkg-price">{basePrice}</span>
                </div>
              </div>

              <p className="order-desc" id="pkg-desc">
                {packageDesc}
              </p>

              <div className="order-delivery">
                <div className="delivery-item">
                  <span className="icon-container">
                    <i className="far fa-clock" />
                  </span>
                  <span>
                    <span id="pkg-delivery">{delivery}</span> Days Delivery
                  </span>
                </div>
                <div className="delivery-item">
                  <span className="icon-container">
                    <i className="fas fa-sync-alt" />
                  </span>
                  <span>
                    <span id="pkg-revisions">{revisions}</span> Revisions
                  </span>
                </div>
              </div>

              {selectedAddons.length > 0 && (
                <div className="mini-addons-list">
                  {selectedAddons.map((a, i) => (
                    <div key={`mini-addon-${i}`} className="mini-addon">
                      <span>+ {a.title}</span>
                      <span className="addon-price-tag">${a.price}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-contact-seller btn-contact-seller--block"
                onClick={contactSeller}
                disabled={messaging || !sellerId}
                title="Contact me"
                aria-label="Contact me"
              >
                <i className="fas fa-envelope" />{" "}
                {messaging ? "Opening…" : "Contact me"}
              </button>

              <button
                type="button"
                className="btn-continue"
                onClick={proceedToCheckout}
              >
                Continue $<span id="total-amount">{total}</span>
                <i className="fas fa-arrow-right" />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="mobile-sticky-bar">
        <div className="sticky-bar-info">
          <span className="sticky-pkg-name">{tierLabel(selectedKey)}</span>
          <span className="sticky-pkg-price">${total}</span>
        </div>
        <button
          type="button"
          className="btn-continue-mobile"
          onClick={proceedToCheckout}
        >
          Continue <i className="fas fa-arrow-right" />
        </button>
      </div>
      <div id="toast-container" />
    </main>
  );
}
