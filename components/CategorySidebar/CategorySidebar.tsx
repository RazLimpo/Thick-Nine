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
    image: "/images/categorysidebar/watch.png",
    className: "bg-writing"
  },
  {
    name: "Music-and-Audio",
    label: "Acoustic",
    displayTitle: "Music & Audio",
    image: "/images/categorysidebar/watch.png",
    className: "bg-music"
  },
  {
    name: "Digital-Marketing",
    label: "Growth",
    displayTitle: "Digital Marketing",
    image: "/images/categorysidebar/watch.png",
    className: "bg-marketing"
  },
  {
    name: "Business",
    label: "Professional",
    displayTitle: "Business Services",
    image: "/images/categorysidebar/watch.png",
    className: "bg-business"
  },
  {
    name: "Data-Science",
    label: "Analysis",
    displayTitle: "Data & Analytics",
    image: "/images/categorysidebar/watch.png",
    className: "bg-data"
  },
  {
    name: "Travelling",
    label: "Explore",
    displayTitle: "Travelling Services",
    image: "/images/categorysidebar/watch.png",
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

              {/* CLEANED WRAPPER: Styles now managed in index.css */}
              <div className="cat-widget-img-wrapper">
                <Image
                  src={category.image}
                  alt={category.displayTitle}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }} /* Changed 'contain' to 'cover' to fill the card */
                  priority={category.name === "Graphics" || category.name === "Programming"}
                />
              </div>
            </div>
          </Link>
        ))}

        <TrendingWidget />
        
      </div>
    </aside>
  );
}