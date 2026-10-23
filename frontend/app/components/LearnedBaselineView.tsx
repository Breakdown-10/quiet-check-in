import React from 'react';
import { Calendar, Edit3, CheckCircle, RefreshCw, Sliders, Activity } from 'lucide-react';
import { HeroBanner } from './HeroBanner';

interface LearnedBaselineViewProps {
  baseline: any[];
  loading: boolean;
  elderName?: string;
  editingAnchorId: string | null;
  anchorCustomName: string;
  anchorCustomGrace: number;
  onStartEditAnchor: (anchor: any) => void;
  onCancelEditAnchor: () => void;
  onSaveAnchor: (anchorId: string) => void;
  setAnchorCustomName: (name: string) => void;
  setAnchorCustomGrace: (grace: number) => void;
}

export function LearnedBaselineView({
  baseline,
  loading,
  elderName = 'Frank',
  editingAnchorId,
  anchorCustomName,
  anchorCustomGrace,
  onStartEditAnchor,
  onCancelEditAnchor,
  onSaveAnchor,
  setAnchorCustomName,
  setAnchorCustomGrace,
}: LearnedBaselineViewProps) {
  return (
    <div className="space-y-6 tab-enter">
      {/* Hero Banner */}
      <HeroBanner
        badgeText="GAUSSIAN KDE BASELINE"
        title="Learned Behavioral Rhythm"
        description="Non-intrusive statistical modeling discovers recurring routine clusters without fixed schedules. Median Absolute Deviation (MAD) establishes adaptive window bounds with support requirements (≥60% of observed days)."
      />

      {/* Routine Baseline Container */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="border-b border-[#edf2f7] pb-4">
          <h2 className="font-display font-extrabold text-lg text-[#0f244a]">
            21-Day Gaussian KDE Anchors
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
            Continuously evaluated baseline for {elderName}. You can fine-tune names or grace tolerances to match family preferences.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0066ff]" />
            <span className="font-semibold text-slate-700">Computing KDE statistical distribution...</span>
          </div>
        ) : baseline.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs">
            Baseline data loading. {elderName}'s 21-day historical data is being evaluated.
          </div>
        ) : (
          <div className="space-y-4">
            {baseline.map((a: any) => (
              <div
                key={a.anchor_id}
                className="p-5 sm:p-6 bg-[#f8fafc] border border-[#e2eaf4] rounded-2xl flex flex-col space-y-3.5 hover:border-[#cbdff5] transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Anchor Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-display font-extrabold text-base text-[#0f244a]">
                        {a.name}
                      </span>
                      <span className="text-[10px] font-mono bg-[#dbeafe] text-[#1d4ed8] px-2 py-0.5 rounded-md font-bold">
                        {a.device_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => onStartEditAnchor(a)}
                        className="text-slate-400 hover:text-[#0066ff] p-1 rounded-lg hover:bg-white transition"
                        title="Customize routine nickname and tolerance"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs text-[#0066ff] font-semibold">
                      {a.evidence}
                    </div>

                    <div className="text-xs text-slate-600 font-medium">
                      Normal Window: <strong className="text-[#0f244a]">{a.window}</strong> (+{a.grace_min}m adaptive grace)
                    </div>
                  </div>

                  {/* Right Reliability Stats */}
                  <div className="shrink-0 text-left sm:text-right bg-white p-3.5 sm:p-0 rounded-xl border sm:border-0 border-[#e2e8f0] flex sm:flex-col items-center sm:items-end justify-between">
                    <div className="text-xl font-extrabold text-[#0f244a] font-display">
                      {a.reliability_pct}%
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      Historical Consistency
                    </div>
                    <div className="text-[10px] text-[#059669] font-semibold mt-0.5">
                      {a.support_days} of {a.total_days} days verified
                    </div>
                  </div>
                </div>

                {/* Inline Anchor Edit Form */}
                {editingAnchorId === a.anchor_id && (
                  <div className="mt-3 pt-3.5 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 rounded-xl shadow-xs">
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wide">
                        Routine Nickname
                      </label>
                      <input
                        type="text"
                        value={anchorCustomName}
                        onChange={(e) => setAnchorCustomName(e.target.value)}
                        className="w-full text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                        placeholder="e.g. Morning Medication"
                      />
                    </div>
                    <div className="w-36">
                      <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wide">
                        Grace Tolerance
                      </label>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={anchorCustomGrace}
                          onChange={(e) => setAnchorCustomGrace(Number(e.target.value))}
                          className="w-full text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                        />
                        <span className="text-xs text-slate-500 font-medium">mins</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:self-end pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => onSaveAnchor(a.anchor_id)}
                        className="bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEditAnchor}
                        className="bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
