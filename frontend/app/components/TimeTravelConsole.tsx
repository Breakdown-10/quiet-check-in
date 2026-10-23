import React from 'react';
import {
  Sliders, ChevronDown, ChevronUp, Coffee, DoorOpen, CheckCircle,
  Home, Check, AlertTriangle, Clock, FastForward, WifiOff, RotateCcw
} from 'lucide-react';

interface TimeTravelConsoleProps {
  expanded: boolean;
  onToggle: () => void;
  localTime?: string;
  onInjectScenario: (scenario: string) => void;
  onAdvanceTime: (minutes: number) => void;
}

export function TimeTravelConsole({
  expanded,
  onToggle,
  localTime = '07:00 AM',
  onInjectScenario,
  onAdvanceTime,
}: TimeTravelConsoleProps) {
  return (
    <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl select-none">
      <div className="bg-[#151c38]/95 text-white rounded-2xl shadow-2xl border border-white/15 backdrop-blur-md overflow-hidden transition-all">
        {/* Collapsed Header / Toggle Pill */}
        <div
          onClick={onToggle}
          className="p-3 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-[#0066ff] flex items-center justify-center text-white shadow-xs">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold font-display uppercase tracking-wider block text-white">
                Interactive Time-Travel Simulator
              </span>
              <span className="text-[11px] text-slate-300 hidden sm:inline">
                Test HMAC verification, Gaussian KDE baseline, and deterministic escalation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-[#38bdf8] bg-[#0c1329] border border-[#38bdf8]/30 px-2.5 py-0.5 rounded-md">
              {localTime}
            </span>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Expanded Drawer Controls */}
        {expanded && (
          <div className="p-4 border-t border-white/10 bg-[#0c1228]/80 slide-up space-y-3.5">
            {/* Step-by-Step Routine Triggers */}
            <div>
              <div className="text-[11px] text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                <span>Step-by-Step Routine Triggers (Click each independently as morning progresses):</span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onInjectScenario('step_kitchen')}
                  className="bg-white/10 hover:bg-white/20 text-[#67e8f9] border border-[#06b6d4]/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Simulate Frank waking up and entering kitchen at 07:15 AM"
                >
                  <Coffee className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span>1. Kitchen Wake (07:15 AM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('step_patio')}
                  className="bg-white/10 hover:bg-white/20 text-[#67e8f9] border border-[#06b6d4]/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Simulate Frank opening back patio door for garden walk at 07:40 AM"
                >
                  <DoorOpen className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span>2. Back Patio (07:40 AM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('step_meds')}
                  className="bg-white/10 hover:bg-white/20 text-[#67e8f9] border border-[#06b6d4]/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Simulate Frank opening medicine cabinet for morning prescription at 08:20 AM"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span>3. Medication (08:20 AM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('step_paper')}
                  className="bg-white/10 hover:bg-white/20 text-[#67e8f9] border border-[#06b6d4]/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Simulate Frank picking up morning paper on front porch at 08:50 AM"
                >
                  <Home className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span>4. Paper Pickup (08:50 AM)</span>
                </button>
              </div>
            </div>

            {/* Complete Preset Scenarios */}
            <div className="border-t border-white/10 pt-2.5">
              <div className="text-[11px] text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                <span>Preset Demonstration Scenarios:</span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onInjectScenario('morning_routine')}
                  className="bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Completes all 4 morning routines in chronological order (08:50 AM)"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Complete All (Normal Morning)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('missed_paper')}
                  className="bg-white/10 hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Completes Kitchen, Patio, and Meds, but Frank misses paper! (09:45 AM, L1 alert)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Missed Paper (L1 Alert)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('missed_meds')}
                  className="bg-white/10 hover:bg-amber-950/60 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Frank woke up and got paper, but missed morning pills! (09:15 AM, L1 alert)"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Missed Meds (L1 Alert)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('escalate_l2')}
                  className="bg-white/10 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Advances past 11:15 AM without family ack — triggers L2 escalation"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Escalate to L2</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('inactivity')}
                  className="bg-white/10 hover:bg-slate-800 text-slate-300 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Simulate Frank never getting out of bed (0 events, 10:00 AM)"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Total Inactivity</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAdvanceTime(30)}
                  className="bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>+30 Mins</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('device_offline')}
                  className="bg-white/10 hover:bg-white/20 text-slate-300 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                >
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Sensor Offline</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInjectScenario('reset')}
                  className="bg-white/10 hover:bg-red-950/60 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  title="Resets day to 07:00 AM Phoenix time with clean pending routines"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Day (07:00 AM)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
