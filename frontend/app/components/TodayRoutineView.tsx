import React from 'react';
import { Calendar } from 'lucide-react';
import { HeroBanner } from './HeroBanner';
import { StatCardsRow } from './StatCardsRow';
import { RoutineMilestoneCard, MilestoneItem } from './RoutineMilestoneCard';
import { RecentActivitySection } from './RecentActivitySection';

interface TodayRoutineViewProps {
  elderName?: string;
  data: any;
  onNavigateToTab: (tab: 'timeline' | 'routine' | 'alerts' | 'settings') => void;
}

const DEFAULT_6_ANCHORS: MilestoneItem[] = [
  {
    anchor_id: 'anchor_kitchen',
    name: 'Morning Kitchen Routine',
    window: '6:40 AM - 7:40 AM',
    has_occurred: false,
    reliability: 1.0,
    status: 'pending',
    grace_min: 30,
  },
  {
    anchor_id: 'anchor_patio',
    name: 'Morning Patio Check',
    window: '7:06 AM - 8:06 AM',
    has_occurred: false,
    reliability: 1.0,
    status: 'pending',
    grace_min: 30,
  },
  {
    anchor_id: 'anchor_front_door',
    name: 'Front Door Activity',
    window: '7:06 AM - 8:06 AM',
    has_occurred: false,
    reliability: 1.0,
    status: 'in_progress',
    progress_pct: 60,
    grace_min: 30,
  },
  {
    anchor_id: 'anchor_meds',
    name: 'Morning Medication Adherence',
    window: '7:46 AM - 8:46 AM',
    has_occurred: false,
    reliability: 1.0,
    status: 'pending',
    grace_min: 30,
  },
  {
    anchor_id: 'anchor_porch',
    name: 'Morning Front Porch Activity',
    window: '8:09 AM - 9:31 AM',
    has_occurred: false,
    reliability: 1.0,
    status: 'pending',
    grace_min: 30,
  },
  {
    anchor_id: 'anchor_evening',
    name: 'Evening Patio Check',
    window: '8:01 PM - 9:08 PM',
    has_occurred: false,
    reliability: 1.0,
    status: 'pending',
    grace_min: 30,
  },
];

export function TodayRoutineView({
  elderName = 'Frank',
  data,
  onNavigateToTab,
}: TodayRoutineViewProps) {
  // Merge loaded anchors or use default 6 learned anchors
  const anchors: MilestoneItem[] =
    data?.active_anchors && data.active_anchors.length > 0
      ? data.active_anchors
      : DEFAULT_6_ANCHORS;

  const completedCount = anchors.filter(
    (a) => a.has_occurred || a.status === 'completed'
  ).length;
  const totalCount = anchors.length;

  const isAway = Boolean(data?.away_until);
  const overallStatus = data?.overall_status || 'green';

  // Dynamic content based on activity and elder's name matching Image 1
  const heroBadge = isAway
    ? 'ELDER AWAY MODE'
    : overallStatus === 'green'
    ? 'NORMAL ROUTINE RHYTHM'
    : overallStatus === 'amber'
    ? 'GENTLE CHECK-IN WINDOW'
    : 'INACTIVITY NOTICE';

  const heroTitle = isAway
    ? `${elderName} paused monitoring for travel`
    : overallStatus === 'green'
    ? `${elderName}’s day is proceeding at its normal pace.`
    : overallStatus === 'amber'
    ? `${elderName}’s morning routine is overdue past typical time.`
    : `Extended silence observed for ${elderName} during normal waking hours.`;

  const heroDescription = isAway
    ? `Routine evaluation and escalations are held until ${elderName} resumes or returns home.`
    : overallStatus === 'green'
    ? `Ambient Ring signals match ${elderName}'s learned 21-day rhythm. No intrusive surveillance or cameras required.`
    : data?.observations?.[0]?.message_draft ||
      `Morning wake activity for ${elderName} usually occurs by this hour. Deterministic grace window is currently open.`;

  return (
    <div className="space-y-6 tab-enter">
      {/* 1. Hero Card matching Image 1 */}
      <HeroBanner
        badgeText={heroBadge}
        title={heroTitle}
        description={heroDescription}
        anchorsCompleted={completedCount}
        totalAnchors={totalCount}
        showProgress={true}
      />

      {/* 2. Three Quick Stat Cards matching Image 1 */}
      <StatCardsRow
        signalsCount={data?.signal_count_today ?? 0}
        sensorsHealthyText="Front Porch · Back Patio"
        dataMinimizationText="0 Audio · 0 Video Feeds"
        onSignalsClick={() => onNavigateToTab('timeline')}
        onSensorsClick={() => onNavigateToTab('routine')}
        onPrivacyClick={() => onNavigateToTab('settings')}
      />

      {/* 3. Daily Routine Milestones Section matching Image 1 */}
      <div className="space-y-4 pt-1">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#e0effe] text-[#0066ff] flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0f244a] font-display">
                Daily Routine Milestones
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Learned from 21 days of continuous Gaussian KDE routine modeling
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto text-xs font-semibold text-[#0066ff] bg-[#edf5fe] border border-[#d6e6f7] px-3.5 py-1.5 rounded-xl shadow-xs">
            Adaptive +30m Grace Window
          </span>
        </div>

        {/* Milestones Grid matching image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {anchors.map((milestone) => (
            <RoutineMilestoneCard
              key={milestone.anchor_id}
              milestone={milestone}
            />
          ))}
        </div>
      </div>

      {/* 4. Recent Activity Section matching image */}
      <RecentActivitySection
        onViewAll={() => onNavigateToTab('timeline')}
      />
    </div>
  );
}
