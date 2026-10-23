import React from 'react';
import { Home, Calendar, Settings, Heart } from 'lucide-react';

interface SidebarProps {
  currentSection: 'home' | 'history' | 'settings';
  onSelectSection: (section: 'home' | 'history' | 'settings') => void;
  elderName?: string;
}

export function Sidebar({
  currentSection,
  onSelectSection,
  elderName = 'Frank',
}: SidebarProps) {
  return (
    <aside className="w-56 lg:w-64 shrink-0 bg-gradient-to-b from-[#0353c7] via-[#0243a7] to-[#013386] text-white flex flex-col justify-between relative overflow-hidden select-none min-h-screen">
      {/* Decorative Wave Accent at Bottom Corner */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 overflow-hidden z-0">
        <svg
          viewBox="0 0 256 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover opacity-35"
        >
          <path
            d="M-30 180 C40 120 120 160 180 110 C220 70 260 90 290 80 L290 180 Z"
            fill="url(#sidebarWaveGrad)"
          />
          <path
            d="M-20 180 C60 140 130 170 190 130 C230 100 270 120 300 110 L300 180 Z"
            fill="#38bdf8"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="sidebarWaveGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0066ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Brand & Navigation */}
      <div className="relative z-10 p-6 flex flex-col items-center">
        {/* Logo Card */}
        <div className="w-24 h-24 rounded-3xl bg-white/10 p-2 backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center">
          <img
            src="/app_icon_512.png"
            alt="Quiet Check-In Logo"
            className="w-full h-full object-cover rounded-2xl shadow-md"
            onError={(e) => {
              // Fallback to app_icon.jpg if 512 is not loaded
              (e.target as HTMLImageElement).src = '/app_icon.jpg';
            }}
          />
        </div>

        {/* Brand Name */}
        <h2 className="text-xl font-extrabold font-display text-white tracking-tight text-center mt-3.5">
          Quiet<br />Check-In
        </h2>

        {/* Sidebar Nav Items */}
        <nav className="w-full mt-8 space-y-2">
          {/* Home */}
          <button
            onClick={() => onSelectSection('home')}
            className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              currentSection === 'home'
                ? 'bg-[#256ee6] text-white shadow-md shadow-[#00388c]/40 backdrop-blur-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
            <span>Home</span>
          </button>

          {/* History */}
          <button
            onClick={() => onSelectSection('history')}
            className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              currentSection === 'history'
                ? 'bg-[#256ee6] text-white shadow-md shadow-[#00388c]/40 backdrop-blur-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-5 h-5 stroke-[2.2]" />
            <span>History</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onSelectSection('settings')}
            className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
              currentSection === 'settings'
                ? 'bg-[#256ee6] text-white shadow-md shadow-[#00388c]/40 backdrop-blur-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Bottom Reassurance Tagline */}
      <div className="relative z-10 p-6 text-center text-xs text-white/90 font-medium">
        <p className="leading-relaxed">
          You're doing<br />better than<br />you think.
        </p>
        <div className="flex justify-center mt-2.5">
          <Heart className="w-4 h-4 text-white/80 stroke-[2]" />
        </div>
      </div>
    </aside>
  );
}
