'use client';

import { useState } from "react";
import Link from "next/link";
import { Service } from "@/types/service";

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const {
    id,
    title,
    seller,
    location,
    price,
    rating,
    deliveryTime,
    level,
    category,
    images = [],
    avatar,
    isOnline = false,
    featured = false,
    sponsored = false,
  } = service;

  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);

  // Core array fallbacks for defensive rendering
  const displayImages = images.length > 0 ? images : ["/default-service.png"];

  return (
    <div className={`mjob-card status-${isOnline ? 'online' : 'offline'}`}>
      <div className="mjob-visual-header">
        <div className="mjob-slider-wrapper">
          {displayImages.map((image, index) => (
            <div
              key={`${image}-${index}`} // ✅ FIXED: Stripped broken backslash-parentheses syntax
              className="mjob-slide"
              onClick={() => setActiveImage(index)}
              style={{
                backgroundImage: `url(${image})`,
                display: index === activeImage ? "block" : "none",
              }}
            />
          ))}
        </div>

        {displayImages.length > 1 && (
          <div className="mjob-slider-dots">
            {displayImages.map((_, index) => (
              <span
                key={index}
                className={index === activeImage ? "dot active" : "dot"}
                onClick={() => setActiveImage(index)}
              />
            ))}
          </div>
        )}

        <div className="mjob-profile-box">
          <img src={avatar || "/default-avatar.png"} alt={seller} />
          <span className="mjob-status-badge" />
        </div>

        <div className="mjob-status-icons">
          {sponsored && (
            <span className="m-status-circle sponsored-icon" data-tooltip="Trending: High Recent Views">
              <i className="fas fa-fire" />
            </span>
          )}
          {featured && (
            <span className="m-status-circle featured-icon" data-tooltip="Top Rated: High Sales Volume">
              <i className="fas fa-crown" />
            </span>
          )}
        </div>

        <button
          className="mjob-favorite"
          onClick={() => setFavorite(!favorite)}
          aria-label="Favorite service"
        >
          <i className={favorite ? "fas fa-heart" : "far fa-heart"} />
        </button>

        <span className="mjob-category-tag">{category}</span>
      </div>

      <Link href={`/services/${id}`} className="mjob-card-link">
        <div className="mjob-content-area">
          <div className="mjob-stats-row">
            <div className="stat-item">
              <i className="fas fa-star" />
              {(rating || 0).toFixed(1)}
            </div>

            <div className="stat-item">
              <i className="fas fa-clock icon-muted" />
              {deliveryTime === 1 ? "1 Day" : `${deliveryTime || 3} Days`}
            </div>

            <div className="stat-item">
              <i className="fas fa-award icon-muted" />
              {level}
            </div>
          </div>

          <h3 className="mjob-title">{title}</h3>

          <div className="mjob-user-meta">
            <span className="mjob-username">
              <i className="fas fa-user m-icon" /> {seller}
            </span>
            <span className="mjob-location">
              <i className="fas fa-map-marker-alt" /> {location}
            </span>
          </div>

          <div className="mjob-footer-price">
            <span className="mjob-level">{level}</span>
            <span className="mjob-price">${price}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}