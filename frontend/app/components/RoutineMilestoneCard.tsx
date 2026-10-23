import React from 'react';
import { Clock, Coffee, Home, DoorOpen, CheckCircle, Sun, Moon, Check, ChevronRight } from 'lucide-react';

export interface MilestoneItem {
  anchor_id: string;
  name: string;
  window: string;
  has_occurred?: boolean;
  reliability?: number;
  status?: 'completed' | 'in_grace' | 'missed' | 'pending' | 'in_progress';
  grace_min?: number;
  device_id?: string;
  support_days?: number;
  total_days?: number;
  progress_pct?: number;
}

interface RoutineMilestoneCardProps {
  milestone: MilestoneItem;
}

export function RoutineMilestoneCard({ milestone }: RoutineMilestoneCardProps) {
  const isDone = milestone.has_occurred || milestone.status === 'completed';
  const isMissed = milestone.status === 'missed';
  const isInGrace = milestone.status === 'in_grace';
  const isInProgress = milestone.status === 'in_progress' || (milestone.progress_pct && milestone.progress_pct > 0 && !isDone);

  // Determine icon and color palette based on name/device
  const nameLower = milestone.name.toLowerCase();

  let iconBg = 'bg-[#d5f7ed] text-[#059669]'; // default mint (kitchen)
  let IconComponent = Coffee;

  if (nameLower.includes('patio') || nameLower.includes('garden')) {
    iconBg = 'bg-[#dbeafe] text-[#2563eb]'; // soft blue
    IconComponent = Home;
  } else if (nameLower.includes('medic') || nameLower.includes('pill')) {
    iconBg = 'bg-[#f0e8fc] text-[#7c3aed]'; // lavender
    IconComponent = CheckCircle;
  } else if (nameLower.includes('front door') || nameLower.includes('door activity')) {
    iconBg = 'bg-[#f3e8ff] text-[#8b5cf6]'; // purple
    IconComponent = DoorOpen;
  } else if (nameLower.includes('porch') || nameLower.includes('paper') || nameLower.includes('doorbell')) {
    iconBg = 'bg-[#ffedd5] text-[#ea580c]'; // warm peach
    IconComponent = DoorOpen;
  } else if (nameLower.includes('evening') || nameLower.includes('night')) {
    iconBg = 'bg-[#e0e7ff] text-[#4f46e5]'; // indigo
    IconComponent = Moon;
  } else if (nameLower.includes('afternoon')) {
    iconBg = 'bg-[#e0f2fe] text-[#0284c7]'; // sky
    IconComponent = Sun;
  }

  // Parse expected time from window e.g. "6:40 AM - 7:40 AM" -> "~6:40 AM"
  const expectedStart = milestone.window ? milestone.window.split('-')[0].trim() : 'Scheduled';
  const tolerance = milestone.grace_min || 30;
  const consistencyPct = Math.round((milestone.reliability ?? 1.0) * 100);
  const progressPercent = milestone.progress_pct || (isDone ? 100 : isInProgress ? 60 : 0);

  return (
    <div className="bg-white border border-[#e5edf6] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#cde0f5] transition-all flex flex-col justify-between group cursor-pointer">
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-xs group-hover:scale-105 transition-transform`}>
              <IconComponent className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-[#0f244a] font-display">
              {milestone.name}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            {isDone ? (
              <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#d1fae5] text-[#059669]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Observed</span>
              </span>
            ) : isInProgress ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#e0f2fe] text-[#0284c7]">
                <span>In Progress</span>
              </span>
            ) : isInGrace ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1d4ed8] animate-pulse">
                <span>Grace Active</span>
              </span>
            ) : isMissed ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fee2e2] text-[#dc2626]">
                <span>Overdue</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#fef3c7] text-[#d97706]">
                <span>Pending Window</span>
              </span>
            )}

            {/* Chevron Right */}
            <ChevronRight className="w-5 h-5 text-[#0066ff] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Time Window Row */}
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700 mt-4 pl-1">
          <Clock className="w-4 h-4 text-slate-400 stroke-[2.2]" />
          <span>{milestone.window}</span>
        </div>

        {/* Consistency Row */}
        {!isInProgress && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mt-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>{consistencyPct}% consistency</span>
          </div>
        )}

        {/* Progress Bar Track */}
        <div className="flex items-center space-x-3 mt-3.5">
          <div className="flex-1 h-2 rounded-full bg-[#eef3f8] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone
                  ? 'w-full bg-[#10b981]'
                  : isInProgress
                  ? 'bg-[#0077ff]'
                  : isInGrace
                  ? 'w-3/4 bg-[#3b82f6] animate-pulse'
                  : isMissed
                  ? 'w-full bg-[#ef4444]'
                  : 'w-0 bg-transparent'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isInProgress && (
            <span className="text-xs font-bold text-slate-500 font-mono">
              {progressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="mt-4 pt-3 border-t border-[#edf2f7] flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>Expected ~{expectedStart}</span>
        <span>Tolerance: ±{tolerance} mins</span>
      </div>
    </div>
  );
}
