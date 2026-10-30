// components/Home/HomePromoStrip.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import ServiceCard from "@/components/ServiceCard/ServiceCard";
import { useServices } from "@/hooks/useServices";
import {
  pickPromoServices,
  buildWrapPages,
  HOME_PROMO_PAGE_SIZE,
} from "@/lib/marketplace/promoSlot";
import type { Service } from "@/types/service";

const INTERVAL_MS = 10_000; // 10s per page of cards

/**
 * Homepage promo strip:
 * - Paid Sponsored if any
 * - Else Featured top performers
 * - 5 cards per page, auto-advance 10s, wrap-fill last page, pause on hover
 * - Hidden when empty
 */
export default function HomePromoStrip() {
  const { services, loading } = useServices();
  const promo = useMemo(
    () => pickPromoServices(services || []),
    [services]
  );

  const pages = useMemo(
    () => buildWrapPages(promo.services, HOME_PROMO_PAGE_SIZE),
    [promo.services]
  );

  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPageIndex(0);
  }, [pages.length, promo.mode]);

  useEffect(() => {
    if (pages.length <= 1 || paused) return;
    const t = window.setInterval(() => {
      setPageIndex((i) => (i + 1) % pages.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [pages.length, paused]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (pages.length <= 1) return;
      setPageIndex((i) => (i + dir + pages.length) % pages.length);
    },
    [pages.length]
  );

  if (loading || promo.mode === "empty" || pages.length === 0) {
    return null;
  }

  const label = promo.mode === "featured" ? "Featured" : "Sponsored";
  const hint =
    promo.mode === "featured"
      ? "Top performing services on Thick 9"
      : "Promoted services";
  const current: Service[] = pages[pageIndex] || [];

  return (
    <section
      className="home-promo-strip"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="home-promo-inner">
        <div className="home-promo-header">
          <div className="home-promo-heading">
            <h2 className="home-promo-title">
              <i
                className={
                  promo.mode === "featured"
                    ? "fas fa-fire"
                    : "fas fa-bullhorn"
                }
                aria-hidden
              />{" "}
              {label}
            </h2>
            <p className="home-promo-hint">{hint}</p>
          </div>

          {pages.length > 1 && (
            <div className="home-promo-nav">
              <button
                type="button"
                className="home-promo-nav-btn"
                aria-label="Previous"
                onClick={() => go(-1)}
              >
                <i className="fas fa-chevron-left" />
              </button>
              <span className="home-promo-page-indicator">
                {pageIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                className="home-promo-nav-btn"
                aria-label="Next"
                onClick={() => go(1)}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </div>

        <div className="home-promo-grid" key={pageIndex}>
          {current.map((svc) => {
            const id = String(svc.id ?? svc._id ?? "");
            // Ensure badge flags match strip mode for ServiceCard icons
            const cardService: Service = {
              ...svc,
              isSponsored: promo.mode === "sponsored",
              isFeatured:
                promo.mode === "featured" || Boolean(svc.isFeatured),
            };
            return (
              <div key={id} className="home-promo-card-wrap">
                <ServiceCard service={cardService} />
              </div>
            );
          })}
        </div>

        {pages.length > 1 && (
          <div className="home-promo-dots" aria-hidden>
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`home-promo-dot ${i === pageIndex ? "active" : ""}`}
                onClick={() => setPageIndex(i)}
              />
            ))}
          </div>
        )}

        <div className="home-promo-footer">
          <Link href="/search-results" className="home-promo-view-all">
            Browse all services →
          </Link>
        </div>
      </div>
    </section>
  );
}
