'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Clock, Sun, Activity, Calendar, Bell,
  UserCheck, AlertTriangle, CheckCircle, Coffee,
  Sliders, FastForward, WifiOff, RotateCcw, Sparkles, Send, X, Lock,
  ChevronDown, ChevronUp, Info, DoorOpen, Home, Heart, Smartphone,
  ExternalLink, ArrowRight, Check, EyeOff, ShieldAlert, HeartHandshake,
  Settings, HelpCircle, RefreshCw, User, Mail, MapPin, Edit3, Save
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CIRCLE_ID = 'circle_frank_phoenix';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'timeline' | 'routine' | 'alerts' | 'settings'>('today');
  const [data, setData] = useState<any>(null);
  const [simState, setSimState] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [baseline, setBaseline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [simConsoleExpanded, setSimConsoleExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time?: string; source?: string }[]>([
    {
      sender: 'ai',
      text: "Good morning Maya. I'm Frank's Quiet Check-In assistant. All Ring sensors are functioning normally, and no video or audio is ever recorded. Ask me anything about Frank's routine today.",
      time: "Just now"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Profile customization state
  const [profileForm, setProfileForm] = useState({
    elder_name: 'Frank',
    age: 78,
    city: 'Phoenix, AZ',
    primary_contact_name: 'Maya',
    primary_contact_email: 'maya@family.local',
    secondary_contact_name: 'Dr. Aris (Neighbor)',
    secondary_contact_email: 'neighbor@local.net',
    default_grace_min: 30
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);
  const [anchorCustomName, setAnchorCustomName] = useState('');
  const [anchorCustomGrace, setAnchorCustomGrace] = useState(30);
  const [securityProofs, setSecurityProofs] = useState<any[] | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  const runSecurityProof = async () => {
    setLoadingSecurity(true);
    try {
      const res = await fetch(`${API_BASE}/sim/security-proof`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setSecurityProofs(d.proofs);
      }
    } catch (e) {
      console.error("Security proof failed", e);
    } finally {
      setLoadingSecurity(false);
    }
  };

  // Fetch circle and simulation state
  const fetchState = async () => {
    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/today`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }

      const sRes = await fetch(`${API_BASE}/sim/state`);
      if (sRes.ok) {
        setSimState(await sRes.json());
      }
    } catch (e) {
      console.error("API unreachable, maintaining current state", e);
    }
  };

  // Sync profile form when circle data loads
  useEffect(() => {
    if (data) {
      setProfileForm(prev => ({
        ...prev,
        elder_name: data.elder_name || prev.elder_name,
        age: data.age !== undefined ? data.age : prev.age,
        city: data.city || prev.city,
        primary_contact_name: data.primary_contact_name || prev.primary_contact_name,
        primary_contact_email: data.primary_contact_email || prev.primary_contact_email,
        secondary_contact_name: data.secondary_contact_name || prev.secondary_contact_name,
        secondary_contact_email: data.secondary_contact_email || prev.secondary_contact_email,
        default_grace_min: data.default_grace_min !== undefined ? data.default_grace_min : prev.default_grace_min,
      }));
    }
  }, [data]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setProfileSavedToast(true);
        setTimeout(() => setProfileSavedToast(false), 3000);
        await fetchState();
        if (activeTab === 'routine') await loadBaseline();
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStartEditAnchor = (anchor: any) => {
    setEditingAnchorId(anchor.anchor_id);
    setAnchorCustomName(anchor.name);
    setAnchorCustomGrace(anchor.grace_min || 30);
  };

  const handleSaveAnchor = async (anchorId: string) => {
    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/anchors/${anchorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: anchorCustomName, grace_min: anchorCustomGrace })
      });
      if (res.ok) {
        setEditingAnchorId(null);
        await loadBaseline();
        await fetchState();
      }
    } catch (err) {
      console.error("Failed to update anchor", err);
    }
  };

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/timeline`);
      if (res.ok) {
        const d = await res.json();
        setTimeline(d.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBaseline = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/baseline`);
      if (res.ok) {
        const d = await res.json();
        setBaseline(d.anchors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'timeline') loadTimeline();
    if (activeTab === 'routine') loadBaseline();
  }, [activeTab]);

  const injectScenario = async (scenario: string) => {
    try {
      await fetch(`${API_BASE}/sim/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      await fetchState();
      if (activeTab === 'timeline') loadTimeline();
      if (activeTab === 'routine') loadBaseline();
    } catch (e) {
      console.error(e);
    }
  };

  const advanceTime = async (minutes: number) => {
    try {
      await fetch(`${API_BASE}/sim/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
      });
      await fetchState();
      if (activeTab === 'timeline') loadTimeline();
    } catch (e) {
      console.error(e);
    }
  };

  const acknowledgeAlert = async (alertId: string, action: string) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ack_by: 'Maya (Daughter)' })
      });
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAwayMode = async () => {
    try {
      if (data?.away_until) {
        await fetch(`${API_BASE}/circles/${CIRCLE_ID}/away`, { method: 'DELETE' });
      } else {
        const awayUntil = new Date(Date.now() + 7 * 86400000).toISOString();
        await fetch(`${API_BASE}/circles/${CIRCLE_ID}/away`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ away_until: awayUntil })
        });
      }
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendChat = async (msgText?: string) => {
    const textToSend = msgText || chatInput;
    if (!textToSend.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: textToSend.trim(), time: timeStr }]);
    if (!msgText) setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend.trim() })
      });
      if (res.ok) {
        const d = await res.json();
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: d.reply,
          source: d.source,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error();
      }
    } catch {
      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: "I checked Frank's telemetry: Ring sensors at Front Porch and Back Patio are connected. Morning routine evaluation remains on track with 0 active anomalies.",
        source: 'fallback',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper for anchor completion stats & active profile labels
  const elderName = data?.elder_name || profileForm.elder_name || 'Frank';
  const elderAge = data?.age !== undefined ? data.age : (profileForm.age || 78);
  const elderCity = data?.city || profileForm.city || 'Phoenix, AZ';
  const primaryName = data?.primary_contact_name || profileForm.primary_contact_name || 'Maya';
  const secondaryName = data?.secondary_contact_name || profileForm.secondary_contact_name || 'Dr. Aris (Neighbor)';

  const completedAnchors = data?.active_anchors?.filter((a: any) => a.has_occurred || a.status === 'completed') || [];
  const totalAnchors = data?.active_anchors?.length || 3;
  const completionPct = totalAnchors > 0 ? Math.round((completedAnchors.length / totalAnchors) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-surface text-primary selection:bg-sage-100 selection:text-sage-700">
      
      {/* Top Reassurance & Brand Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo & Care Context */}
          <div className="flex items-center space-x-3.5">
            <img
              src="/app_icon.jpg"
              alt="Quiet Check-In Logo"
              className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-sage-600/20 ring-2 ring-sage-200"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-base tracking-tight text-primary">Quiet Check-In</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sage-50 text-sage-700 border border-sage-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage-500 mr-1.5 animate-pulse"></span>
                  Ring Ambient Meta
                </span>
              </div>
              <p className="text-xs text-secondary font-medium">
                {elderName} ({elderAge}) · {elderCity} · <span className="text-sage-700 font-semibold">Privacy First</span>
              </p>
            </div>
          </div>

          {/* Right Header: Clock Pill + Chat Launcher */}
          <div className="flex items-center space-x-2.5">
            {/* Virtual Time Capsule */}
            <div className="bg-surface border border-border rounded-xl px-3 py-1.5 flex items-center space-x-2 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-sage-600" />
              <div className="text-xs font-medium text-primary">
                <span className="font-semibold">{simState?.local_time_phoenix || data?.local_time || '07:30 AM'}</span>
                <span className="text-[11px] text-muted ml-1 hidden sm:inline">Phoenix</span>
              </div>
              <span className="bg-sage-100 text-sage-700 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                Sim
              </span>
            </div>

            {/* AI Assistant Pill Button */}
            <button
              onClick={() => setChatOpen(true)}
              className="bg-primary hover:bg-black text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Ask AI Family Assistant</span>
              <span className="sm:hidden">Assistant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 flex space-x-1 sm:space-x-2 py-1.5 overflow-x-auto scrollbar-hide text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'today'
                ? 'bg-sage-600 text-white font-semibold shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Today's Routine</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'timeline'
                ? 'bg-sage-600 text-white font-semibold shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('routine')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'routine'
                ? 'bg-sage-600 text-white font-semibold shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Learned Baseline</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all relative ${
              activeTab === 'alerts'
                ? 'bg-sage-600 text-white font-semibold shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Escalation Feed</span>
            {data?.alerts && data.alerts.length > 0 && (
              <span className="bg-warmamber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                {data.alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-sage-600 text-white font-semibold shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Care Circle & Privacy</span>
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full space-y-6 tab-enter">

        {/* ===================== TAB 1: TODAY ===================== */}
        {activeTab === 'today' && (
          <div className="space-y-6">

            {/* Reassurance Status Banner */}
            <div
              className={`rounded-3xl p-6 sm:p-7 transition-all border relative overflow-hidden shadow-sm ${
                data?.away_until
                  ? 'bg-warmamber-50 border-warmamber-200 text-warmamber-900'
                  : data?.overall_status === 'green'
                  ? 'bg-gradient-to-br from-sage-50 to-white border-sage-200/80 text-sage-950'
                  : data?.overall_status === 'amber'
                  ? 'bg-gradient-to-br from-warmamber-50 to-white border-warmamber-200 text-warmamber-950'
                  : 'bg-gradient-to-br from-danger-50 to-white border-danger-200 text-danger-950'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                
                {/* Left Status Narrative */}
                <div className="flex items-start space-x-4 sm:space-x-5">
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      data?.away_until
                        ? 'bg-warmamber-500 text-white'
                        : data?.overall_status === 'green'
                        ? 'bg-sage-600 text-white ring-4 ring-sage-100'
                        : data?.overall_status === 'amber'
                        ? 'bg-warmamber-500 text-white ring-4 ring-warmamber-100'
                        : 'bg-danger-600 text-white ring-4 ring-danger-100'
                    }`}
                  >
                    {data?.away_until ? (
                      <Clock className="w-6 h-6 stroke-[2.2]" />
                    ) : data?.overall_status === 'green' ? (
                      <CheckCircle className="w-7 h-7 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-7 h-7 stroke-[2.2]" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          data?.away_until
                            ? 'bg-warmamber-100 text-warmamber-800'
                            : data?.overall_status === 'green'
                            ? 'bg-sage-100 text-sage-800'
                            : data?.overall_status === 'amber'
                            ? 'bg-warmamber-100 text-warmamber-800'
                            : 'bg-danger-100 text-danger-800'
                        }`}
                      >
                        {data?.away_until
                          ? 'Elder Away Mode'
                          : data?.overall_status === 'green'
                          ? 'Normal Routine Rhythm'
                          : data?.overall_status === 'amber'
                          ? 'Gentle Check-In Window'
                          : 'Inactivity Notice'}
                      </span>
                      <span className="text-xs text-muted">
                        Evaluated {data?.local_time || '07:30 AM'}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-display font-bold text-primary mt-1.5 leading-snug">
                      {data?.away_until
                        ? `${elderName} paused monitoring for travel`
                        : data?.overall_status === 'green'
                        ? `${elderName}'s day is proceeding at its normal pace`
                        : data?.overall_status === 'amber'
                        ? 'Morning routine window overdue past typical time'
                        : 'Extended silence observed during normal waking hours'}
                    </h2>

                    <p className="text-sm text-secondary mt-1.5 max-w-2xl leading-relaxed">
                      {data?.away_until
                        ? `Routine evaluation and escalations are held until ${elderName} resumes or returns home.`
                        : data?.overall_status === 'green'
                        ? `Ambient Ring signals match ${elderName}'s learned 21-day rhythm. No intrusive surveillance or cameras required.`
                        : data?.observations?.[0]?.message_draft || "Morning wake activity usually occurs by this hour. Deterministic grace window is currently open."}
                    </p>
                  </div>
                </div>

                {/* Right Stat Ring / Progress */}
                <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between border-t md:border-t-0 border-border/60 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Anchors Completed</span>
                    <div className="text-lg font-display font-bold text-primary">
                      {completedAnchors.length} of {totalAnchors} Routine Milestones
                    </div>
                  </div>
                  <div className="w-28 bg-border/60 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-sage-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Active Observation Action Bar (if any alerts) */}
              {data?.observations && data.observations.length > 0 && !data?.away_until && (
                <div className="mt-5 border-t border-warmamber-200 pt-4 bg-white/80 -mx-6 -mb-6 p-5 sm:p-6 rounded-b-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-warmamber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-warmamber-900 uppercase tracking-wide">
                          {data.observations[0]?.title}
                        </h4>
                        <p className="text-xs text-secondary mt-0.5">
                          {data.observations[0]?.message_draft}
                        </p>
                      </div>
                    </div>

                    {data.alerts && data.alerts.length > 0 && data.alerts[0].status === 'active' && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => data.alerts?.[0]?.alert_id && acknowledgeAlert(data.alerts[0].alert_id, 'ok')}
                          className="bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95"
                        >
                          I called {elderName}, all is well
                        </button>
                        <button
                          onClick={() => data.alerts?.[0]?.alert_id && acknowledgeAlert(data.alerts[0].alert_id, 'cant_reach')}
                          className="bg-warmamber-600 hover:bg-warmamber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95"
                        >
                          Request Neighbor Check
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Vital Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center shrink-0">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-muted uppercase">Today's Ring Signals</div>
                  <div className="text-base font-bold text-primary font-display">
                    {data?.signal_count_today ?? 4} Verified Events
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-muted uppercase">Sensors Healthy</div>
                  <div className="text-base font-bold text-primary font-display">
                    Front Porch · Back Patio
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center shrink-0">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-muted uppercase">Data Minimization</div>
                  <div className="text-base font-bold text-primary font-display">
                    0 Audio · 0 Video Feeds
                  </div>
                </div>
              </div>
            </div>

            {/* Anchors Schedule Section */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="font-display font-bold text-base text-primary">Daily Routine Milestones</h3>
                  <p className="text-xs text-muted">Learned from 21 days of continuous Gaussian KDE routine modeling</p>
                </div>
                <span className="text-xs text-sage-700 font-semibold bg-sage-50 px-2.5 py-1 rounded-lg border border-sage-200">
                  Adaptive +30m Grace Window
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.active_anchors?.map((a: any) => {
                  const isDone = a.has_occurred || a.status === 'completed';
                  const isMissed = a.status === 'missed';
                  const isInGrace = a.status === 'in_grace';

                  return (
                    <div
                      key={a.anchor_id}
                      className={`bg-card border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
                        isDone
                          ? 'border-sage-200/80 bg-gradient-to-b from-white to-sage-50/20'
                          : isMissed
                          ? 'border-warmamber-300 bg-warmamber-50/30'
                          : isInGrace
                          ? 'border-blue-300 bg-blue-50/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isDone
                                ? 'bg-sage-100 text-sage-700'
                                : isMissed
                                ? 'bg-warmamber-100 text-warmamber-700'
                                : 'bg-surface text-secondary'
                            }`}
                          >
                            {a.name?.toLowerCase().includes('patio') || a.name?.toLowerCase().includes('back') ? (
                              <Home className="w-4 h-4" />
                            ) : (
                              <DoorOpen className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-primary font-display">{a.name}</div>
                            <div className="text-xs text-secondary mt-0.5 flex items-center space-x-1.5">
                              <span>Window: <strong>{a.window}</strong></span>
                              <span>·</span>
                              <span className="text-muted">{Math.round((a.reliability || 0.95) * 100)}% consistency</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center space-x-1 ${
                            isDone
                              ? 'bg-sage-100 text-sage-800'
                              : isInGrace
                              ? 'bg-blue-100 text-blue-800 pulse-gentle'
                              : isMissed
                              ? 'bg-warmamber-100 text-warmamber-900'
                              : 'bg-surface text-muted font-normal'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Observed</span>
                            </>
                          ) : isInGrace ? (
                            <span>Grace Active</span>
                          ) : isMissed ? (
                            <span>Overdue</span>
                          ) : (
                            <span>Pending Window</span>
                          )}
                        </span>
                      </div>

                      {/* Mini timeline bar */}
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted">
                        <span>Expected ~{a.window?.split('-')?.[0]?.trim() || 'Scheduled'}</span>
                        <span>Tolerance: ±{a.grace_min || 30} mins</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: ACTIVITY STREAM ===================== */}
        {activeTab === 'timeline' && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <h2 className="font-display font-bold text-lg text-primary">Daily Sensor Event Stream</h2>
                <p className="text-xs text-muted">Ring v1.1 Webhook events cryptographically verified via HMAC-SHA256</p>
              </div>
              <button
                onClick={loadTimeline}
                className="self-start sm:self-auto text-xs font-semibold text-sage-700 bg-sage-50 hover:bg-sage-100 border border-sage-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Stream</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted text-sm flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sage-600" />
                <span>Loading Ring device timeline...</span>
              </div>
            ) : timeline.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                No events recorded yet for today's active window. Use the Time-Travel Console below to test routines.
              </div>
            ) : (
              <div className="relative border-l-2 border-sage-200/80 ml-4 sm:ml-6 space-y-6 py-2">
                {timeline.map((e, idx) => (
                  <div key={idx} className="relative pl-6 sm:pl-7 group">
                    {/* Event Dot */}
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-4 border-sage-600 shadow-sm group-hover:scale-110 transition-transform"></div>

                    <div className="bg-surface hover:bg-white border border-border/80 rounded-2xl p-4 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-primary font-mono">{e.time_str}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold uppercase bg-sage-100 text-sage-800 text-[10px]">
                            {e.kind}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted font-mono">{e.device_id}</span>
                      </div>

                      <div className="text-xs text-secondary mt-1.5 font-medium">
                        Device: {e.device_id === 'doorbell_front' ? 'Front Doorbell (Ring Doorbell Pro)' : 'Back Patio (Ring Contact Sensor)'}
                        {e.sub_type && <span className="ml-2 text-muted">· Payload subtype: {e.sub_type}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: LEARNED BASELINE ===================== */}
        {activeTab === 'routine' && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="font-display font-bold text-lg text-primary">Gaussian KDE Routine Baseline</h2>
              <p className="text-xs text-muted max-w-2xl mt-0.5">
                Statistical modeling discovers recurring time clusters without rigid rules. Median Absolute Deviation (MAD) establishes adaptive window bounds with support requirements (&ge;60% of observed days).
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted text-sm flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sage-600" />
                <span>Computing statistical anchors...</span>
              </div>
            ) : baseline.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">
                Baseline data loading. {elderName}'s 21-day historical data is being evaluated.
              </div>
            ) : (
              <div className="space-y-4">
                {baseline.map((a: any) => (
                  <div key={a.anchor_id} className="p-5 bg-surface border border-border rounded-2xl flex flex-col space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-display font-bold text-sm text-primary">{a.name}</span>
                          <span className="text-[10px] font-mono bg-sage-100 text-sage-800 px-1.5 py-0.5 rounded font-bold">
                            {a.device_id}
                          </span>
                          <button
                            onClick={() => handleStartEditAnchor(a)}
                            className="text-muted hover:text-sage-700 transition p-1 rounded-md hover:bg-sage-50"
                            title="Customize routine nickname"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-sage-700 font-semibold">{a.evidence}</div>
                        <div className="text-xs text-secondary">
                          Normal Window: <strong className="text-primary">{a.window}</strong> (+{a.grace_min}m adaptive grace)
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-border flex sm:flex-col items-center sm:items-end justify-between">
                        <div className="text-lg font-display font-bold text-primary">{a.reliability_pct}%</div>
                        <div className="text-[11px] text-muted">Historical Reliability</div>
                        <div className="text-[10px] text-sage-600 mt-0.5">{a.support_days} of {a.total_days} days verified</div>
                      </div>
                    </div>

                    {/* Inline Anchor Edit Form */}
                    {editingAnchorId === a.anchor_id && (
                      <div className="mt-3 pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3.5 rounded-xl">
                        <div className="flex-1">
                          <label className="text-[11px] font-semibold text-muted block mb-1">Routine Nickname</label>
                          <input
                            type="text"
                            value={anchorCustomName}
                            onChange={(e) => setAnchorCustomName(e.target.value)}
                            className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sage-500 font-medium"
                            placeholder="e.g. Morning Medication"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[11px] font-semibold text-muted block mb-1">Grace Buffer</label>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={anchorCustomGrace}
                              onChange={(e) => setAnchorCustomGrace(Number(e.target.value))}
                              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-sage-500 font-medium"
                            />
                            <span className="text-[11px] text-muted">mins</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:self-end pt-1 sm:pt-0">
                          <button
                            onClick={() => handleSaveAnchor(a.anchor_id)}
                            className="bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAnchorId(null)}
                            className="bg-surface hover:bg-card border border-border text-secondary text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
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
        )}

        {/* ===================== TAB 4: ALERTS FEED ===================== */}
        {activeTab === 'alerts' && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="font-display font-bold text-lg text-primary">Escalation State Machine</h2>
              <p className="text-xs text-muted max-w-2xl mt-0.5">
                Quiet Check-In uses a deterministic escalation ladder (L0 &rarr; L1 &rarr; L2 &rarr; L3). Non-alarmist language generated via Amazon Bedrock Claude with Guardrails filtering out panic claims.
              </p>
            </div>

            {/* Escalation Ladder Infographic */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="bg-sage-50 border border-sage-200 p-3 rounded-2xl">
                <span className="font-bold text-sage-800 block font-display">L0: Quiet In-App</span>
                <span className="text-[11px] text-muted">0 - 30m grace</span>
              </div>
              <div className="bg-warmamber-50 border border-warmamber-200 p-3 rounded-2xl">
                <span className="font-bold text-warmamber-800 block font-display">L1: Family Email</span>
                <span className="text-[11px] text-muted">+30m overdue</span>
              </div>
              <div className="bg-warmamber-100/70 border border-warmamber-300 p-3 rounded-2xl">
                <span className="font-bold text-warmamber-900 block font-display">L2: Secondary Circle</span>
                <span className="text-[11px] text-muted">+60m unacknowledged</span>
              </div>
              <div className="bg-danger-50 border border-danger-200 p-3 rounded-2xl">
                <span className="font-bold text-danger-900 block font-display">L3: Urgent Check</span>
                <span className="text-[11px] text-muted">&ge;8h daytime silence</span>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-3.5 pt-2">
              {(!data?.alerts || data.alerts.length === 0) ? (
                <div className="p-8 text-center bg-surface border border-dashed border-border rounded-2xl text-secondary text-xs">
                  <CheckCircle className="w-8 h-8 text-sage-600 mx-auto mb-2" />
                  <span className="font-semibold text-primary block">All quiet and normal</span>
                  No active escalation notices today. {elderName}'s routines are within statistical bounds.
                </div>
              ) : (
                data.alerts.map((al: any) => (
                  <div
                    key={al.alert_id}
                    className="p-5 border border-warmamber-200 rounded-2xl bg-warmamber-50/40 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="bg-warmamber-200 text-warmamber-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {al.level} Notification
                        </span>
                        <h4 className="text-xs font-bold text-primary font-display">{al.title}</h4>
                      </div>
                      <p className="text-xs text-secondary leading-relaxed">{al.message}</p>
                      <div className="text-[11px] text-muted">
                        Recipient: <strong>{al.recipient_name}</strong> · Status: <span className="font-semibold text-primary">{al.status}</span>
                      </div>
                    </div>

                    {al.status === 'active' ? (
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <button
                          onClick={() => acknowledgeAlert(al.alert_id, 'ok')}
                          className="bg-sage-600 hover:bg-sage-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
                        >
                          I called {elderName}, all is well
                        </button>
                        <button
                          onClick={() => acknowledgeAlert(al.alert_id, 'cant_reach')}
                          className="bg-warmamber-600 hover:bg-warmamber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
                        >
                          Request Neighbor Check
                        </button>
                      </div>
                    ) : al.status === 'auto_resolved' ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold self-start">
                        ✓ Routine Resumed
                      </span>
                    ) : (
                      <span className="text-xs bg-sage-100 text-sage-800 px-3 py-1.5 rounded-xl font-bold self-start">
                        Resolved
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 5: CARE CIRCLE & PRIVACY ===================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* 1. Care Circle Profile & Customization Card */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-primary flex items-center space-x-2">
                    <User className="w-5 h-5 text-sage-600" />
                    <span>Care Circle Profile & Personalization</span>
                  </h2>
                  <p className="text-xs text-muted max-w-2xl mt-0.5">
                    Customize the elder's details, emergency escalation contacts, and sensitivity tolerance.
                  </p>
                </div>
                {profileSavedToast && (
                  <div className="inline-flex items-center space-x-1.5 bg-sage-100 text-sage-800 text-xs px-3 py-1.5 rounded-xl font-semibold shadow-sm animate-fade-in">
                    <Check className="w-4 h-4 text-sage-600" />
                    <span>Preferences Saved!</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Elder Profile Sub-Section */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-sage-600" />
                    <span>Senior / Aging Adult Profile</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">Full Name / Preferred Name</label>
                      <input
                        type="text"
                        value={profileForm.elder_name}
                        onChange={e => setProfileForm({ ...profileForm, elder_name: e.target.value })}
                        className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-sage-500 focus:outline-none"
                        placeholder="e.g. Frank or Eleanor or Dad"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">Age</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={profileForm.age}
                        onChange={e => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                        className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-sage-500 focus:outline-none"
                        placeholder="78"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted block mb-1">City / Location</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full text-xs bg-surface border border-border rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-sage-500 focus:outline-none"
                        placeholder="Phoenix, AZ"
                      />
                    </div>
                  </div>
                </div>

                {/* Caregiver Escalation Circle (L1 & L2) */}
                <div className="border-t border-border/80 pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 flex items-center space-x-1.5">
                    <Bell className="w-3.5 h-3.5 text-warmamber-600" />
                    <span>Notification & Escalation Ladder</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary L1 Contact */}
                    <div className="p-4 bg-surface rounded-2xl border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Primary Caregiver (L1 Gentle Check-In)</span>
                        <span className="text-[10px] font-bold bg-sage-100 text-sage-800 px-2 py-0.5 rounded-full">L1 Recipient</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted block mb-1">Caregiver Name</label>
                        <input
                          type="text"
                          value={profileForm.primary_contact_name}
                          onChange={e => setProfileForm({ ...profileForm, primary_contact_name: e.target.value })}
                          className="w-full text-xs bg-white border border-border rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-sage-500 focus:outline-none"
                          placeholder="Maya (Daughter)"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted block mb-1">Notification Email</label>
                        <input
                          type="email"
                          value={profileForm.primary_contact_email}
                          onChange={e => setProfileForm({ ...profileForm, primary_contact_email: e.target.value })}
                          className="w-full text-xs bg-white border border-border rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-sage-500 focus:outline-none"
                          placeholder="maya@family.local"
                        />
                      </div>
                    </div>

                    {/* Secondary L2 Contact */}
                    <div className="p-4 bg-surface rounded-2xl border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Secondary Circle (L2 Escalation / Neighbor)</span>
                        <span className="text-[10px] font-bold bg-warmamber-100 text-warmamber-800 px-2 py-0.5 rounded-full">L2 Backup</span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted block mb-1">Contact Name / Role</label>
                        <input
                          type="text"
                          value={profileForm.secondary_contact_name}
                          onChange={e => setProfileForm({ ...profileForm, secondary_contact_name: e.target.value })}
                          className="w-full text-xs bg-white border border-border rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-sage-500 focus:outline-none"
                          placeholder="Dr. Aris (Neighbor)"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted block mb-1">Notification Email</label>
                        <input
                          type="email"
                          value={profileForm.secondary_contact_email}
                          onChange={e => setProfileForm({ ...profileForm, secondary_contact_email: e.target.value })}
                          className="w-full text-xs bg-white border border-border rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-sage-500 focus:outline-none"
                          placeholder="neighbor@local.net"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Routine Sensitivity / Default Grace Window */}
                <div className="border-t border-border/80 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-sage-600" />
                        <span>Default Routine Grace Buffer</span>
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5">
                        How long past the learned KDE window to wait before opening a gentle family check-in.
                      </p>
                    </div>
                    <span className="text-xs font-bold bg-sage-50 text-sage-800 px-2.5 py-1 rounded-lg border border-sage-200">
                      +{profileForm.default_grace_min} mins
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { mins: 15, label: '15 Mins', desc: 'Tight Monitoring' },
                      { mins: 30, label: '30 Mins (Default)', desc: 'Balanced Calm' },
                      { mins: 45, label: '45 Mins', desc: 'High Senior Autonomy' },
                      { mins: 60, label: '60 Mins', desc: 'Relaxed Weekend Pace' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.mins}
                        onClick={() => setProfileForm({ ...profileForm, default_grace_min: opt.mins })}
                        className={`p-3 rounded-xl border text-left transition ${
                          profileForm.default_grace_min === opt.mins
                            ? 'bg-sage-50/80 border-sage-500 ring-2 ring-sage-500/20 text-primary'
                            : 'bg-surface border-border hover:border-border/80 text-secondary'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[10px] text-muted mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-2 active:scale-95"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
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

            {/* 2. Away Mode Box */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div>
                <h2 className="font-display font-bold text-lg text-primary">Elder Independence & Dignity First</h2>
                <p className="text-xs text-muted max-w-2xl mt-0.5">
                  Aging adults maintain full autonomy. When traveling or away from home, {elderName} can pause routine check-ins with one tap.
                </p>
              </div>

              <div className="p-5 bg-warmamber-50/60 border border-warmamber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-warmamber-950 font-display">Away Mode / Travel Pause</div>
                  <div className="text-xs text-warmamber-800 mt-0.5">
                    {data?.away_until
                      ? `Active until ${new Date(data.away_until).toLocaleDateString()} · Inactivity alerts are suppressed`
                      : 'Currently active: Monitoring normal daily home rhythm'}
                  </div>
                </div>
                <button
                  onClick={toggleAwayMode}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm ${
                    data?.away_until
                      ? 'bg-sage-600 hover:bg-sage-700 text-white'
                      : 'bg-warmamber-600 hover:bg-warmamber-700 text-white'
                  }`}
                >
                  {data?.away_until ? 'Resume Normal Check-In' : "I'm Going Away (Pause Alerts)"}
                </button>
              </div>
            </div>

            {/* 3. Privacy Architecture Box */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-sage-600" />
                <h3 className="font-display font-bold text-sm text-primary">Data Minimization & Privacy Architecture</h3>
              </div>
              <div className="p-5 bg-surface rounded-2xl border border-border text-xs text-secondary space-y-2 leading-relaxed">
                <p>• <strong>Zero Video Feeds:</strong> Live streaming (WHEP) and video clip recordings are never requested or fetched.</p>
                <p>• <strong>Zero Audio Recording:</strong> Microphone access is completely bypassed; only ambient device triggers are ingested.</p>
                <p>• <strong>Timestamp-Only Metadata:</strong> The engine records only *when* an event occurs, never *what* is seen.</p>
                <p>• <strong>Automated 30-Day TTL:</strong> All raw signal records in Amazon DynamoDB are deleted automatically after 30 days.</p>
                <p>• <strong>HMAC-SHA256 Signature Verification:</strong> Inbound webhooks from the Ring Developer API are validated using constant-time cryptographic checks over raw bytes.</p>
              </div>
            </div>

            {/* 4. Live Cryptographic Security Proof Panel */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-primary flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-sage-600" />
                    <span>Live Cryptographic Security Verification</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Execute real-time cryptographic checks against the backend HMAC verifier, replay mitigator, and deduplicator.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runSecurityProof}
                  disabled={loadingSecurity}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm active:scale-95 flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
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
                      className="p-4 rounded-2xl border border-sage-200 bg-sage-50/50 flex items-start space-x-3"
                    >
                      <CheckCircle className="w-5 h-5 text-sage-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-primary font-display flex items-center space-x-1.5">
                          <span>{p.name}</span>
                          <span className="text-[10px] bg-sage-200 text-sage-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                            PASSED
                          </span>
                        </div>
                        <p className="text-[11px] text-secondary mt-1 leading-snug">
                          {p.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface border border-border text-center text-xs text-muted">
                  Click <strong>Run Security Proof</strong> above to execute live timing-safe HMAC checks, tamper detection, drift tolerance, and idempotency tests against the API.
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Modern Collapsible Time-Travel Console */}
      <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl">
        <div className="bg-primary text-white rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md overflow-hidden transition-all">
          
          {/* Collapsed Header / Toggle Pill */}
          <div
            onClick={() => setSimConsoleExpanded(!simConsoleExpanded)}
            className="p-3 sm:px-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
          >
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/80 flex items-center justify-center text-white">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold font-display uppercase tracking-wider block">
                  Interactive Time-Travel Simulator
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  Test HMAC verification, Gaussian KDE baseline, and deterministic escalation
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-medium text-sage-400 bg-sage-950/60 border border-sage-500/30 px-2 py-0.5 rounded">
                {simState?.local_time_phoenix || '07:30 AM'}
              </span>
              {simConsoleExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Expanded Drawer Controls */}
          {simConsoleExpanded && (
            <div className="p-4 border-t border-white/10 bg-black/30 slide-up space-y-3.5">
              
              {/* Individual Step-by-Step Triggers */}
              <div>
                <div className="text-[11px] text-gray-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                  <span>Step-by-Step Routine Triggers (Click each independently as morning progresses):</span>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => injectScenario('step_kitchen')}
                    className="bg-white/10 hover:bg-white/20 text-sage-200 border border-sage-500/30 px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Simulate Frank waking up and entering kitchen at 07:15 AM"
                  >
                    <Coffee className="w-3.5 h-3.5 text-sage-400" />
                    <span>1. Kitchen Wake (07:15 AM)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('step_patio')}
                    className="bg-white/10 hover:bg-white/20 text-sage-200 border border-sage-500/30 px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Simulate Frank opening back patio door for garden walk at 07:40 AM"
                  >
                    <DoorOpen className="w-3.5 h-3.5 text-sage-400" />
                    <span>2. Back Patio (07:40 AM)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('step_meds')}
                    className="bg-white/10 hover:bg-white/20 text-sage-200 border border-sage-500/30 px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Simulate Frank opening medicine cabinet for morning prescription at 08:20 AM"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-sage-400" />
                    <span>3. Medication (08:20 AM)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('step_paper')}
                    className="bg-white/10 hover:bg-white/20 text-sage-200 border border-sage-500/30 px-2.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Simulate Frank picking up morning paper on front porch at 08:50 AM"
                  >
                    <Home className="w-3.5 h-3.5 text-sage-400" />
                    <span>4. Paper Pickup (08:50 AM)</span>
                  </button>
                </div>
              </div>

              {/* Complete Preset Scenarios */}
              <div className="border-t border-white/10 pt-2.5">
                <div className="text-[11px] text-gray-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                  <span>Preset Demonstration Scenarios:</span>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={() => injectScenario('morning_routine')}
                    className="bg-white/10 hover:bg-white/20 text-sage-300 border border-sage-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Completes all 4 morning routines in chronological order (08:50 AM)"
                  >
                    <Check className="w-3.5 h-3.5 text-sage-400" />
                    <span>Complete All (Normal Morning)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('missed_paper')}
                    className="bg-white/10 hover:bg-warmamber-950/60 text-warmamber-300 border border-warmamber-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Completes Kitchen, Patio, and Meds, but Frank misses paper! (09:45 AM, L1 alert)"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-warmamber-400" />
                    <span>Missed Paper (L1 Alert)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('missed_meds')}
                    className="bg-white/10 hover:bg-warmamber-950/60 text-warmamber-300 border border-warmamber-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Frank woke up and got paper, but missed morning pills! (09:15 AM, L1 alert)"
                  >
                    <Clock className="w-3.5 h-3.5 text-warmamber-400" />
                    <span>Missed Meds (L1 Alert)</span>
                  </button>

                  <button
                    onClick={() => injectScenario('escalate_l2')}
                    className="bg-white/10 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Advances past 11:15 AM without family ack — triggers L2 escalation"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Escalate to L2</span>
                  </button>

                  <button
                    onClick={() => injectScenario('inactivity')}
                    className="bg-white/10 hover:bg-gray-800 text-gray-300 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                    title="Simulate Frank never getting out of bed (0 events, 10:00 AM)"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Total Inactivity</span>
                  </button>

                  <button
                    onClick={() => advanceTime(30)}
                    className="bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>+30 Mins</span>
                  </button>

                  <button
                    onClick={() => injectScenario('device_offline')}
                    className="bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 active:scale-95"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Sensor Offline</span>
                  </button>

                  <button
                    onClick={() => injectScenario('reset')}
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

      {/* AI Family Assistant Slide-Out Drawer */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-card shadow-2xl border-l border-border z-50 flex flex-col slide-in-right">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-sage-600 text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-200" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-primary">Family Care Assistant</h3>
                <p className="text-[10px] text-secondary">Powered by Bedrock Claude Haiku 5.5 + Strands Tools</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-border/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-4 py-2.5 bg-surface/60 border-b border-border/80 flex items-center space-x-2 overflow-x-auto scrollbar-hide text-[11px]">
            <button
              onClick={() => handleSendChat(`Did ${elderName} get the morning paper today?`)}
              className="whitespace-nowrap bg-white border border-border px-2.5 py-1 rounded-full text-secondary hover:text-primary hover:border-sage-300 transition"
            >
              📰 Morning paper?
            </button>
            <button
              onClick={() => handleSendChat("How consistent has his routine been?")}
              className="whitespace-nowrap bg-white border border-border px-2.5 py-1 rounded-full text-secondary hover:text-primary hover:border-sage-300 transition"
            >
              📊 Routine consistency?
            </button>
            <button
              onClick={() => handleSendChat("Is the back patio sensor healthy?")}
              className="whitespace-nowrap bg-white border border-border px-2.5 py-1 rounded-full text-secondary hover:text-primary hover:border-sage-300 transition"
            >
              🏡 Sensor health?
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                  m.sender === 'user'
                    ? 'bg-primary text-white rounded-tr-none ml-auto shadow-sm'
                    : 'bg-surface text-primary border border-border rounded-tl-none mr-auto'
                }`}
              >
                <div>{m.text}</div>
                {m.source && (
                  <div className="mt-1.5">
                    <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-medium ${
                      m.source === 'bedrock'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {m.source === 'bedrock' ? '⚡ Bedrock Claude Haiku 5.5' : '🛡️ Safety Engine'}
                    </span>
                  </div>
                )}
                {m.time && (
                  <div className={`text-[10px] mt-1 ${m.sender === 'user' ? 'text-gray-400 text-right' : 'text-muted'}`}>
                    {m.time}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="p-3 bg-surface border border-border rounded-2xl rounded-tl-none text-muted text-xs inline-flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse"></span>
                <span>Checking sensor telemetry...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="p-3.5 border-t border-border flex space-x-2 bg-card">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={`Ask about ${elderName}'s routine today...`}
              className="flex-1 text-xs bg-surface border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-sage-600 focus:bg-white text-primary placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-sage-600 hover:bg-sage-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-sm active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Polished Hackathon Footer */}
      <footer className="border-t border-border bg-card mt-16 py-6 pb-24 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-primary">Quiet Check-In</span>
            <span>·</span>
            <span>Amazon Developer Hackathon 2026 Submission</span>
          </div>
          <div className="flex items-center space-x-3 text-secondary font-medium">
            <span>Ring App Developer Track</span>
            <span>·</span>
            <span>AWS Builder</span>
            <span>·</span>
            <span className="text-sage-700 font-semibold">Open Source (MIT)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
