import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Leaf, Music, Calendar, X, Volume2,
  Heart, Shield
} from 'lucide-react';

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  time?: string;
  source?: string;
  showActions?: boolean;
}

interface AIChatPanelProps {
  elderName?: string;
  elderInitials?: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendChat: (msgText?: string) => void;
  isTyping: boolean;
  onClose?: () => void;
  isDocked?: boolean;
}

export function AIChatPanel({
  elderName = 'Frank',
  elderInitials = 'FR',
  chatMessages,
  chatInput,
  setChatInput,
  onSendChat,
  isTyping,
  onClose,
  isDocked = false,
}: AIChatPanelProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Breathing exercise modal state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathingSeconds, setBreathingSeconds] = useState(4);

  // Calming sounds audio player state
  const [soundsPlaying, setSoundsPlaying] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  // Breathing pacer effect
  useEffect(() => {
    if (!breathingActive) return;
    const interval = setInterval(() => {
      setBreathingSeconds((prev) => {
        if (prev > 1) return prev - 1;
        setBreathingPhase((phase) => {
          if (phase === 'Inhale') return 'Hold';
          if (phase === 'Hold') return 'Exhale';
          return 'Inhale';
        });
        return 4;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breathingActive]);

  // Auto-scroll to newest message within chat container only (prevents scrolling the main window/page)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages, isTyping]);

  // Toggle calming ambient audio using Web Audio API synthesis
  const toggleCalmingSounds = () => {
    if (soundsPlaying) {
      if (audioCtx) {
        audioCtx.close();
        setAudioCtx(null);
      }
      setSoundsPlaying(false);
    } else {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start(0);
        setAudioCtx(ctx);
        setSoundsPlaying(true);
      } catch (err) {
        console.error('Audio context init error', err);
      }
    }
  };

  const handleActionClick = (actionType: 'breathe' | 'sounds' | 'routine') => {
    if (actionType === 'breathe') {
      setBreathingActive(true);
      onSendChat('I would like to try a short breathing exercise.');
    } else if (actionType === 'sounds') {
      toggleCalmingSounds();
      onSendChat(soundsPlaying ? 'Stop calming sounds.' : 'Play calming nature sounds.');
    } else if (actionType === 'routine') {
      onSendChat('How is my routine proceeding today?');
    }
  };

  return (
    <div
      className={`bg-white border border-[#e2eaf4] rounded-3xl shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
        isDocked
          ? 'w-full lg:w-[350px] xl:w-[370px] shrink-0 h-[calc(100vh-5rem)] sticky top-5'
          : 'fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 shadow-2xl slide-in-right'
      }`}
    >
      {/* 1. Panel Header */}
      <div>
        <div className="p-4 px-5 border-b border-[#edf2f7] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#0066ff] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#0f244a] font-display leading-tight">
                Family Care Assistant
              </h2>
              <p className="text-[11px] text-[#5c6e84] font-medium">
                Powered by Bedrock Claude Haiku + Strands Tools
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-[#0f244a] p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Close companion panel"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-2 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center space-x-2 overflow-x-auto scrollbar-hide text-[11px]">
          <button
            type="button"
            onClick={() => onSendChat(`Did ${elderName} get the morning paper today?`)}
            className="whitespace-nowrap bg-white border border-[#d6e4f3] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium flex items-center space-x-1"
          >
            <span>📰</span>
            <span>Morning paper?</span>
          </button>
          <button
            type="button"
            onClick={() => onSendChat('How consistent has his routine been?')}
            className="whitespace-nowrap bg-white border border-[#d6e4f3] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium flex items-center space-x-1"
          >
            <span>📊</span>
            <span>Routine consistency?</span>
          </button>
          <button
            type="button"
            onClick={() => onSendChat('Is the back patio sensor healthy?')}
            className="whitespace-nowrap bg-white border border-[#d6e4f3] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium flex items-center space-x-1"
          >
            <span>🏡</span>
            <span>Sensor health?</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Breathing Exercise Overlay Banner */}
      {breathingActive && (
        <div className="p-3.5 bg-gradient-to-r from-[#dcfce7] via-[#f0fdf4] to-[#e0f2fe] border-b border-[#bbf7d0] flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center transition-transform duration-1000 ${
                breathingPhase === 'Inhale'
                  ? 'scale-125 shadow-md shadow-[#10b981]/40'
                  : breathingPhase === 'Hold'
                  ? 'scale-110'
                  : 'scale-90 opacity-75'
              }`}
            >
              <Heart className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#065f46]">
                {breathingPhase} ({breathingSeconds}s)
              </div>
              <div className="text-[10px] text-slate-600">
                Gentle calming rhythm for focus
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBreathingActive(false)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-0.5 rounded-md hover:bg-white/60"
          >
            Done
          </button>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div
        ref={messagesContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs scrollbar-hide"
      >
        {chatMessages.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#edf5fd] text-[#0066ff] flex items-center justify-center shadow-xs border border-[#d6e6f7]">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#0f244a] font-display">
                Family Care Assistant
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-[240px] leading-relaxed">
                Ask any question about {elderName}&apos;s daily routines, sensor signals, or consistency today.
              </p>
            </div>
            <div className="text-[11px] text-[#0066ff] bg-[#edf5fd] px-3 py-1 rounded-full font-semibold border border-[#d6e6f7]/60 mt-1">
              Choose a prompt above or type below
            </div>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isAI = msg.sender === 'ai';

          return (
            <div key={msg.id || idx} className="space-y-2.5">
              {/* Message Bubble Row */}
              <div
                className={`flex items-end space-x-2.5 ${
                  isAI ? 'justify-start' : 'justify-end'
                }`}
              >
                {/* AI Avatar */}
                {isAI && (
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white shadow-xs shrink-0 border border-[#e2eaf4]">
                    <img
                      src="/app_icon_512.png"
                      alt="AI Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/app_icon.jpg';
                      }}
                    />
                  </div>
                )}

                {/* Bubble Container */}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isAI
                      ? 'bg-[#f0f6fc] text-[#1e293b] rounded-tl-sm border border-[#e5edf7]/60 shadow-2xs'
                      : 'bg-[#0077ff] text-white rounded-tr-sm shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium leading-relaxed">
                    {msg.text}
                  </p>

                  {/* Safety Engine (Grounded) Badge if AI response */}
                  {isAI && msg.source && (
                    <div className="mt-2">
                      <span className="inline-flex items-center space-x-1.5 text-[10px] bg-white text-slate-700 border border-[#d6e4f3] px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
                        <span className="text-red-500">🛡️</span>
                        <span>Safety Engine (Grounded)</span>
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <span
                    className={`block text-[10px] mt-1.5 font-medium ${
                      isAI ? 'text-slate-400' : 'text-white/80 text-right'
                    }`}
                  >
                    {msg.time || '07:44 PM'}
                  </span>
                </div>

                {/* User Avatar */}
                {!isAI && (
                  <div className="w-7 h-7 rounded-full bg-[#0077ff] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                    {elderInitials}
                  </div>
                )}
              </div>

              {/* Show Action Cards on matching prompt */}
              {msg.showActions && (
                <div className="pl-9 space-y-2 pt-0.5 animate-fade-in">
                  {/* Action 1: Start Breathing Exercise */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('breathe')}
                    className="w-full bg-white border border-[#e2eaf4] hover:border-[#38bdf8] hover:bg-[#f8fafc] rounded-2xl py-2.5 px-3.5 flex items-center space-x-3 text-left shadow-xs transition-all active:scale-[0.99] group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#dcfce7] text-[#10b981] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Leaf className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-[#0f244a] font-display">
                      Start Breathing Exercise
                    </span>
                  </button>

                  {/* Action 2: Play Calming Sounds */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('sounds')}
                    className="w-full bg-white border border-[#e2eaf4] hover:border-[#38bdf8] hover:bg-[#f8fafc] rounded-2xl py-2.5 px-3.5 flex items-center space-x-3 text-left shadow-xs transition-all active:scale-[0.99] group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#f3e8ff] text-[#8b5cf6] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {soundsPlaying ? (
                        <Volume2 className="w-4 h-4 stroke-[2.2] animate-pulse" />
                      ) : (
                        <Music className="w-4 h-4 stroke-[2.2]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#0f244a] font-display">
                      {soundsPlaying ? 'Pause Calming Sounds' : 'Play Calming Sounds'}
                    </span>
                  </button>

                  {/* Action 3: Check My Routine */}
                  <button
                    type="button"
                    onClick={() => handleActionClick('routine')}
                    className="w-full bg-white border border-[#e2eaf4] hover:border-[#38bdf8] hover:bg-[#f8fafc] rounded-2xl py-2.5 px-3.5 flex items-center space-x-3 text-left shadow-xs transition-all active:scale-[0.99] group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#dbeafe] text-[#0066ff] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold text-[#0f244a] font-display">
                      Check My Routine
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        }))}

        {isTyping && (
          <div className="flex items-center space-x-2 pl-9">
            <div className="p-3 bg-[#f0f6fc] border border-[#e5edf7] rounded-2xl rounded-tl-sm text-slate-500 text-xs inline-flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] animate-pulse" />
              <span>Checking sensor telemetry...</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Input Form with requested placeholder */}
      <div className="p-3.5 pt-2 border-t border-[#edf2f7] bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendChat();
          }}
          className="w-full bg-white border border-[#d6e4f3] rounded-full p-1 pl-4 flex items-center shadow-xs focus-within:border-[#0077ff] focus-within:ring-2 focus-within:ring-[#0077ff]/15 transition-all"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`Ask about ${elderName}'s routine today...`}
            className="flex-1 text-xs text-[#0f244a] placeholder:text-slate-400 bg-transparent focus:outline-none font-medium py-1"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="w-8 h-8 rounded-full bg-[#0077ff] hover:bg-[#0066cc] disabled:opacity-40 text-white flex items-center justify-center shadow-xs shrink-0 transition active:scale-95"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.2] translate-x-[-0.5px] translate-y-[-0.5px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
