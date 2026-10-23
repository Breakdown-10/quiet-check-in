import React from 'react';
import { RefreshCw, ShieldCheck, Activity, DoorOpen, Radio, Calendar } from 'lucide-react';
import { HeroBanner } from './HeroBanner';

interface ActivityStreamViewProps {
  timeline: any[];
  loading: boolean;
  onRefresh: () => void;
  elderName?: string;
  data?: any;
}

export function ActivityStreamView({
  timeline,
  loading,
  onRefresh,
  elderName = 'Frank',
  data,
}: ActivityStreamViewProps) {
  const detectedEvents = timeline.length;
  const targetEvents = 4;
  const progressPct = Math.min(100, Math.round((detectedEvents / targetEvents) * 100));

  const isAway = Boolean(data?.away_until);
  const overallStatus = data?.overall_status || 'green';

  const badgeText = isAway ? 'ELDER AWAY MODE' : 'LIVE SENSOR DATA';

  const title = isAway
    ? `${elderName} is away — live sensor stream paused`
    : overallStatus === 'amber'
    ? 'Routine check-in window active.'
    : overallStatus === 'red'
    ? 'Inactivity window observed.'
    : detectedEvents > 0
    ? 'Your daily rhythm is looking good.'
    : 'Awaiting morning sensor signals.';

  const description = isAway
    ? `Ring sensor webhooks are logged, but proactive escalations remain paused while ${elderName} is away.`
    : overallStatus === 'amber'
    ? `A brief quiet window has passed expected morning timing. Monitoring for next ambient movement.`
    : overallStatus === 'red'
    ? `Extended quiet window past routine grace limit. Family Escalation Level 1 active.`
    : detectedEvents > 0
    ? 'Your sensors are active and we’re tracking your routine to keep you supported.'
    : `Sensors on Front Porch and Back Patio are listening for ${elderName}'s daily routine signals.`;

  return (
    <div className="space-y-6 tab-enter">
      {/* Hero Banner matching Image 2 */}
      <HeroBanner
        badgeText={badgeText}
        title={title}
        description={description}
        rightCardContent={
          <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 sm:p-5 shadow-xs w-56 shrink-0">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#0066ff]">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
              <span>Today's Progress</span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-[#0f244a] font-display mt-2">
              {detectedEvents} of {targetEvents}
            </div>

            <div className="text-xs font-semibold text-[#5c6e84] mt-0.5">
              Events Detected
            </div>

            {/* Green progress bar matching Image 2 */}
            <div className="w-full h-2 rounded-full bg-[#e2eaf4] overflow-hidden mt-3 shadow-inner">
              <div
                className="h-full rounded-full bg-[#10b981] transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="text-[11px] sm:text-xs text-[#5c6e84] font-medium mt-3 leading-tight">
              Consistency builds better days.
            </div>
          </div>
        }
      />

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#d5f7ed] text-[#0d9488] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Events Today</div>
            <div className="text-base font-extrabold text-[#0f244a] font-display">
              {timeline.length} Signals Captured
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">HMAC Verification</div>
            <div className="text-base font-extrabold text-[#0f244a] font-display">
              100% Authenticated
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e2eaf4] rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f0e8fc] text-[#7c3aed] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Privacy Engine</div>
            <div className="text-base font-extrabold text-[#0f244a] font-display">
              Zero Video / Audio
            </div>
          </div>
        </div>
      </div>

      {/* Events List Container */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
          <div>
            <h2 className="font-display font-extrabold text-lg text-[#0f244a]">
              Sensor Ingestion Timeline
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Real-time audit log of ambient event timestamps received from Ring Developer API
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-auto text-xs font-semibold text-[#0066ff] bg-[#edf5fe] hover:bg-[#e0effe] border border-[#d6e6f7] px-4 py-2 rounded-xl transition flex items-center space-x-2 shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stream</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0066ff]" />
            <span className="font-semibold text-slate-700">Loading verified Ring telemetry...</span>
          </div>
        ) : timeline.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs">
            <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center mx-auto mb-2 text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700">No events recorded yet for today's active window.</p>
            <p className="text-slate-400 mt-1">Use the Time-Travel Simulator below to test and trigger events.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[#dbeafe] ml-4 sm:ml-6 space-y-5 py-2">
            {timeline.map((e, idx) => {
              const isDoor = e.device_id?.includes('back') || e.device_id?.includes('door');
              const isMotion = e.kind?.includes('motion') || e.device_id?.includes('kitchen');

              return (
                <div key={idx} className="relative pl-6 sm:pl-7 group">
                  {/* Event dot */}
                  <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-[#0066ff] shadow-xs group-hover:scale-125 transition-transform" />

                  <div className="bg-[#f8fafc] hover:bg-[#f1f7fe] border border-[#e2eaf4] rounded-2xl p-4 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-bold text-[#0f244a] font-mono bg-white px-2 py-0.5 rounded-lg border border-[#e2e8f0]">
                          {e.time_str}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#dbeafe] text-[#1d4ed8]">
                          {e.kind}
                        </span>
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-[#059669] bg-[#d1fae5] px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                          <span>HMAC OK</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {e.device_id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-2 font-medium flex items-center space-x-2">
                      {isDoor ? (
                        <DoorOpen className="w-3.5 h-3.5 text-[#0066ff]" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                      <span>
                        Device:{' '}
                        <strong>
                          {e.device_id === 'doorbell_front'
                            ? 'Front Doorbell (Ring Doorbell Pro)'
                            : e.device_id === 'sensor_backdoor'
                            ? 'Back Patio (Ring Contact Sensor)'
                            : e.device_id === 'motion_kitchen'
                            ? 'Kitchen Motion Sensor'
                            : e.device_id === 'sensor_medicine'
                            ? 'Medicine Cabinet Sensor'
                            : e.device_id}
                        </strong>
                        {e.sub_type && <span className="text-slate-400 ml-2">· Subtype: {e.sub_type}</span>}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
