import "../styles/pages/global.css";         // 1. Load variables and resets first
import "../styles/pages/header.css";         // 2. Load header-specific styles
import Header from "@/components/Header/Header";

export const metadata = {
  title: "Thick 9 | Freelancing Marketplace",
  description: "Unlock your professional potential today.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}