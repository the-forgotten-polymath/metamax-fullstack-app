"use client";

import { useEffect, useState } from "react";

type ScoreRingProps = {
  score?: number | null;
  size: number;
  strokeWidth: number;
  label: string;
};

export function scoreColor(score: number) {
  if (score >= 80) return "#21A67A";
  if (score >= 50) return "#B9822D";
  return "#C84E4E";
}

export function scoreTextColor(score: number) {
  if (score >= 80) return "text-[#16A34A]";
  if (score >= 50) return "text-[#D97706]";
  return "text-[#DC2626]";
}

export function scoreRating(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
}

export default function ScoreRing({ score, size, strokeWidth, label }: ScoreRingProps) {
  const [mounted, setMounted] = useState(false);
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const normalizedScore = hasScore ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (mounted ? normalizedScore / 100 : 0) * circumference;
  const color = hasScore ? scoreColor(normalizedScore) : "#CBD5E1";
  const sizeClass =
    size >= 120
      ? "h-[104px] w-[104px] sm:h-[120px] sm:w-[120px]"
      : size >= 80
        ? "h-16 w-16 sm:h-20 sm:w-20"
        : "h-14 w-14 sm:h-16 sm:w-16";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [normalizedScore]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative ${sizeClass}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-light text-[#0A0A0F] ${
            size >= 100 ? "text-4xl sm:text-5xl" : size >= 80 ? "text-xl sm:text-2xl" : "text-sm sm:text-base"
          }`}
        >
          {hasScore ? normalizedScore : "n/a"}
        </span>
      </div>
      <p className="mt-2 text-xs font-light text-[#4B5563] sm:mt-3 sm:text-sm">{label}</p>
    </div>
  );
}
