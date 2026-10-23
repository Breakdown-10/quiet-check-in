import React from 'react';
import { Clock, Sparkles, Sun, Activity, Calendar, Bell, Heart, ChevronDown } from 'lucide-react';

export type DashboardTab = 'today' | 'timeline' | 'routine' | 'alerts' | 'settings';

interface TopHeaderProps {
  elderName?: string;
  elderAge?: number;
  elderCity?: string;
  localTime?: string;
  isSim?: boolean;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenChat: () => void;
  chatOpen?: boolean;
  alertsCount?: number;
}

export function TopHeader({
  elderName = 'Frank',
  elderAge = 78,
  elderCity = 'Phoenix, AZ',
  localTime = '07:00 AM',
  isSim = true,
  activeTab,
  onSelectTab,
  onOpenChat,
  chatOpen = false,
  alertsCount = 0,
}: TopHeaderProps) {
  // Get elder initials e.g. "Frank" -> "FR"
  const initials = elderName.length >= 2 ? elderName.substring(0, 2).toUpperCase() : 'FR';

  return (
    <div className="bg-transparent space-y-3.5">
      {/* Top Greeting & Utility Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
        {/* Left Greeting */}
        <div className="shrink-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f244a] font-display flex items-center space-x-2 tracking-tight">
            <span>Good morning, {elderName}</span>
            <span>☀️</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Take a moment. You matter.
          </p>
        </div>

        {/* Right Actions: Time Capsule + AI Assistant + Avatar */}
        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap">
          {/* Virtual Time Capsule Pill matching image */}
          <div className="bg-[#edf5fd] border border-[#d6e6f7] rounded-2xl px-3.5 py-1.5 flex items-center space-x-2 shadow-xs">
            <Clock className="w-4 h-4 text-[#0066ff] stroke-[2.2]" />
            <div className="text-xs font-semibold text-[#0f244a] flex items-center">
              <span className="font-bold">{localTime}</span>
              <span className="text-slate-500 font-normal ml-1.5">{elderCity}</span>
            </div>
            {isSim && (
              <span className="bg-[#0066ff] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ml-1">
                SIM
              </span>
            )}
          </div>

          {/* Ask AI Family Assistant Pill Button matching image */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onOpenChat();
            }}
            className={`${
              chatOpen
                ? 'bg-[#0066ff] hover:bg-[#0055d4] text-white shadow-md'
                : 'bg-[#151c38] hover:bg-[#0c1124] text-white shadow-sm'
            } text-xs font-semibold px-4 py-2 rounded-2xl flex items-center space-x-2 transition-all active:scale-95`}
            title={chatOpen ? 'Hide AI Companion' : 'Open AI Family Assistant'}
          >
            <Sparkles className={`w-3.5 h-3.5 ${chatOpen ? 'text-white' : 'text-[#f59e0b]'} stroke-[2]`} />
            <span className="hidden sm:inline">Ask AI Family Assistant</span>
            <span className="sm:hidden">Assistant</span>
          </button>

          {/* User Avatar Circle matching image */}
          <div className="flex items-center space-x-1 cursor-pointer hover:opacity-85 transition pl-0.5">
            <div className="w-9 h-9 rounded-full bg-[#0077ff] text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs Bar matching image */}
      <div className="pt-1">
        <div className="flex space-x-1 sm:space-x-2.5 overflow-x-auto scrollbar-hide py-1 text-xs sm:text-sm font-semibold">
          {/* Tab 1: Today's Routine */}
          <button
            type="button"
            onClick={() => onSelectTab('today')}
            className={`px-3.5 py-2 rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'today'
                ? 'bg-white text-[#0066ff] font-bold shadow-sm border border-[#dbe7f5]'
                : 'text-slate-600 hover:text-[#0f244a] hover:bg-white/60'
            }`}
          >
            <Sun className="w-4 h-4 stroke-[2.2] text-[#0066ff]" />
            <span>Today's Routine</span>
          </button>

          {/* Tab 2: Activity Stream */}
          <button
            type="button"
            onClick={() => onSelectTab('timeline')}
            className={`px-3.5 py-2 rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-white text-[#0066ff] font-bold shadow-sm border border-[#dbe7f5]'
                : 'text-slate-600 hover:text-[#0f244a] hover:bg-white/60'
            }`}
          >
            <Activity className="w-4 h-4 stroke-[2.2] text-[#0066ff]" />
            <span>Activity Stream</span>
          </button>

          {/* Tab 3: Learned Baseline */}
          <button
            type="button"
            onClick={() => onSelectTab('routine')}
            className={`px-3.5 py-2 rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'routine'
                ? 'bg-white text-[#0066ff] font-bold shadow-sm border border-[#dbe7f5]'
                : 'text-slate-600 hover:text-[#0f244a] hover:bg-white/60'
            }`}
          >
            <Calendar className="w-4 h-4 stroke-[2.2] text-[#0066ff]" />
            <span>Learned Baseline</span>
          </button>

          {/* Tab 4: Escalation Feed */}
          <button
            type="button"
            onClick={() => onSelectTab('alerts')}
            className={`px-3.5 py-2 rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-white text-[#0066ff] font-bold shadow-sm border border-[#dbe7f5]'
                : 'text-slate-600 hover:text-[#0f244a] hover:bg-white/60'
            }`}
          >
            <Bell className="w-4 h-4 stroke-[2.2] text-[#0066ff]" />
            <span>Escalation Feed</span>
            <span className="bg-[#f59e0b] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
              {alertsCount > 0 ? alertsCount : 1}
            </span>
          </button>

          {/* Tab 5: Care Circle & Privacy */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className={`px-3.5 py-2 rounded-2xl flex items-center space-x-2 transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-white text-[#0066ff] font-bold shadow-sm border border-[#dbe7f5]'
                : 'text-slate-600 hover:text-[#0f244a] hover:bg-white/60'
            }`}
          >
            <Heart className="w-4 h-4 stroke-[2.2] text-[#0066ff]" />
            <span>Care Circle & Privacy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
