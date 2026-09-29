// app/services/details/[id]/client.tsx

"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

export default function ServiceDetailsClient({ service }: ServiceDetailsClientProps) {
  const packages = service.packages || {};
  const availableKeys = (["basic", "standard", "premium"] as PackageKey[]).filter(
    (k) => packages[k] && (packages[k]?.title || packages[k]?.price)
  );

  const defaultKey: PackageKey =
    availableKeys.includes("standard")
      ? "standard"
      : availableKeys[0] || "basic";

  const [selectedKey, setSelectedKey] = useState<PackageKey>(defaultKey);
  const [selectedAddonIndexes, setSelectedAddonIndexes] = useState<Set<number>>(
    new Set()
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPkg = packages[selectedKey];
  const basePrice = getPackagePrice(selectedPkg);

  const addons = useMemo(
    () => (Array.isArray(service.addons) ? service.addons : []),
    [service.addons]
  );

  const selectedAddons = useMemo(
    () =>
      addons.filter((_, i) => selectedAddonIndexes.has(i)).map((a) => ({
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
  const rating = service.rating ?? 0;
  const reviewsCount = service.reviewsCount ?? 0;

  const delivery =
    selectedPkg?.delivery != null
      ? String(selectedPkg.delivery)
      : String(service.deliveryTime ?? 3);
  const revisions =
    selectedPkg?.revisions != null ? String(selectedPkg.revisions) : "—";

  const toggleAddon = (index: number) => {
    setSelectedAddonIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const proceedToCheckout = () => {
    const serviceId = service.id || service._id || "";
    const sellerId = seller?._id || seller?.id || "";

    const params = new URLSearchParams({
      serviceId,
      sellerId,
      title: service.title || "Service",
      price: String(basePrice),
      addons: JSON.stringify(selectedAddons),
    });

    window.location.href = `/client-checkout?${params.toString()}`;
  };

  return (
    <main className="service-details-main">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href="/">Home</Link> &gt;{" "}
          {service.category ? (
            <>
              <Link href={`/services/${encodeURIComponent(service.category)}`}>
                {service.category}
              </Link>{" "}
              &gt;{" "}
            </>
          ) : null}
          <span>{service.title}</span>
        </nav>

        {/* Header */}
        <div className="service-header">
          <div className="service-meta">
            <h1 className="service-title">{service.title}</h1>
            <div className="seller-row">
              <div className="seller-avatar-wrapper">
                <Image
                  src={sellerAvatar}
                  alt={sellerName}
                  width={52}
                  height={52}
                  className="seller-avatar"
                />
              </div>
              <div className="seller-info">
                <div className="seller-name">
                  {sellerName}{" "}
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
                        className={`fas fa-star${s > Math.round(rating) ? " far" : ""}`}
                        style={{
                          color: s <= Math.round(rating) ? "#eab308" : "#cbd5e1",
                        }}
                      />
                    ))}
                  </div>
                  <span className="rating-score">{rating.toFixed(1)}</span>
                  {reviewsCount > 0 && (
                    <span className="review-count">({reviewsCount} reviews)</span>
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
            <section className="gallery-section">
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
                      key={`\( {src}- \){idx}`}
                      type="button"
                      className={`thumbnail ${idx === activeImageIndex ? "active" : ""}`}
                      onClick={() => setActiveImageIndex(idx)}
                      style={{ padding: 0, border: "none", background: "none" }}
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

              {/* Videos */}
              {service.videos && service.videos.length > 0 && (
                <div className="video-showcase">
                  <h3 className="media-subheading">
                    <i className="fas fa-play-circle" /> Video
                  </h3>
                  {service.videos.map((url, i) => (
                    <video key={i} controls width="100%" style={{ marginBottom: 12 }}>
                      <source src={url} />
                    </video>
                  ))}
                </div>
              )}

              {/* Audio */}
              {service.audio && service.audio.length > 0 && (
                <div className="audio-showcase">
                  <h3 className="media-subheading">
                    <i className="fas fa-headphones" /> Audio sample
                  </h3>
                  {service.audio.map((url, i) => (
                    <audio key={i} controls style={{ width: "100%", marginBottom: 8 }}>
                      <source src={url} />
                    </audio>
                  ))}
                </div>
              )}
            </section>

            {/* Description */}
            <section className="description-section">
              <h2>About This Service</h2>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {service.description || "No description provided."}
              </p>
            </section>

            {/* Tags */}
            {service.tags && service.tags.length > 0 && (
              <div className="tags-row">
                {service.tags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Requirements */}
            {service.requirements && service.requirements.length > 0 && (
              <section className="requirements-section">
                <h2>What I Need From You</h2>
                <div className="requirements-list">
                  {service.requirements.map((req, i) => (
                    <div key={i} className="requirement-item">
                      <p>{req}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Attributes */}
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

            {/* Packages */}
            {availableKeys.length > 0 && (
              <section className="packages-section">
                <h2>Choose Your Package</h2>
                <div className="packages-grid" id="packages-grid">
                  {availableKeys.map((key) => {
                    const pkg = packages[key]!;
                    const price = getPackagePrice(pkg);
                    const isActive = selectedKey === key;
                    return (
                      <div
                        key={key}
                        className={`package-card ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedKey(key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedKey(key);
                        }}
                      >
                        <div className="package-header">
                          <span className={`package-badge ${key}`}>
                            {pkg.title || key}
                          </span>
                          <div className="package-price">${price}</div>
                        </div>
                        {pkg.desc && (
                          <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: 12 }}>
                            {pkg.desc}
                          </p>
                        )}
                        <ul className="package-features">
                          {pkg.features
                            ? String(pkg.features)
                                .split("\n")
                                .filter(Boolean)
                                .map((f, i) => (
                                  <li key={i}>
                                    <i className="fas fa-check" /> {f.trim()}
                                  </li>
                                ))
                            : null}
                          <li>
                            <i className="fas fa-check" /> {pkg.delivery ?? "—"} days delivery
                          </li>
                          <li>
                            <i className="fas fa-check" /> {pkg.revisions ?? "—"} revisions
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
                          Select {pkg.title || key}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Add-ons */}
            {addons.length > 0 && (
              <section className="addons-section">
                <h2>Optional Add-ons</h2>
                <div className="addons-list" id="addons-list">
                  {addons.map((addon, index) => {
                    const checked = selectedAddonIndexes.has(index);
                    return (
                      <label key={index} className="addon-item">
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

            {/* FAQ */}
            {service.faqs && service.faqs.length > 0 && (
              <section className="faq-section">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-accordion">
                  {service.faqs.map((faq, index) => (
                    <div
                      key={index}
                      className={`faq-item ${openFaqIndex === index ? "active" : ""}`}
                    >
                      <div
                        className="faq-question"
                        onClick={() =>
                          setOpenFaqIndex(openFaqIndex === index ? null : index)
                        }
                        role="button"
                        tabIndex={0}
                      >
                        {faq.question}
                      </div>
                      {openFaqIndex === index && (
                        <div className="faq-answer" style={{ display: "block" }}>
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN – Order Card */}
          <div className="service-sidebar">
            <div className="order-card">
              <div className="order-header">
                <span className={`package-badge ${selectedKey}`} id="pkg-name">
                  {selectedPkg?.title || selectedKey}
                </span>
                <a href="#packages-grid" className="select-package-link">
                  select package
                </a>
                <div className="package-price-large">
                  $<span id="pkg-price">{basePrice}</span>
                </div>
              </div>

              <p className="order-desc" id="pkg-desc">
                {selectedPkg?.desc || service.description?.slice(0, 120) || ""}
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
                    <div key={i} className="mini-addon">
                      <span>+ {a.title}</span>
                      <span className="addon-price-tag">${a.price}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-continue"
                onClick={proceedToCheckout}
              >
                Continue $<span id="total-amount">{total}</span>
                <i className="fas fa-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="mobile-sticky-bar">
        <div className="sticky-bar-info">
          <span className="sticky-pkg-name">
            {selectedPkg?.title || selectedKey}
          </span>
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
    </main>
  );
}