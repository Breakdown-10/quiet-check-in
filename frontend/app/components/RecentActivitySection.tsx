import React from 'react';
import { Activity, ChevronRight, DoorOpen, Coffee, Radio, User } from 'lucide-react';

interface RecentActivitySectionProps {
  onViewAll?: () => void;
}

export function RecentActivitySection({ onViewAll }: RecentActivitySectionProps) {
  const events = [
    {
      time: '7:10 AM',
      title: 'Front Door Opened',
      desc: 'Door sensor triggered · Front door',
      badge: 'DOOR_OPEN',
      badgeColor: 'bg-[#f3e8ff] text-[#8b5cf6]',
      iconBg: 'bg-[#f3e8ff] text-[#8b5cf6]',
      Icon: DoorOpen,
    },
    {
      time: '7:05 AM',
      title: 'Motion Detected - Patio',
      desc: 'Ring sensor · Back patio',
      badge: 'HUMAN_MOTION',
      badgeColor: 'bg-[#d1fae5] text-[#059669]',
      iconBg: 'bg-[#dbeafe] text-[#0066ff]',
      Icon: User,
    },
    {
      time: '6:45 AM',
      title: 'Morning Kitchen Routine',
      desc: 'Routine detected · 100% consistency',
      badge: 'ROUTINE',
      badgeColor: 'bg-[#d1fae5] text-[#059669]',
      iconBg: 'bg-[#d5f7ed] text-[#059669]',
      Icon: Coffee,
    },
  ];

  return (
    <div className="bg-white border border-[#e5edf6] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#edf2f7] pb-3">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-5 h-5 text-[#0066ff] stroke-[2.2]" />
          <h3 className="text-base font-extrabold text-[#0f244a] font-display">
            Recent Activity
          </h3>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-xs text-[#0066ff] hover:text-[#0052cc] font-bold flex items-center space-x-1 group"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Activity Timeline Items */}
      <div className="space-y-3.5">
        {events.map((ev, idx) => (
          <div key={idx} className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-3.5">
              {/* Timestamp */}
              <span className="text-xs font-bold text-slate-500 font-mono w-14 shrink-0">
                {ev.time}
              </span>

              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ev.iconBg}`}>
                <ev.Icon className="w-4 h-4 stroke-[2.2]" />
              </div>

              {/* Title & Desc */}
              <div>
                <div className="text-xs font-bold text-[#0f244a] font-display">
                  {ev.title}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {ev.desc}
                </div>
              </div>
            </div>

            {/* Badge */}
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${ev.badgeColor}`}>
              {ev.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
