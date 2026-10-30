// components/SearchResults/SponsoredCarousel.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export type SponsoredAd = {
  id: string;
  title: string;
  price: string;
  username: string;
  gender?: "male" | "female";
  imageUrl: string;
  linkUrl: string;
  /** Optional — defaults to Sponsored for backward compat */
  badge?: "Sponsored" | "Featured";
};

const INTERVAL_MS = 10_000; // 10 seconds per slide (agreed)

type Props = {
  ads?: SponsoredAd[];
  /** Section title when featured fallback */
  mode?: "sponsored" | "featured" | "empty";
};

export default function SponsoredCarousel({ ads, mode }: Props) {
  const list = Array.isArray(ads) ? ads.filter((a) => a?.id) : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const resolvedMode =
    mode ||
    (list.some((a) => a.badge === "Featured") &&
    !list.some((a) => a.badge === "Sponsored")
      ? "featured"
      : "sponsored");

  const go = useCallback(
    (dir: 1 | -1) => {
      if (list.length <= 1) return;
      setIndex((i) => (i + dir + list.length) % list.length);
    },
    [list.length]
  );

  useEffect(() => {
    setIndex(0);
  }, [list.length, resolvedMode]);

  useEffect(() => {
    if (list.length <= 1 || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [list.length, paused]);

  if (list.length === 0) return null;

  const sectionLabel =
    resolvedMode === "featured" ? "Featured" : "Sponsored";
  const sectionHint =
    resolvedMode === "featured"
      ? "Top performing services on Thick 9"
      : "Promoted services matched your search";

  return (
    <div
      className="sponsored-carousel-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="sponsored-carousel-header">
        <span className="sponsored-carousel-title">
          <i
            className={
              resolvedMode === "featured"
                ? "fas fa-fire"
                : "fas fa-bullhorn"
            }
            aria-hidden
          />{" "}
          {sectionLabel}
        </span>
        <span className="sponsored-carousel-hint">{sectionHint}</span>
        {list.length > 1 && (
          <div className="sponsored-carousel-nav">
            <button
              type="button"
              className="sponsored-nav-btn"
              aria-label="Previous"
              onClick={() => go(-1)}
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              type="button"
              className="sponsored-nav-btn"
              aria-label="Next"
              onClick={() => go(1)}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      <div className="sponsored-carousel" role="region" aria-roledescription="carousel">
        <div
          className="ad-inner-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {list.map((ad) => {
            const badge = ad.badge || (resolvedMode === "featured" ? "Featured" : "Sponsored");
            return (
              <div
                key={ad.id}
                className="ad-item"
                style={{
                  backgroundImage: `url(${ad.imageUrl || "/default-service.png"})`,
                }}
              >
                <span
                  className={`sponsored-badge ${
                    badge === "Featured" ? "is-featured" : "is-sponsored"
                  }`}
                >
                  {badge}
                </span>
                <Link href={ad.linkUrl} className="ad-permanent-info">
                  <h3 className="ad-title">{ad.title}</h3>
                  <div className="ad-meta">
                    <span className="mjob-username">
                      <i
                        className={`fas fa-user ${
                          ad.gender === "female" ? "f-icon" : "m-icon"
                        }`}
                      />
                      {ad.username}
                    </span>
                    <span className="ad-price">
                      From ${Number(ad.price || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {list.length > 1 && (
          <div className="sponsored-dots" aria-hidden>
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`dot ${i === index ? "active" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
