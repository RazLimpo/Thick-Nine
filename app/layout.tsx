import "@/styles/pages/global.css";         // 1. Load variables and resets first
import "@/styles/pages/header.css";         // 2. Load header-specific styles
import "@/styles/pages/footer.css";
import { BRAND } from '../lib/constants';
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";


export const metadata = {
  title: `${BRAND.pretty} - Freelancing Marketplace`,
  description: "Unlock your professional potential today.",
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