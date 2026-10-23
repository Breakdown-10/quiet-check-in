import React from 'react';
import { Sparkles, X, Send } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time?: string;
  source?: string;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  elderName?: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendChat: (msgText?: string) => void;
  isTyping: boolean;
}

export function AIAssistantDrawer({
  isOpen,
  onClose,
  elderName = 'Frank',
  chatMessages,
  chatInput,
  setChatInput,
  onSendChat,
  isTyping,
}: AIAssistantDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl border-l border-[#e2eaf4] z-50 flex flex-col slide-in-right">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#e2eaf4] flex items-center justify-between bg-[#f8fafc]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#151c38] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display text-[#0f244a]">
              Family Care Assistant
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              Powered by Amazon Bedrock Claude + Grounded Tools
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-[#0f244a] p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2.5 bg-[#f1f5f9]/60 border-b border-[#e2eaf4] flex items-center space-x-2 overflow-x-auto scrollbar-hide text-[11px]">
        <button
          type="button"
          onClick={() => onSendChat(`Did ${elderName} get the morning paper today?`)}
          className="whitespace-nowrap bg-white border border-[#cbd5e1] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium"
        >
          📰 Morning paper?
        </button>
        <button
          type="button"
          onClick={() => onSendChat('How consistent has his routine been?')}
          className="whitespace-nowrap bg-white border border-[#cbd5e1] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium"
        >
          📊 Routine consistency?
        </button>
        <button
          type="button"
          onClick={() => onSendChat('Is the back patio sensor healthy?')}
          className="whitespace-nowrap bg-white border border-[#cbd5e1] px-2.5 py-1 rounded-full text-slate-600 hover:text-[#0066ff] hover:border-[#0066ff] transition font-medium"
        >
          🏡 Sensor health?
        </button>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#f8fafc]">
        {chatMessages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
              m.sender === 'user'
                ? 'bg-[#151c38] text-white rounded-tr-none ml-auto shadow-xs'
                : 'bg-white text-[#0f244a] border border-[#e2eaf4] rounded-tl-none mr-auto shadow-xs'
            }`}
          >
            <div>{m.text}</div>
            {m.source && (
              <div className="mt-2">
                <span
                  className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    m.source === 'bedrock'
                      ? 'bg-[#dbeafe] text-[#1d4ed8]'
                      : 'bg-[#f1f5f9] text-slate-600 border border-[#cbd5e1]'
                  }`}
                >
                  {m.source === 'bedrock' ? '⚡ Bedrock Claude Haiku' : '🛡️ Safety Engine (Grounded)'}
                </span>
              </div>
            )}
            {m.time && (
              <div
                className={`text-[10px] mt-1 ${
                  m.sender === 'user' ? 'text-slate-400 text-right' : 'text-slate-400'
                }`}
              >
                {m.time}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="p-3 bg-white border border-[#e2eaf4] rounded-2xl rounded-tl-none text-slate-500 text-xs inline-flex items-center space-x-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066ff] animate-pulse" />
            <span>Checking sensor telemetry...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendChat();
        }}
        className="p-3.5 border-t border-[#e2eaf4] flex space-x-2 bg-white"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={`Ask about ${elderName}'s routine today...`}
          className="flex-1 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0066ff] focus:bg-white text-[#0f244a] placeholder:text-slate-400 font-medium"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="bg-[#0066ff] hover:bg-[#0052cc] disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
