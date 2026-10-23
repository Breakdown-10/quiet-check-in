import React from 'react';

interface HeroLandscapeIllustrationProps {
  className?: string;
}

export function HeroLandscapeIllustration({ className = '' }: HeroLandscapeIllustrationProps) {
  return (
    <div
      className={`pointer-events-none select-none absolute right-0 top-0 bottom-0 w-full sm:w-[480px] md:w-[520px] overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 520 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-right"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          {/* Sky blend gradient */}
          <linearGradient id="skyGrad" x1="0" y1="0" x2="520" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#eaf4fe" stopOpacity="0" />
            <stop offset="35%" stopColor="#e0effe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.8" />
          </linearGradient>

          {/* Warm Sun gradient */}
          <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#FDE047" />
          </linearGradient>

          {/* Hill gradients */}
          <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          <linearGradient id="hillFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="60%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* House gradient */}
          <linearGradient id="houseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Cloud gradient */}
          <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.88" />
          </linearGradient>
        </defs>

        {/* Soft Background Tint */}
        <rect width="520" height="240" fill="url(#skyGrad)" />

        {/* Soft Warm Rising Sun */}
        <circle cx="430" cy="75" r="42" fill="url(#sunGrad)" opacity="0.92" />
        <circle cx="430" cy="75" r="58" fill="#FEF08A" opacity="0.3" filter="blur(12px)" />

        {/* Soft Floating Clouds */}
        <g fill="url(#cloudGrad)">
          {/* Cloud 1 right */}
          <path d="M440 68c0-10 8-18 18-18 3 0 5 .8 7 1.8 3.5-7 11-12.8 19.5-12.8 12.5 0 22 9 23 21 2-1 4.5-1 6.5-1 10 0 18 8 18 18 0 1.5-.2 2.8-.5 4.5H440z" />
          {/* Cloud 2 mid */}
          <path d="M330 82c0-7.5 6-13.5 13.5-13.5 2 0 3.5.5 5 1.5 2.5-5.5 8-9.5 14.5-9.5 9.5 0 17 6.5 17.5 15 1.5-.5 3-.5 4.5-.5 7.5 0 13.5 6 13.5 13.5 0 1.2-.2 2.2-.4 3.5H330z" opacity="0.88" />
        </g>

        {/* Background Rolling Hill (Pastel Mint) */}
        <path
          d="M200 240 C280 180 360 145 440 155 C475 160 500 175 520 190 L520 240 Z"
          fill="url(#hillBack)"
        />

        {/* Midground Rolling Hill (Pastel Cyan / Sky) */}
        <path
          d="M280 240 C340 195 400 170 470 185 C495 192 510 205 520 215 L520 240 Z"
          fill="url(#hillMid)"
          opacity="0.85"
        />

        {/* Minimalist Blue House Silhouette on Right Side */}
        <g id="houseSilhouette" transform="translate(425, 112)">
          {/* Chimney */}
          <rect x="58" y="12" width="9" height="20" rx="1.5" fill="url(#houseGrad)" />
          {/* Main House Roof */}
          <polygon points="38,0 76,30 0,30" fill="url(#houseGrad)" />
          {/* Main House Body */}
          <rect x="7" y="30" width="62" height="58" rx="2" fill="url(#houseGrad)" />
          {/* Left Wing / Annex */}
          <rect x="-18" y="45" width="25" height="43" rx="2" fill="url(#houseGrad)" />
          {/* Door / Arch Cutout */}
          <path d="M29 88 V64 C29 59 32.5 55 38 55 C43.5 55 47 59 47 64 V88 Z" fill="#F4F8FC" opacity="0.95" />
          {/* Small Window Cutout */}
          <rect x="-12" y="54" width="12" height="12" rx="1.5" fill="#F4F8FC" opacity="0.8" />
        </g>

        {/* Foreground Rolling Wave Hill (Teal to Emerald Gradient) */}
        <path
          d="M230 240 C310 220 375 205 435 198 C475 190 500 202 520 225 L520 240 Z"
          fill="url(#hillFront)"
          opacity="0.8"
        />
        <path
          d="M320 240 C370 230 420 220 460 214 C490 208 510 216 520 228 L520 240 Z"
          fill="#10b981"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
