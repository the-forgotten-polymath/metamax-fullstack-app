"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.09,
      wheelMultiplier: 0.8,
      touchMultiplier: 1,
      overscroll: false,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}
