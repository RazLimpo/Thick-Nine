"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import type { Service } from "@/types/service";
import { isUserOnline } from "@/lib/presence";

interface ServiceCardProps {
  service: Service;
  onFavoriteToggle?: (serviceId: string, isFavorited: boolean) => void;
}

/** Auto-advance interval for the image slider (ms). */
const SLIDER_INTERVAL_MS = 4000;

export default function ServiceCard({
  service,
  onFavoriteToggle,
}: ServiceCardProps) {
  /* ==========================================================
     SERVICE DATA & DERIVED METADATA
     ========================================================== */

  const serviceId = service.id ?? service._id ?? "";

  // ---------- Images ----------
  const images =
    service.images && service.images.length > 0
      ? service.images
      : ["/default-service.png"];

  const [activeImage, setActiveImage] = useState(0);

  // Auto-rotate when there is more than one image
  useEffect(() => {
    if (images.length <= 1) return;

    const id = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length);
    }, SLIDER_INTERVAL_MS);

    return () => clearInterval(id);
  }, [images.length]);

  // ---------- Seller Info Object ----------
  const seller = service.sellerId;

  const sellerInfo = {
    name:
      service.sellerName ??
      seller?.displayName ??
      seller?.fullName ??
      "Freelancer",

    avatar:
      service.sellerAvatar ?? seller?.avatar ?? "/default-avatar.png",

    level: service.level ?? seller?.level ?? "Level 1 Seller",

    verified: seller?.isVerified ?? false,

    online: isUserOnline({
      isOnline: service.isOnline,
      onlineStatus: seller?.onlineStatus,
      lastSeen: seller?.lastSeen,
    }),

    pro: seller?.planType === "gold" || seller?.planType === "silver",

    city: seller?.location?.city,

    country: seller?.location?.country,
  };

  // ---------- Location String ----------
  const location =
    sellerInfo.city && sellerInfo.country
      ? `${sellerInfo.city}, ${sellerInfo.country}`
      : sellerInfo.city || sellerInfo.country || "Remote";

  // ---------- Pricing ----------
  const formattedPrice = `$${Number(service.price ?? 0).toLocaleString()}`;

  // ---------- Ratings & Delivery ----------
  // Prefer real numbers; do not fake a perfect 5.0 for new services
  const reviewsCount =
    typeof service.reviewsCount === "number" ? service.reviewsCount : 0;
  const hasReviews = reviewsCount > 0;
  const rating =
    typeof service.rating === "number" && !Number.isNaN(service.rating)
      ? service.rating
      : 0;

  const delivery = `${service.deliveryTime ?? 3} Days`;

  // ---------- Category & Service Badges ----------
  const category = service.category ?? "General";
  const isSponsored = service.isSponsored ?? false;
  const isFeatured = service.isFeatured ?? false;

  // ---------- Favorite State ----------
  const [favorite, setFavorite] = useState(service.isFavorited ?? false);

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !favorite;
    setFavorite(nextState);
    onFavoriteToggle?.(serviceId, nextState);
  };

  const handleDotClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  };

  return (
    <article
      className={`mjob-card ${
        sellerInfo.online ? "status-online" : "status-offline"
      }`}
      data-featured={isFeatured ? "true" : "false"}
      data-sponsored={isSponsored ? "true" : "false"}
    >
      {/* ==========================================================
          VISUAL HEADER (SLIDER, BADGES, FAVORITE)
      ========================================================== */}
      <div className="mjob-visual-header">
        {/* ---------- Image Slider ---------- */}
        <div
          className="mjob-slider-wrapper"
          style={{
            position: "relative",
            width: "100%",
            height: "190px",
          }}
        >
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="mjob-slide"
              style={{
                position: "absolute",
                inset: 0,
                display: activeImage === index ? "block" : "none",
              }}
            >
              <Image
                src={image}
                alt={`${service.title} ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 350px"
                style={{ objectFit: "cover" }}
                unoptimized={
                  typeof image === "string" &&
                  (image.startsWith("blob:") || image.startsWith("data:"))
                }
              />
            </div>
          ))}
        </div>

        {/* ---------- Slider Dots ---------- */}
        {images.length > 1 && (
          <div className="mjob-slider-dots">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={activeImage === index ? "dot active" : "dot"}
                onClick={(e) => handleDotClick(e, index)}
                aria-label={`Show image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* ---------- Seller Avatar + online/offline badge ---------- */}
        <div className="mjob-profile-box">
          <Image
            src={sellerInfo.avatar}
            alt={sellerInfo.name}
            width={36}
            height={36}
            className="mjob-avatar"
          />

          {/* Always show status pip: green = online, grey = offline */}
          <span
            className="mjob-status-badge"
            title={sellerInfo.online ? "Online" : "Offline"}
            aria-label={sellerInfo.online ? "Online" : "Offline"}
          />
        </div>

        {/* ---------- Marketplace Badges ---------- */}
        <div className="mjob-status-icons">
          {sellerInfo.verified && (
            <span
              className="m-status-circle verified-icon"
              title="Verified Seller"
            >
              <i className="fas fa-check-circle" />
            </span>
          )}

          {sellerInfo.pro && (
            <span className="m-status-circle pro-icon" title="Pro Seller">
              <i className="fas fa-award" />
            </span>
          )}

          {isFeatured && (
            <span
              className="m-status-circle featured-icon"
              title="Featured Service"
            >
              <i className="fas fa-fire" />
            </span>
          )}

          {isSponsored && (
            <span
              className="m-status-circle sponsored-icon"
              title="Sponsored"
            >
              <i className="fas fa-crown" />
            </span>
          )}
        </div>

        {/* ---------- Favorite Button ---------- */}
        <button
          type="button"
          className="mjob-favorite"
          onClick={handleFavoriteClick}
          aria-label={
            favorite ? "Remove from favourites" : "Add to favourites"
          }
        >
          <i className={favorite ? "fas fa-heart" : "far fa-heart"} />
        </button>

        {/* ---------- Category Tag ---------- */}
        <span className="mjob-category-tag">{category}</span>
      </div>

      {/* ==========================================================
          CARD CONTENT (LINKED AREA)
      ========================================================== */}
      <Link
        href={`/services/details/${serviceId}`}
        className="mjob-card-link"
      >
        <div className="mjob-content-area">
          {/* ---------- Stats Row ---------- */}
          <div className="mjob-stats-row">
            <div className="stat-item">
              <i className="fas fa-star" aria-hidden="true" />
              {hasReviews ? (
                <>
                  <span>{rating.toFixed(1)}</span>
                  <small>({reviewsCount})</small>
                </>
              ) : (
                <span title="No reviews yet">New</span>
              )}
            </div>

            <div className="stat-item">
              <i className="fas fa-clock icon-muted" aria-hidden="true" />
              <span>{delivery}</span>
            </div>

            <div className="stat-item">
              <i className="fas fa-award icon-muted" aria-hidden="true" />
              <span>{sellerInfo.level}</span>
            </div>
          </div>

          {/* ---------- Title ---------- */}
          <h3 className="mjob-title">{service.title}</h3>

          {/* ---------- Seller Meta ---------- */}
          <div className="mjob-user-meta">
            <span className="mjob-username">
              <i className="fas fa-user m-icon" aria-hidden="true" />
              {sellerInfo.name}
            </span>

            <span className="mjob-location">
              <i className="fas fa-map-marker-alt" aria-hidden="true" />
              {location}
            </span>
          </div>

          {/* ---------- Footer Price ---------- */}
          <div className="mjob-footer-price">
            <span className="mjob-level">{sellerInfo.level}</span>
            <span className="mjob-price">{formattedPrice}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
