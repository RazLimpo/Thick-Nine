'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/styles/pages/footer.css';

export default function Footer() {
  // We use state for the year to avoid "Hydration" errors in Next.js
  const [year, setYear] = useState<number>(new Date().getFullYear());

  return (
    <footer className="main-footer">
      <div className="footer-content-wrapper">
        
        {/* Branding Column */}
        <div className="footer-column branding-column">
          <div className="logo">Thick 9</div>
          <p className="tagline">Connecting talent with opportunity worldwide.</p>
          <div className="social-icons">
            <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
            <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
            <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
          </div>
        </div>

        {/* Explore Column */}
        <div className="footer-column">
          <h3>Explore</h3>
          <ul>
            <li><Link href="/services/graphics">Graphics & Design</Link></li>
            <li><Link href="/services/web-dev">Web Development</Link></li>
            <li><Link href="/services/marketing">Digital Marketing</Link></li>
            <li><Link href="/services/writing">Writing & Translation</Link></li>
          </ul>
        </div>

        {/* About Column */}
        <div className="footer-column">
          <h3>About</h3>
          <ul>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/news">Press & News</Link></li>
            <li><Link href="/partners">Partnerships</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>

        {/* Support Column */}
        <div className="footer-column">
          <h3>Support</h3>
          <ul>
            <li><Link href="/help">Help & Support Center</Link></li>
            <li><Link href="/safety">Trust & Safety</Link></li>
            <li><Link href="/selling">Selling on Thick 9</Link></li>
            <li><Link href="/buying">Buying on Thick 9</Link></li>
          </ul>
        </div>

      </div>

      <div className="footer-bottom-row">
         <p>&copy; <span>{year}</span> Thick 9 Marketplace. All Rights Reserved.</p>
      </div>
    </footer>
  );
}