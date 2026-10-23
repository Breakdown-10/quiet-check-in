'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader, DashboardTab } from './components/TopHeader';
import { TodayRoutineView } from './components/TodayRoutineView';
import { EscalationView } from './components/EscalationView';
import { ActivityStreamView } from './components/ActivityStreamView';
import { LearnedBaselineView } from './components/LearnedBaselineView';
import { CareCircleView } from './components/CareCircleView';
import { HistoryView } from './components/HistoryView';
import { TimeTravelConsole } from './components/TimeTravelConsole';
import { AIChatPanel, ChatMessage } from './components/AIChatPanel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CIRCLE_ID = 'circle_frank_phoenix';

export default function DashboardPage() {
  const [currentSection, setCurrentSection] = useState<'home' | 'history' | 'settings'>('home');
  const [activeTab, setActiveTab] = useState<DashboardTab>('today');
  const [data, setData] = useState<any>(null);
  const [simState, setSimState] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [baseline, setBaseline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [simConsoleExpanded, setSimConsoleExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Clean chat history - created only when user chats with AI
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
    default_grace_min: 30,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);
  const [anchorCustomName, setAnchorCustomName] = useState('');
  const [anchorCustomGrace, setAnchorCustomGrace] = useState(30);
  const [securityProofs, setSecurityProofs] = useState<any[] | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

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
      console.error('API unreachable, maintaining current state', e);
    }
  };

  const runSecurityProof = async () => {
    setLoadingSecurity(true);
    try {
      const res = await fetch(`${API_BASE}/sim/security-proof`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setSecurityProofs(d.proofs);
      }
    } catch (e) {
      console.error('Security proof failed', e);
    } finally {
      setLoadingSecurity(false);
    }
  };

  // Sync profile form when circle data loads
  useEffect(() => {
    if (data) {
      setProfileForm((prev) => ({
        ...prev,
        elder_name: data.elder_name || prev.elder_name,
        age: data.age !== undefined ? data.age : prev.age,
        city: data.city || prev.city,
        primary_contact_name: data.primary_contact_name || prev.primary_contact_name,
        primary_contact_email: data.primary_contact_email || prev.primary_contact_email,
        secondary_contact_name: data.secondary_contact_name || prev.secondary_contact_name,
        secondary_contact_email: data.secondary_contact_email || prev.secondary_contact_email,
        default_grace_min:
          data.default_grace_min !== undefined ? data.default_grace_min : prev.default_grace_min,
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
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        setProfileSavedToast(true);
        setTimeout(() => setProfileSavedToast(false), 3000);
        await fetchState();
        if (activeTab === 'routine') await loadBaseline();
      }
    } catch (err) {
      console.error('Failed to save profile', err);
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
        body: JSON.stringify({ name: anchorCustomName, grace_min: anchorCustomGrace }),
      });
      if (res.ok) {
        setEditingAnchorId(null);
        await loadBaseline();
        await fetchState();
      }
    } catch (err) {
      console.error('Failed to update anchor', err);
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
        body: JSON.stringify({ scenario }),
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
        body: JSON.stringify({ minutes }),
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
        body: JSON.stringify({ action, ack_by: 'Maya (Daughter)' }),
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
          body: JSON.stringify({ away_until: awayUntil }),
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
    setChatMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, sender: 'user', text: textToSend.trim(), time: timeStr },
    ]);
    if (!msgText) setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/circles/${CIRCLE_ID}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: d.reply,
            source: d.source,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showActions: textToSend.toLowerCase().includes('tired') || textToSend.toLowerCase().includes('breathe'),
          },
        ]);
      } else {
        throw new Error();
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: `I checked ${elderName}'s telemetry: Ring sensors at Front Porch and Back Patio are connected. Morning routine evaluation remains on track with 0 active anomalies.`,
          source: 'fallback',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showActions: false,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper variables
  const elderName = data?.elder_name || profileForm.elder_name || 'Frank';
  const elderAge = data?.age !== undefined ? data.age : profileForm.age || 78;
  const elderCity = data?.city || profileForm.city || 'Phoenix, AZ';
  const localTime = simState?.local_time_phoenix || data?.local_time || '8:15 AM';
  const activeAlerts = data?.alerts || [];
  const alertsCount = activeAlerts.filter((a: any) => a.status === 'active').length;
  const elderInitials = elderName.length >= 2 ? elderName.substring(0, 2).toUpperCase() : 'FR';

  const handleSidebarSelect = (section: 'home' | 'history' | 'settings') => {
    setCurrentSection(section);
    if (section === 'home') {
      setActiveTab('today');
    } else if (section === 'settings') {
      setActiveTab('settings');
    }
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F8FC] text-[#0F244A] selection:bg-[#dbeafe] selection:text-[#0052cc]">
      {/* Desktop Sidebar matching Image 1 & Image 2 */}
      <div className="hidden md:flex">
        <Sidebar
          currentSection={currentSection}
          onSelectSection={handleSidebarSelect}
          elderName={elderName}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 max-w-xs w-full bg-[#0353c7]">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/80 p-2 z-20"
            >
              <X className="w-6 h-6" />
            </button>
            <Sidebar
              currentSection={currentSection}
              onSelectSection={handleSidebarSelect}
              elderName={elderName}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-36">
        {/* Mobile Header Bar */}
        <div className="md:hidden bg-[#0353c7] text-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-xl hover:bg-white/10 transition"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-display font-bold text-base">Quiet Check-In</span>
          <div className="w-8 h-8 rounded-full bg-[#0077ff] text-white font-bold flex items-center justify-center text-xs">
            {elderInitials}
          </div>
        </div>

        {/* Viewport Container with Side-by-Side Companion Panel */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Top Header with Greeting, Time Pill, AI Assistant & Sub-Tabs */}
          <TopHeader
            elderName={elderName}
            elderAge={elderAge}
            elderCity={elderCity}
            localTime={localTime}
            isSim={true}
            activeTab={activeTab}
            chatOpen={chatOpen}
            onSelectTab={(tab) => {
              setCurrentSection('home');
              setActiveTab(tab);
            }}
            onOpenChat={() => setChatOpen(!chatOpen)}
            alertsCount={alertsCount}
          />

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Left & Center Main Dashboard Viewport */}
            <main className="flex-1 w-full min-w-0 space-y-6">
              {/* Section Routing */}
              {currentSection === 'history' ? (
                <HistoryView elderName={elderName} />
              ) : activeTab === 'today' ? (
                <TodayRoutineView
                  elderName={elderName}
                  data={data}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                />
              ) : activeTab === 'alerts' ? (
                <EscalationView
                  elderName={elderName}
                  alerts={activeAlerts}
                  onAcknowledgeAlert={acknowledgeAlert}
                />
              ) : activeTab === 'timeline' ? (
                <ActivityStreamView
                  timeline={timeline}
                  loading={loading}
                  onRefresh={loadTimeline}
                  elderName={elderName}
                  data={data}
                />
              ) : activeTab === 'routine' ? (
                <LearnedBaselineView
                  baseline={baseline}
                  loading={loading}
                  elderName={elderName}
                  editingAnchorId={editingAnchorId}
                  anchorCustomName={anchorCustomName}
                  anchorCustomGrace={anchorCustomGrace}
                  onStartEditAnchor={handleStartEditAnchor}
                  onCancelEditAnchor={() => setEditingAnchorId(null)}
                  onSaveAnchor={handleSaveAnchor}
                  setAnchorCustomName={setAnchorCustomName}
                  setAnchorCustomGrace={setAnchorCustomGrace}
                />
              ) : (
                <CareCircleView
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  onSaveProfile={handleSaveProfile}
                  isSavingProfile={isSavingProfile}
                  profileSavedToast={profileSavedToast}
                  data={data}
                  onToggleAwayMode={toggleAwayMode}
                  securityProofs={securityProofs}
                  loadingSecurity={loadingSecurity}
                  onRunSecurityProof={runSecurityProof}
                />
              )}
            </main>

            {/* Right Quiet Check-In AI Companion Panel (matching attached image) */}
            {chatOpen && (
              <aside className="w-full xl:w-[380px] shrink-0">
                <AIChatPanel
                  elderName={elderName}
                  elderInitials={elderInitials}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  onSendChat={handleSendChat}
                  isTyping={isTyping}
                  onClose={() => setChatOpen(false)}
                  isDocked={true}
                />
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Modern Collapsible Time-Travel Simulation Console */}
      <TimeTravelConsole
        expanded={simConsoleExpanded}
        onToggle={() => setSimConsoleExpanded(!simConsoleExpanded)}
        localTime={localTime}
        onInjectScenario={injectScenario}
        onAdvanceTime={advanceTime}
      />
    </div>
  );
}
