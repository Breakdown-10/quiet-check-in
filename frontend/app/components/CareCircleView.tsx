import React from 'react';
import {
  User, Heart, Bell, Sliders, Save, RefreshCw, Check,
  Lock, ShieldCheck, CheckCircle
} from 'lucide-react';
import { HeroBanner } from './HeroBanner';

interface CareCircleViewProps {
  profileForm: {
    elder_name: string;
    age: number;
    city: string;
    primary_contact_name: string;
    primary_contact_email: string;
    secondary_contact_name: string;
    secondary_contact_email: string;
    default_grace_min: number;
  };
  setProfileForm: React.Dispatch<React.SetStateAction<any>>;
  onSaveProfile: (e?: React.FormEvent) => void;
  isSavingProfile: boolean;
  profileSavedToast: boolean;
  data: any;
  onToggleAwayMode: () => void;
  securityProofs: any[] | null;
  loadingSecurity: boolean;
  onRunSecurityProof: () => void;
}

export function CareCircleView({
  profileForm,
  setProfileForm,
  onSaveProfile,
  isSavingProfile,
  profileSavedToast,
  data,
  onToggleAwayMode,
  securityProofs,
  loadingSecurity,
  onRunSecurityProof,
}: CareCircleViewProps) {
  const elderName = profileForm.elder_name || 'Frank';

  return (
    <div className="space-y-6 tab-enter">
      {/* Hero Banner */}
      <HeroBanner
        badgeText="CARE CIRCLE & PRIVACY"
        title="Care Circle & Privacy Architecture"
        description="Configure trusted family members, escalation sensitivity, and audit real-time cryptographic proofs guaranteeing zero audio or video ingestion."
      />

      {/* 1. Care Circle Profile Form */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
          <div>
            <h2 className="font-display font-extrabold text-lg text-[#0f244a] flex items-center space-x-2">
              <User className="w-5 h-5 text-[#0066ff]" />
              <span>Personalization & Escalation Ladder</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
              Customize {elderName}'s details, caregiver escalation contacts, and routine tolerance.
            </p>
          </div>

          {profileSavedToast && (
            <div className="inline-flex items-center space-x-1.5 bg-[#d1fae5] text-[#059669] text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-xs">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Preferences Saved!</span>
            </div>
          )}
        </div>

        <form onSubmit={onSaveProfile} className="space-y-6">
          {/* Senior Profile Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Heart className="w-4 h-4 text-[#0066ff]" />
              <span>Senior / Aging Adult Profile</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Full Name / Preferred Name
                </label>
                <input
                  type="text"
                  value={profileForm.elder_name}
                  onChange={(e) => setProfileForm({ ...profileForm, elder_name: e.target.value })}
                  className="w-full text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-[#0066ff] focus:outline-none"
                  placeholder="e.g. Frank"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={profileForm.age}
                  onChange={(e) => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                  className="w-full text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-[#0066ff] focus:outline-none"
                  placeholder="78"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-[#0066ff] focus:outline-none"
                  placeholder="Phoenix, AZ"
                />
              </div>
            </div>
          </div>

          {/* Caregiver Escalation Contacts */}
          <div className="border-t border-[#edf2f7] pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
              <Bell className="w-4 h-4 text-[#d97706]" />
              <span>Notification & Escalation Ladder Contacts</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary Contact (L1) */}
              <div className="p-4 sm:p-5 bg-[#f8fafc] rounded-2xl border border-[#e2eaf4] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f244a] font-display">
                    Primary Caregiver (L1 Gentle Check-In)
                  </span>
                  <span className="text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8] px-2 py-0.5 rounded-full uppercase">
                    L1 Recipient
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Caregiver Name & Relationship
                  </label>
                  <input
                    type="text"
                    value={profileForm.primary_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, primary_contact_name: e.target.value })}
                    className="w-full text-xs bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#0066ff] focus:outline-none"
                    placeholder="Maya (Daughter)"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.primary_contact_email}
                    onChange={(e) => setProfileForm({ ...profileForm, primary_contact_email: e.target.value })}
                    className="w-full text-xs bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#0066ff] focus:outline-none"
                    placeholder="maya@family.local"
                  />
                </div>
              </div>

              {/* Secondary Contact (L2) */}
              <div className="p-4 sm:p-5 bg-[#f8fafc] rounded-2xl border border-[#e2eaf4] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0f244a] font-display">
                    Secondary Circle (L2 Escalation / Neighbor)
                  </span>
                  <span className="text-[10px] font-bold bg-[#fef3c7] text-[#b45309] px-2 py-0.5 rounded-full uppercase">
                    L2 Backup
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Contact Name / Role
                  </label>
                  <input
                    type="text"
                    value={profileForm.secondary_contact_name}
                    onChange={(e) => setProfileForm({ ...profileForm, secondary_contact_name: e.target.value })}
                    className="w-full text-xs bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#0066ff] focus:outline-none"
                    placeholder="Dr. Aris (Neighbor)"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    value={profileForm.secondary_contact_email}
                    onChange={(e) => setProfileForm({ ...profileForm, secondary_contact_email: e.target.value })}
                    className="w-full text-xs bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#0066ff] focus:outline-none"
                    placeholder="neighbor@local.net"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Routine Grace Window Slider */}
          <div className="border-t border-[#edf2f7] pt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-[#0066ff]" />
                  <span>Default Routine Grace Buffer</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  How long past the learned KDE window to wait before opening a gentle family check-in.
                </p>
              </div>
              <span className="text-xs font-bold bg-[#edf5fe] text-[#0066ff] border border-[#d6e6f7] px-3 py-1 rounded-xl">
                +{profileForm.default_grace_min} mins
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {[
                { mins: 15, label: '15 Mins', desc: 'Tight Monitoring' },
                { mins: 30, label: '30 Mins (Default)', desc: 'Balanced Calm' },
                { mins: 45, label: '45 Mins', desc: 'High Senior Autonomy' },
                { mins: 60, label: '60 Mins', desc: 'Relaxed Weekend Pace' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.mins}
                  onClick={() => setProfileForm({ ...profileForm, default_grace_min: opt.mins })}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    profileForm.default_grace_min === opt.mins
                      ? 'bg-[#edf5fe] border-[#0066ff] ring-2 ring-[#0066ff]/20 text-[#0f244a]'
                      : 'bg-[#f8fafc] border-[#e2eaf4] hover:border-[#cbd5e1] text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold font-display">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-2 active:scale-95"
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Care Circle Preferences</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Away Mode / Travel Pause Card */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div>
          <h2 className="font-display font-extrabold text-lg text-[#0f244a]">
            Elder Dignity & Autonomy First
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
            Aging adults maintain complete control. When traveling or leaving for the weekend, {elderName} can pause routine check-ins with one tap.
          </p>
        </div>

        <div className="p-5 bg-[#fefcf3] border border-[#fae8b2] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-[#0f244a] font-display">
              Away Mode / Travel Pause
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {data?.away_until
                ? `Active until ${new Date(data.away_until).toLocaleDateString()} · Inactivity notifications are suppressed`
                : 'Currently active: Monitoring normal daily home rhythm'}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleAwayMode}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold transition shadow-sm active:scale-95 ${
              data?.away_until
                ? 'bg-[#0066ff] hover:bg-[#0052cc] text-white'
                : 'bg-[#d97706] hover:bg-[#b45309] text-white'
            }`}
          >
            {data?.away_until ? 'Resume Normal Check-In' : "I'm Going Away (Pause Alerts)"}
          </button>
        </div>
      </div>

      {/* 3. Privacy Architecture Card */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Lock className="w-5 h-5 text-[#0066ff]" />
          <h3 className="font-display font-extrabold text-base text-[#0f244a]">
            Data Minimization & Privacy Architecture
          </h3>
        </div>
        <div className="p-5 bg-[#f8fafc] rounded-2xl border border-[#e2eaf4] text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>• <strong>Zero Video Feeds:</strong> Live streaming (WHEP) and video recordings are never accessed, requested, or stored.</p>
          <p>• <strong>Zero Audio Recording:</strong> Microphone audio is completely bypassed; only ambient device triggers are ingested.</p>
          <p>• <strong>Timestamp-Only Metadata:</strong> The engine records only *when* an event occurs, never *what* is seen.</p>
          <p>• <strong>Automated 30-Day TTL:</strong> All raw signal records in Amazon DynamoDB are deleted automatically after 30 days.</p>
          <p>• <strong>HMAC-SHA256 Signature Verification:</strong> Inbound webhooks from Ring Developer API are validated using constant-time cryptographic checks over raw bytes.</p>
        </div>
      </div>

      {/* 4. Live Cryptographic Security Proofs */}
      <div className="bg-white border border-[#e2eaf4] rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#edf2f7] pb-4">
          <div>
            <h3 className="font-display font-extrabold text-base text-[#0f244a] flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#0066ff]" />
              <span>Live Cryptographic Security Verification</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Execute real-time cryptographic tests against the backend HMAC verifier, replay mitigator, and deduplicator.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunSecurityProof}
            disabled={loadingSecurity}
            className="bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95 flex items-center space-x-2 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSecurity ? 'animate-spin' : ''}`} />
            <span>{loadingSecurity ? 'Verifying...' : 'Run Security Proof'}</span>
          </button>
        </div>

        {securityProofs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {securityProofs.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-[#d1fae5] bg-[#f0fdf4] flex items-start space-x-3"
              >
                <CheckCircle className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#0f244a] font-display flex items-center space-x-2">
                    <span>{p.name}</span>
                    <span className="text-[10px] bg-[#d1fae5] text-[#059669] px-2 py-0.2 rounded-full font-mono font-bold">
                      PASSED
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">
                    {p.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#f8fafc] border border-dashed border-[#cbd5e1] text-center text-xs text-slate-500">
            Click <strong>Run Security Proof</strong> above to execute live timing-safe HMAC checks, tamper detection, clock drift tolerance, and idempotency tests against the live API.
          </div>
        )}
      </div>
    </div>
  );
}
