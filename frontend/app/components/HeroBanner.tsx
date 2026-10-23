import React from 'react';
import { Activity } from 'lucide-react';
import { HeroLandscapeIllustration } from './HeroLandscapeIllustration';

interface HeroBannerProps {
  badgeText: string;
  badgeVariant?: 'blue' | 'amber' | 'danger' | 'purple';
  title: string;
  description: string;
  anchorsCompleted?: number;
  totalAnchors?: number;
  showProgress?: boolean;
  rightCardContent?: React.ReactNode;
  children?: React.ReactNode;
}

export function HeroBanner({
  badgeText,
  badgeVariant = 'blue',
  title,
  description,
  anchorsCompleted,
  totalAnchors,
  showProgress = false,
  rightCardContent,
  children,
}: HeroBannerProps) {
  const completionPct =
    totalAnchors && totalAnchors > 0
      ? Math.min(100, Math.round(((anchorsCompleted || 0) / totalAnchors) * 100))
      : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#cfe3f8] bg-gradient-to-r from-[#e9f4ff] via-[#edf6ff] to-[#e4f2fe] p-6 sm:p-7 shadow-sm">
      {/* Background vector landscape illustration */}
      <HeroLandscapeIllustration />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Content Area */}
        <div className="max-w-xl space-y-2.5">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 rounded-full bg-[#dbeafe]/80 backdrop-blur-sm border border-[#bfdbfe] px-3 py-1 shadow-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066ff] text-white">
              <Activity className="h-3 w-3 stroke-[2.5]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0052cc]">
              {badgeText}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f244a] font-display leading-tight">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[#5c6e84] leading-relaxed max-w-lg">
            {description}
          </p>
        </div>

        {/* Custom Right Card (like in Activity Stream Image 2) */}
        {rightCardContent ? (
          <div className="relative z-10 shrink-0">
            {rightCardContent}
          </div>
        ) : showProgress && totalAnchors !== undefined ? (
          /* Standard Right Content Area with vertical divider matching Image 1 */
          <div className="relative z-10 shrink-0 flex flex-col md:border-l md:border-[#cfe2f6] md:pl-6 md:items-start justify-center pt-2 md:pt-0">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#1d4ed8]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Anchors Completed</span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-[#0f244a] font-display mt-1">
              {anchorsCompleted ?? 0} of {totalAnchors}
            </div>

            <div className="text-xs font-medium text-[#5c6e84] mt-0.5">
              Routine Milestones
            </div>

            {/* Progress bar matching Image 1 */}
            <div className="w-36 h-2 rounded-full bg-[#d6e6f7] overflow-hidden mt-3 shadow-inner">
              <div
                className="h-full rounded-full bg-[#0066ff] transition-all duration-500 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {children && <div className="relative z-10 mt-5 pt-4 border-t border-[#d4e6f9]">{children}</div>}
    </div>
  );
}
