"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
  onFavoriteToggle?: (serviceId: string, isFavorited: boolean) => void;
}

export default function ServiceCard({
  service,
  onFavoriteToggle,
}: ServiceCardProps) {
  /* ==========================================================
     BACKEND DATA MAPPING & FALLBACKS
     ========================================================== */

  const serviceId = service.id ?? service._id ?? "";

  // ---------- Images ----------
  const images =
    service.images && service.images.length > 0
      ? service.images
      : ["/default-service.png"];

  const [activeImage, setActiveImage] = useState(0);

  // ---------- Seller ----------
  const seller = service.sellerId;

  const sellerName =
    seller?.fullName || service.sellerName || "Freelancer";

  const sellerAvatar =
    seller?.avatar || service.sellerAvatar || "/default-avatar.png";

  // ---------- Location ----------
  const city = seller?.location?.city;
  const country = seller?.location?.country;

  const location =
    city && country
      ? `${city}, ${country}`
      : city || country || "Remote";

  // ---------- Pricing ----------
  const formattedPrice =
    typeof service.price === "number"
      ? `$${service.price}`
      : service.price || "$0";

  // ---------- Ratings ----------
  const rating = service.rating ?? 5.0;
  const reviewsCount = service.reviewsCount ?? 0;

  // ---------- Seller Level & Delivery ----------
  const sellerLevel = seller?.level || service.level || "New Seller";
  const delivery = service.deliveryTime || "3 Days";

  // ---------- Category ----------
  const category = service.category || "General";

  // ---------- Seller Status ----------
  const isOnline = seller?.onlineStatus === "online";
  const isVerified = seller?.isVerified ?? false;
  const isPro = seller?.planType === "gold" || seller?.planType === "silver";

  // ---------- Marketplace Badges ----------
  const isSponsored = service.isSponsored ?? false;
  const isFeatured = service.isFeatured ?? false;

  // ---------- Favourite ----------
  const [favorite, setFavorite] = useState(service.isFavorited ?? false);

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !favorite;
    setFavorite(nextState);
    onFavoriteToggle?.(serviceId, nextState);
  };

  const handleDotClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  };

  return (
    <article
      className={`mjob-card ${
        isOnline ? "status-online" : "status-offline"
      }`}
    >
      {/* ==========================================================
          VISUAL HEADER
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

        {/* ---------- Seller Avatar ---------- */}
        <div className="mjob-profile-box">
          <Image
            src={sellerAvatar}
            alt={sellerName}
            width={36}
            height={36}
            className="mjob-avatar"
          />
          {isOnline && (
            <span className="mjob-status-badge" title="Online" />
          )}
        </div>

        {/* ---------- Top Right Status Icons ---------- */}
        <div className="mjob-status-icons">
          {isVerified && (
            <span
              className="m-status-circle verified-icon"
              title="Verified Seller"
            >
              <i className="fas fa-check-circle" />
            </span>
          )}

          {isPro && (
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

        {/* ---------- Favourite ---------- */}
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

        {/* ---------- Category ---------- */}
        <span className="mjob-category-tag">{category}</span>
      </div>

      {/* ==========================================================
          CARD CONTENT LINK
      ========================================================== */}
      <Link href={`/services/${serviceId}`} className="mjob-card-link">
        <div className="mjob-content-area">
          {/* ---------- Top Statistics ---------- */}
          <div className="mjob-stats-row">
            <div className="stat-item">
              <i className="fas fa-star" aria-hidden="true" />
              <span>{rating.toFixed(1)}</span>
              {reviewsCount > 0 && <small>({reviewsCount})</small>}
            </div>

            <div className="stat-item">
              <i
                className="fas fa-clock icon-muted"
                aria-hidden="true"
              />
              <span>{delivery}</span>
            </div>

            <div className="stat-item">
              <i
                className="fas fa-award icon-muted"
                aria-hidden="true"
              />
              <span>{sellerLevel}</span>
            </div>
          </div>

          {/* ---------- Service Title ---------- */}
          <h3 className="mjob-title">{service.title}</h3>

          {/* ---------- Seller Information ---------- */}
          <div className="mjob-user-meta">
            <span className="mjob-username">
              <i className="fas fa-user m-icon" aria-hidden="true" />
              {sellerName}
            </span>

            <span className="mjob-location">
              <i className="fas fa-map-marker-alt" aria-hidden="true" />
              {location}
            </span>
          </div>

          {/* ---------- Bottom Footer ---------- */}
          <div className="mjob-footer-price">
            <span className="mjob-level">{sellerLevel}</span>
            <span className="mjob-price">{formattedPrice}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}