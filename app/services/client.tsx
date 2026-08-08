'use client';

import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import '@/styles/pages/services.css';

export default function ServicesClient() {
  return (
    <main className="services-container">
      <header className="services-header">
        <h1>Explore All Categories</h1>
        <p>Browse through all available service categories and specialized skills.</p>
      </header>

      <div className="categories-grid">
        {Object.entries(CATEGORIES).map(([slug, category]) => (
          <div key={slug} className="category-card">
            <h2 className="category-title">
              <Link href={`/services/${slug}`}>
                {category.label}
              </Link>
            </h2>

            <ul className="subcategory-list">
              {category.subcategories.slice(0, 6).map((sub) => (
                <li key={sub} className="subcategory-item">
                  {sub}
                </li>
              ))}
            </ul>

            {category.subcategories.length > 6 && (
              <Link href={`/services/${slug}`} className="more-link">
                + {category.subcategories.length - 6} more
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}