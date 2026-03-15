import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import SmoothScroll from "./components/SmoothScroll";
import "lenis/dist/lenis.css";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Metamax | Free SEO + Performance Audits",
  description: "Analyze any website and get SEO, Lighthouse, and Core Web Vitals checks in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#eef0f6] text-[#0A0A0F]">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
