'use client';

import Image from "next/image";
import Link from "next/link";
import TrendingWidget from "@/components/TrendingWidget/TrendingWidget";

interface Category {
  name: string;         // Used for backend database URL search parameters
  label: string;        // The clean upper tag (e.g., "EXPLORE", "CREATIVE")
  displayTitle: string; // The full, descriptive title shown on your UI card
  image: string;        // Asset path inside public/ directory
  className: string;    // Matches your background color classes in index.css
}

const categories: Category[] = [
  {
    name: "Graphics",
    label: "Creative",
    displayTitle: "Graphic Designing",
    image: "/images/categorysidebar/watch.png",
    className: "bg-graphics"
  },
  {
    name: "Programming",
    label: "Solutions",
    displayTitle: "Programming & Tech",
    image: "/images/categorysidebar/watch.png",
    className: "bg-programming"
  },
  {
    name: "Video",
    label: "Motion",
    displayTitle: "Video 'n' Animation",
    image: "/images/categorysidebar/watch.png",
    className: "bg-video"
  },
  {
    name: "Writing",
    label: "Contents",
    displayTitle: "Writing & Translation",
    image: "/images/categorysidebar/dig4.png",
    className: "bg-writing"
  },
  {
    name: "Music-and-Audio",
    label: "Acoustic",
    displayTitle: "Music & Audio",
    image: "/images/categorysidebar/music.png",
    className: "bg-music"
  },
  {
    name: "Digital-Marketing",
    label: "Growth",
    displayTitle: "Digital Marketing",
    image: "/images/categorysidebar/dig1.png",
    className: "bg-marketing"
  },
  {
    name: "Business",
    label: "Professional",
    displayTitle: "Business Services",
    image: "/images/categorysidebar/3.png",
    className: "bg-business"
  },
  {
    name: "Data-Science",
    label: "Analysis",
    displayTitle: "Data & Analytics",
    image: "/images/categorysidebar/dig4.png",
    className: "bg-data"
  },
  {
    name: "Travelling",
    label: "Explore",
    displayTitle: "Travelling Services",
    image: "/images/categorysidebar/travelling.png",
    className: "bg-travelling"
  },
  {
    name: "Lifestyle",
    label: "Lifestyle",
    displayTitle: "Lifestyle Gigs",
    image: "/images/categorysidebar/watch.png",
    className: "bg-lifestyle"
  },
  {
    name: "Miscellaneous",
    label: "General",
    displayTitle: "Other Miscellaneous",
    image: "/images/categorysidebar/watch.png",
    className: "bg-misc"
  }
];

export default function CategorySidebar() {
  return (
    <aside className="homepage-sidebar">
      <div className="sidebar-sticky-wrapper">
        
        <h3 className="sidebar-main-title">Explore Categories</h3>

        {categories.map((category) => (
          <Link
            key={category.name}
            href={`/search-results?category=${encodeURIComponent(category.name)}`}
            className="cat-widget-link"
          >
            <div className={`cat-widget ${category.className}`}>
              <div className="cat-widget-text">
                <span>{category.label}</span>
                <h4>{category.displayTitle}</h4>
              </div>

              {/* Next.js Optimized Image inheriting your fluid CSS aspect ratios */}
              <div style={{ position: 'absolute', right: '5px', bottom: '0', height: '90%', width: '120px' }}>
                <Image
                  src={category.image}
                  alt={category.displayTitle}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'contain', objectPosition: 'bottom right' }}
                  priority={category.name === "Graphics" || category.name === "Programming"}
                />
              </div>
            </div>
          </Link>
        ))}

        {/* Trending Glassmorphic List Container */}
        <TrendingWidget />
        
      </div>
    </aside>
  );
}