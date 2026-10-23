import React from 'react';
import { ChevronRight, Calendar, Activity, VolumeX, ShieldCheck } from 'lucide-react';

interface StatCardsRowProps {
  signalsCount: number;
  sensorsHealthyText?: string;
  dataMinimizationText?: string;
  onSignalsClick?: () => void;
  onSensorsClick?: () => void;
  onPrivacyClick?: () => void;
}

export function StatCardsRow({
  signalsCount = 0,
  sensorsHealthyText = 'Front Porch · Back Patio',
  dataMinimizationText = '0 Audio · 0 Video Feeds',
  onSignalsClick,
  onSensorsClick,
  onPrivacyClick,
}: StatCardsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {/* Card 1: Today's Ring Signals */}
      <button
        type="button"
        onClick={onSignalsClick}
        className="w-full text-left bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-sm hover:shadow-md hover:border-[#cde0f5] transition-all flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-[#d5f7ed] text-[#0d9488] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Today's Ring Signals
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#0f244a] font-display mt-0.5">
              {signalsCount} Verified Events
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#0052cc] shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Card 2: Sensors Healthy */}
      <button
        type="button"
        onClick={onSensorsClick}
        className="w-full text-left bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-sm hover:shadow-md hover:border-[#cde0f5] transition-all flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-[#f0e8fc] text-[#7c3aed] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Sensors Healthy
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#0f244a] font-display mt-0.5">
              {sensorsHealthyText}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#0052cc] shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Card 3: Data Minimization */}
      <button
        type="button"
        onClick={onPrivacyClick}
        className="w-full text-left bg-white rounded-2xl p-5 border border-[#e2eaf4] shadow-sm hover:shadow-md hover:border-[#cde0f5] transition-all flex items-center justify-between group active:scale-[0.99]"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-[#dcecfe] text-[#2563eb] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <VolumeX className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Data Minimization
            </div>
            <div className="text-base sm:text-lg font-extrabold text-[#0f244a] font-display mt-0.5">
              {dataMinimizationText}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#0052cc] shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}
