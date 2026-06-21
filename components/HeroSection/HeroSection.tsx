'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HeroSlide {
  id: number;
  className: string;
  headline: string;
  categories: string[];
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    className: 'slide-1',
    headline: 'Build your brand identity now.',
    categories: ['Logo Design', 'Brand Identity', 'Packaging Design', 'UI/UX Design'],
  },
  {
    id: 2,
    className: 'slide-2',
    headline: 'Expert web developers are ready to code.',
    categories: ['eCommerce', 'WordPress', 'Web Apps', 'QA & Testing'],
  },
  {
    id: 3,
    className: 'slide-3',
    headline: 'Skyrocket your traffic with digital marketing pros.',
    categories: ['SEO', 'Social Media', 'Content Marketing', 'Lead Generation'],
  },
];

export default function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((previous) =>
        previous === heroSlides.length - 1 ? 0 : previous + 1
      );
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-section" id="hero-slider" style={{ position: 'relative', overflow: 'hidden', height: '450px' }}>
      
      {/* Content Overlay */}
      {/* ✅ Fixed inline-style string values below (width: '100%') */}
      <div className="hero-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
        <h1 className="hero-main-title">Digital Deals</h1>
        <p className="hero-dynamic-text" id="dynamic-headline">
          {heroSlides[currentIndex].headline}
        </p>

        <div className="hero-buttons">
          <Link href="/jobs">Hire Talent</Link>
          <Link href="/search-results">Find Work</Link>
        </div>
      </div>

      {/* Track - Explicitly forcing horizontal layout alignment */}
      <div
        className="hero-track"
        style={{
          display: 'flex',
          width: `${heroSlides.length * 100}%`,
          height: '100%',
          transform: `translateX(-${(currentIndex * 100) / heroSlides.length}%)`,
          transition: 'transform 1.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
        }}
      >
        {heroSlides.map((slide) => (
          <div
            key={slide.id}
            className={`hero-slide ${slide.className}`}
            style={{
              flex: 1,
              height: '100%',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="slide-category-bar">
              {slide.categories.map((category) => (
                <Link href={`/search-results?q=${encodeURIComponent(category)}`} key={category}>
                  {category}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}