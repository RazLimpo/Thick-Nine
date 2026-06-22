'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubCategoryMapping {
  name: string;
  parentCategory: string;
}

interface HeroSlide {
  id: number;
  className: string;
  headline: string;
  categories: SubCategoryMapping[];
}

const heroSlides: HeroSlide[] = [
  {
    id: 1,
    className: 'slide-1',
    headline: 'Build your brand identity now.',
    categories: [
      { name: 'Logo Design', parentCategory: 'Graphics & Design' },
      { name: 'Brand Identity', parentCategory: 'Graphics & Design' },
      { name: 'Packaging Design', parentCategory: 'Graphics & Design' },
      { name: 'UI/UX Design', parentCategory: 'Graphics & Design' },
    ],
  },
  {
    id: 2,
    className: 'slide-2',
    headline: 'Expert web developers are ready to code.',
    categories: [
      { name: 'eCommerce', parentCategory: 'Programming & Tech' },
      { name: 'WordPress', parentCategory: 'Programming & Tech' },
      { name: 'Web Apps', parentCategory: 'Programming & Tech' },
      { name: 'QA & Testing', parentCategory: 'Programming & Tech' },
    ],
  },
  {
    id: 3,
    className: 'slide-3',
    headline: 'Skyrocket your traffic with digital marketing pros.',
    categories: [
      { name: 'SEO', parentCategory: 'Digital Marketing' },
      { name: 'Social Media', parentCategory: 'Digital Marketing' },
      { name: 'Content Marketing', parentCategory: 'Digital Marketing' },
      { name: 'Lead Generation', parentCategory: 'Digital Marketing' },
    ],
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

      {/* Track */}
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
            {/* Maintained inside the track layout loop to preserve your eye-catching sliding transitions */}
            <div className="slide-category-bar">
              {slide.categories.map((cat) => (
                <Link 
                  href={`/search-results?category=${encodeURIComponent(cat.parentCategory)}&subcategory=${encodeURIComponent(cat.name)}`} 
                  key={cat.name}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}