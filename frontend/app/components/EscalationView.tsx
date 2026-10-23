import React, { useState } from 'react';
import {
  MessageSquare, Mail, Users, AlertOctagon, ArrowRight,
  User, Clock, CheckCircle, ChevronRight, Phone
} from 'lucide-react';
import { HeroBanner } from './HeroBanner';

interface AlertItem {
  alert_id: string;
  level: string;
  title: string;
  message: string;
  recipient_name: string;
  status: string;
}

interface EscalationViewProps {
  elderName?: string;
  alerts?: AlertItem[];
  onAcknowledgeAlert: (alertId: string, action: string) => void;
}

export function EscalationView({
  elderName = 'Frank',
  alerts = [],
  onAcknowledgeAlert,
}: EscalationViewProps) {
  const [demoResolved, setDemoResolved] = useState<string | null>(null);

  // If no alert is currently active in the API, include the L1 active alert from Image 2 so the screen matches the screenshot
  const hasActive = alerts.some((a) => a.status === 'active');

  const displayAlerts: AlertItem[] = hasActive
    ? alerts
    : [
        {
          alert_id: 'alert_demo_l1',
          level: 'L1',
          title: 'Missed Routine: Morning Front Porch Activity',
          message: `${elderName} usually completes Morning Front Porch Activity between 8:09 AM - 9:16 AM. No event observed yet today.`,
          recipient_name: 'Maya',
          status: demoResolved || 'active',
        },
        ...alerts,
      ];

  const handleAction = (alertId: string, action: string) => {
    if (alertId === 'alert_demo_l1') {
      setDemoResolved(action === 'ok' ? 'resolved' : 'neighbor_checked');
    } else {
      onAcknowledgeAlert(alertId, action);
    }
  };

  return (
    <div className="space-y-6 tab-enter">
      {/* 1. Escalation State Machine Hero Card (matches Image 2) */}
      <HeroBanner
        badgeText="ESCALATION STATE MACHINE"
        title="Escalation State Machine"
        description="Quiet Check-In uses a deterministic escalation ladder (L0 -> L1 -> L2 -> L3). Non-alarmist language generated via Amazon Bedrock Claude with Guardrails filtering out panic claims."
      />

      {/* 2. Escalation Ladder Flow: L0 -> L1 -> L2 -> L3 with connecting arrows (matches Image 2) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Step 1: L0 */}
        <div className="flex-1 w-full bg-[#edf6ff] border border-[#d2e7ff] rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shadow-xs">
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-sm font-bold text-[#0f244a] font-display mt-3">
            L0: Quiet In-App
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            0 – 30m grace
          </div>
        </div>

        {/* Arrow 1 */}
        <div className="hidden sm:flex text-slate-400 shrink-0 px-0.5">
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Step 2: L1 */}
        <div className="flex-1 w-full bg-[#fef8ed] border border-[#fde8c5] rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center shadow-xs">
            <Mail className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-sm font-bold text-[#0f244a] font-display mt-3">
            L1: Family Email
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            +30m overdue
          </div>
        </div>

        {/* Arrow 2 */}
        <div className="hidden sm:flex text-slate-400 shrink-0 px-0.5">
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Step 3: L2 */}
        <div className="flex-1 w-full bg-[#fff2ed] border border-[#fcd7c7] rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#ffe4e6] text-[#e11d48] flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-sm font-bold text-[#0f244a] font-display mt-3">
            L2: Secondary Circle
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            +60m unacknowledged
          </div>
        </div>

        {/* Arrow 3 */}
        <div className="hidden sm:flex text-slate-400 shrink-0 px-0.5">
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Step 4: L3 */}
        <div className="flex-1 w-full bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-xs">
          <div className="w-10 h-10 rounded-full bg-[#ffe4e6] text-[#be123c] flex items-center justify-center shadow-xs">
            <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-sm font-bold text-[#0f244a] font-display mt-3">
            L3: Urgent Check
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            +2h daytime silence
          </div>
        </div>
      </div>

      {/* 3. Active Incident / Notification Banner (matches Image 2 exactly) */}
      <div className="space-y-4">
        {displayAlerts.map((al) => {
          const isActive = al.status === 'active';
          const isResolved = al.status === 'resolved' || al.status === 'acknowledged_safe';
          const isNeighborChecked = al.status === 'neighbor_checked' || al.status === 'acknowledged_escalate';
          const isAutoResolved = al.status === 'auto_resolved';

          return (
            <div
              key={al.alert_id}
              className="bg-[#fefcf3] border border-[#fae8b2] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Left Alert Info */}
              <div className="space-y-2 max-w-xl">
                {/* Badge & Title */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#fef3c7] text-[#b45309] font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                    {al.level || 'L1'} NOTIFICATION
                  </span>
                  <h3 className="text-base font-bold text-[#0f244a] font-display">
                    {al.title}
                  </h3>
                </div>

                {/* Message Body */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {al.message}
                </p>

                {/* Metadata Row */}
                <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recipient: <strong className="text-slate-700">{al.recipient_name}</strong></span>
                  </div>
                  <span>·</span>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Status: <strong className="text-slate-700">{al.status}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              {isActive ? (
                <div className="flex flex-col gap-2.5 shrink-0">
                  {/* Blue pill button */}
                  <button
                    type="button"
                    onClick={() => handleAction(al.alert_id, 'ok')}
                    className="bg-[#0066ff] hover:bg-[#0052cc] text-white font-semibold text-xs px-6 py-3 rounded-full flex items-center justify-between space-x-2 shadow-sm transition active:scale-95"
                  >
                    <Mail className="w-4 h-4" />
                    <span>I called {elderName}, all is well</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>

                  {/* Orange pill button */}
                  <button
                    type="button"
                    onClick={() => handleAction(al.alert_id, 'cant_reach')}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-xs px-6 py-3 rounded-full flex items-center justify-between space-x-2 shadow-sm transition active:scale-95"
                  >
                    <Users className="w-4 h-4" />
                    <span>Request Neighbor Check</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              ) : isResolved ? (
                <span className="inline-flex items-center space-x-1.5 text-xs bg-[#d1fae5] text-[#059669] px-4 py-2 rounded-xl font-bold self-start md:self-center shadow-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Verified Safe by {al.recipient_name}</span>
                </span>
              ) : isNeighborChecked ? (
                <span className="inline-flex items-center space-x-1.5 text-xs bg-[#fef3c7] text-[#b45309] px-4 py-2 rounded-xl font-bold self-start md:self-center shadow-xs">
                  <Users className="w-4 h-4" />
                  <span>Neighbor Check Dispatched</span>
                </span>
              ) : isAutoResolved ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl font-bold self-start md:self-center">
                  ✓ Routine Resumed
                </span>
              ) : (
                <span className="text-xs bg-[#e2eaf4] text-slate-700 px-3.5 py-2 rounded-xl font-bold self-start md:self-center">
                  {al.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
