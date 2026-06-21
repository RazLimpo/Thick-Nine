import "@/styles/pages/global.css";         // 1. Load variables and resets first
import "@/styles/pages/index.css";
import "@/styles/pages/service-card.css";
import { BRAND } from '../lib/constants';
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

import type { Metadata } from "next";


export const metadata: Metadata = {
  title: `${BRAND.pretty} - Freelancing Marketplace`,
  description: "Unlock your professional potential today.",
  icons: {
    icon: "/favicon.ico", 
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        
        <div className="main-content-wrapper">
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}