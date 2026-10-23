import React from 'react';
import { Calendar, CheckCircle, ShieldCheck, Clock, Award } from 'lucide-react';
import { HeroBanner } from './HeroBanner';

interface HistoryViewProps {
  elderName?: string;
}

export function HistoryView({ elderName = 'Frank' }: HistoryViewProps) {
  // Generate sample 21-day historical data
  const days = Array.from({ length: 21 }, (_, i) => {
    const dayNum = 21 - i;
    const isToday = i === 0;
    const rate = i === 3 ? 92 : i === 7 ? 95 : 100;
    return {
      day: dayNum,
      date: `Oct ${dayNum}`,
      consistency: rate,
      status: 'normal',
      isToday,
    };
  });

  return (
    <div className="space-y-6 tab-enter">
      {/* Hero Banner */}
      <HeroBanner
        badgeText="HISTORICAL TELEMETRY"
        title="21-Day Routine History & Baseline"
        description={`Audit the continuous 21-day KDE learning curve for ${elderName}. Demonstrates stable circadian patterns, zero intrusive camera usage, and reliable family peace of mind.`}
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Consistency
          </div>
          <div className="text-2xl font-extrabold text-[#0f244a] font-display mt-1">
            98.8%
          </div>
          <div className="text-xs text-[#059669] font-semibold mt-1 flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Optimal Circadian Stability</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Surveillance Incursions
          </div>
          <div className="text-2xl font-extrabold text-[#0f244a] font-display mt-1">
            0 Feeds
          </div>
          <div className="text-xs text-[#0066ff] font-semibold mt-1 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>100% Privacy Preserved</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Baseline Days
          </div>
          <div className="text-2xl font-extrabold text-[#0f244a] font-display mt-1">
            21 of 21 Days
          </div>
          <div className="text-xs text-slate-500 font-semibold mt-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Fully Trained KDE Model</span>
          </div>
        </div>
      </div>

      {/* 21-Day Calendar Matrix */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#edf2f7] pb-4">
          <div>
            <h3 className="font-display font-extrabold text-lg text-[#0f244a] flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#0066ff]" />
              <span>Daily Adherence Grid</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Daily verification logs confirming wake, patio garden walks, and front porch activity.
            </p>
          </div>
          <span className="text-xs bg-[#d1fae5] text-[#059669] font-bold px-3 py-1.5 rounded-xl self-start sm:self-auto">
            High Senior Independence Score
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5 pt-2">
          {days.map((d) => (
            <div
              key={d.day}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between text-center transition ${
                d.isToday
                  ? 'bg-[#edf5fe] border-[#0066ff] ring-2 ring-[#0066ff]/20'
                  : 'bg-[#f8fafc] border-[#e2eaf4] hover:bg-white hover:border-[#cbd5e1]'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Day {d.day}
              </div>
              <div className="text-base font-extrabold text-[#0f244a] font-display my-1">
                {d.consistency}%
              </div>
              <div className="inline-flex items-center justify-center space-x-1 text-[10px] font-semibold text-[#059669]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span>Normal</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
