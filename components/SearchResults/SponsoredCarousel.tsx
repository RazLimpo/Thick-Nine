//SponsoredCarousel.

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export interface SponsoredAd {
  id: string;
  title: string;
  price: string;
  username: string;
  gender?: "male" | "female";
  imageUrl: string;
  linkUrl?: string;
}

interface SponsoredCarouselProps {
  ads?: SponsoredAd[];
  autoPlayInterval?: number;
}

// Fallback ads while backend data is unavailable
const DEFAULT_ADS: SponsoredAd[] = [
  {
    id: "1",
    title: "Professional Web Development & UI Design",
    price: "$150",
    username: "AlexDev",
    gender: "male",
    imageUrl:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    linkUrl: "/service-details",
  },
  {
    id: "2",
    title: "Custom Logo & Brand Identity Design",
    price: "$85",
    username: "SarahDesigns",
    gender: "female",
    imageUrl:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
    linkUrl: "/service-details",
  },
];

export default function SponsoredCarousel({
  ads = DEFAULT_ADS,
  autoPlayInterval = 4000,
}: SponsoredCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [ads, autoPlayInterval]);

  if (ads.length === 0) return null;

  return (
    <div
      className="sponsored-carousel"
      aria-label="Sponsored marketplace services"
    >
      <span className="sponsored-badge">Sponsored</span>

      <div
        className="ad-inner-track"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {ads.map((ad) => (
          <Link
            key={ad.id}
            href={ad.linkUrl ?? "/service-details"}
            className="ad-item"
            style={{
              backgroundImage: `url(${ad.imageUrl || "/default-service.png"})`,
            }}
            aria-label={`View sponsored service: ${ad.title}`}
          >
            <div className="ad-permanent-info">
             <div className="ad-meta">
  <span className="mjob-username">
    <i
      className={`fas fa-user ${
        ad.gender === "female" ? "f-icon" : "m-icon"
      }`}
      aria-hidden="true"
    />{" "}
    {ad.username}
  </span>

  <span className="ad-price">
    {ad.price}
  </span>
</div>
              <div className="ad-title">
                {ad.title}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}