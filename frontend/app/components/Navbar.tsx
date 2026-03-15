"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type NavbarProps = {
  children?: ReactNode;
  variant?: "default" | "home";
};

const tools = [
  "SEO Audit",
  "Performance",
  "Core Web Vitals",
  "Lighthouse",
  "Metadata",
  "Broken Links",
  "Robots.txt",
  "Sitemap",
  "Accessibility",
  "Best Practices",
];

export default function Navbar({ children, variant = "default" }: NavbarProps) {
  const isHome = variant === "home";

  return (
    <header
      className={
        isHome
          ? "absolute left-0 top-0 z-50 w-full border-b border-white/55 bg-white/32 px-4 shadow-[0_1px_0_rgba(255,255,255,0.38),0_18px_60px_rgba(15,23,42,0.05)] backdrop-blur-[30px] sm:px-6"
          : "sticky top-0 z-50 border-b border-white/55 bg-white/34 shadow-[0_1px_0_rgba(255,255,255,0.38),0_18px_60px_rgba(15,23,42,0.05)] backdrop-blur-[30px]"
      }
    >
      <div className={`mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-2 max-[360px]:h-12 sm:gap-4 ${isHome ? "" : "px-3 sm:px-8"}`}>
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/metamaxx.png" alt="Metamax logo" width={28} height={28} className="h-5 w-auto sm:h-6" priority />
          <span className="text-[15px] font-medium text-[#0A0A0F] max-[360px]:hidden">Metamax</span>
        </Link>

        {children ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <div className="hidden min-w-0 flex-1 justify-end md:flex">{children}</div>
            <ToolsDropdown />
            <Link
              href="/scan"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#090A12] px-3 text-[12px] font-normal text-white transition hover:bg-[#1A1B24] sm:h-9 sm:gap-2 sm:px-4 sm:text-[13px] md:hidden"
            >
              Scan
              <ArrowRight size={14} strokeWidth={1.8} />
            </Link>
          </div>
        ) : (
          <nav className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label={isHome ? "Homepage navigation" : "Main navigation"}>
            <ToolsDropdown />
            <Link
              href="/scan"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#090A12] px-3 text-[12px] font-normal text-white transition hover:bg-[#1A1B24] sm:h-9 sm:gap-2 sm:px-4 sm:text-[13px]"
            >
              Scan
              <ArrowRight size={14} strokeWidth={1.8} />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function ToolsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/55 bg-white/26 px-2.5 text-[12px] font-light text-[#0A0A0F] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-[28px] transition hover:bg-white/44 sm:h-9 sm:px-3 sm:text-[13px]"
      >
        Tools
        <ChevronDown size={14} strokeWidth={1.8} className={`transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[336px] max-w-[calc(100vw-1.5rem)] rounded-lg border border-white/70 bg-[rgba(255,255,255,0.97)] p-2.5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-[34px] max-[340px]:fixed max-[340px]:left-3 max-[340px]:right-3 max-[340px]:top-12 max-[340px]:mt-2 max-[340px]:w-auto max-[340px]:max-w-none">
          <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2 min-[340px]:gap-2.5">
            {tools.map((tool) => (
              <Link
                key={tool}
                href="/scan"
                onClick={() => setIsOpen(false)}
                className="min-w-0 rounded-md border border-white/0 px-3 py-2.5 text-[13px] font-light text-[#111827] transition hover:border-white/70 hover:bg-white/58 min-[340px]:py-3"
              >
                {tool}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
