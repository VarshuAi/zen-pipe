import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Smile,
  Zap,
  Shield,
  Diamond,
  Star,
  CheckCircle2,
  Crown,
  ChevronDown,
  Settings,
  X,
  Users,
  Sparkles,
  Flame,
  Trophy,
  Compass,
  Cpu,
  Gem,
} from 'lucide-react';
import { ChatMessage, ChatBadge } from '../../types';
import { useFluxa } from '../../context/FluxaContext';
import { EMOTES } from '../../services/chatSimulator';

interface LiveChatPanelProps {
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  className?: string;
}

// Icon mapper for emotes
const EMOTE_ICON_MAP: Record<string, { icon: React.ReactNode; label: string; bg: string; border: string }> = {
  ':cyan:': {
    icon: <Gem className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />,
    label: 'cyan',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/40',
  },
  ':hype:': {
    icon: <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />,
    label: 'hype',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/40',
  },
  ':fire:': {
    icon: <Flame className="w-4 h-4 text-rose-500 fill-rose-500/20" />,
    label: 'fire',
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/40',
  },
  ':gg:': {
    icon: <Trophy className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />,
    label: 'gg',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/40',
  },
  ':pog:': {
    icon: <Sparkles className="w-4 h-4 text-pink-400 fill-pink-400/20" />,
    label: 'pog',
    bg: 'bg-pink-950/60',
    border: 'border-pink-500/40',
  },
  ':zen:': {
    icon: <Compass className="w-4 h-4 text-sky-400" />,
    label: 'zen',
    bg: 'bg-sky-950/60',
    border: 'border-sky-500/40',
  },
  ':cyber:': {
    icon: <Cpu className="w-4 h-4 text-purple-400" />,
    label: 'cyber',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/40',
  },
};

const CHEER_TIERS = [
  { amount: 100, label: '100 Sparks', color: 'from-cyan-500 to-blue-600' },
  { amount: 250, label: '250 Sparks', color: 'from-blue-500 to-indigo-600' },
  { amount: 500, label: '500 Sparks', color: 'from-purple-500 to-pink-600' },
  { amount: 1000, label: '1,000 Sparks', color: 'from-amber-400 to-rose-600' },
];

export const LiveChatPanel: React.FC<LiveChatPanelProps> = ({
  onToggleCollapse,
  isCollapsed = false,
  className = '',
}) => {
  const {
    currentVideo,
    chatMessages,
    sendChatMessage,
    cheerSparks,
    sparksBalance,
  } = useFluxa();

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isEmotePickerOpen, setIsEmotePickerOpen] = useState<boolean>(false);
  const [isCheerPickerOpen, setIsCheerPickerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
  const [showBadges, setShowBadges] = useState<boolean>(true);
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const viewerCountDisplay = useMemo(() => {
    if (currentVideo?.liveViewers) return currentVideo.liveViewers;
    if (currentVideo?.isLive) return '24.8K';
    return '1.2K';
  }, [currentVideo]);

  // Handle auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setIsScrolledUp(false);
    }
  };

  // Detect user scrolling up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceToBottom > 80);
  };

  // Scroll to bottom on new messages if not scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      scrollToBottom(true);
    }
  }, [chatMessages, isScrolledUp]);

  // Submit chat message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    sendChatMessage(trimmed);
    setInputMessage('');
    setIsEmotePickerOpen(false);
    setIsCheerPickerOpen(false);
    scrollToBottom(true);
  };

  // Insert emote into input
  const handleSelectEmote = (emoteCode: string) => {
    setInputMessage((prev) => (prev ? `${prev} ${emoteCode} ` : `${emoteCode} `));
    inputRef.current?.focus();
  };

  // Send cheer
  const handleSendCheer = (amount: number) => {
    cheerSparks(amount);
    setIsCheerPickerOpen(false);
    scrollToBottom(true);
  };

  // Render badge icons
  const renderBadge = (badge: ChatBadge, index: number) => {
    if (!showBadges) return null;
    let icon = <Star className="w-2.5 h-2.5" />;
    let bg = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';

    switch (badge.type) {
      case 'mod':
        icon = <Shield className="w-2.5 h-2.5" />;
        bg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
        break;
      case 'vip':
        icon = <Diamond className="w-2.5 h-2.5" />;
        bg = 'bg-pink-500/20 text-pink-400 border-pink-500/40';
        break;
      case 'sub':
        icon = <Star className="w-2.5 h-2.5" />;
        bg = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
        break;
      case 'verified':
        icon = <CheckCircle2 className="w-2.5 h-2.5" />;
        bg = 'bg-sky-500/20 text-sky-400 border-sky-500/40';
        break;
      case 'creator':
        icon = <Crown className="w-2.5 h-2.5" />;
        bg = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
        break;
    }

    return (
      <span
        key={`${badge.type}-${index}`}
        title={badge.label}
        className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold border uppercase tracking-wider ${bg}`}
      >
        {icon}
        <span className="hidden xs:inline">{badge.label}</span>
      </span>
    );
  };

  // Parse message text and replace emotes
  const renderMessageText = (text: string) => {
    const words = text.split(' ');
    return words.map((word, idx) => {
      const emoteConfig = EMOTE_ICON_MAP[word];
      if (emoteConfig) {
        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-mono border ${emoteConfig.bg} ${emoteConfig.border} shadow-[0_0_8px_rgba(0,240,255,0.15)] align-middle`}
          >
            {emoteConfig.icon}
            <span className="text-slate-200">{emoteConfig.label}</span>
          </span>
        );
      }
      return <React.Fragment key={idx}>{word} </React.Fragment>;
    });
  };

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        title="Open Stream Chat"
        className="h-full w-12 bg-[#0a0e17]/95 border-l border-cyan-500/20 flex flex-col items-center py-4 gap-4 hover:bg-cyan-500/10 transition cursor-pointer"
      >
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
        <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-mono font-bold tracking-widest text-cyan-300">
          STREAM CHAT
        </span>
        <Users className="w-4 h-4 text-slate-400 mt-auto" />
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-[#0a0e17]/95 backdrop-blur-md border-l border-cyan-500/20 shadow-2xl relative select-none ${className}`}
    >
      {/* Live Chat Header */}
      <div className="h-12 px-3 border-b border-cyan-500/20 flex items-center justify-between bg-[#07090e]/80">
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse chat"
              className="p-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 text-glow-cyan">
              Stream Chat
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{viewerCountDisplay}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Settings button */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              title="Chat Settings"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isSettingsOpen
                  ? 'text-cyan-400 bg-cyan-500/20'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-9 w-48 bg-[#07090e]/95 border border-cyan-500/30 rounded-xl p-3 shadow-2xl z-50 text-xs font-mono space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20 pb-1">
                  Chat Settings
                </div>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Show Timestamps</span>
                  <input
                    type="checkbox"
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                  <span>Show Badges</span>
                  <input
                    type="checkbox"
                    checked={showBadges}
                    onChange={(e) => setShowBadges(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 scroll-smooth text-xs"
      >
        {/* Welcome Streamer Pill */}
        <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] font-mono leading-relaxed">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            WELCOME TO CYBER-CHAT
          </div>
          <span>
            Be respectful, support the broadcaster, and have fun. Emotes and Sparks are enabled!
          </span>
        </div>

        {/* Message Items */}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`group rounded-lg p-1.5 transition-colors ${
              msg.isCheer
                ? 'bg-amber-950/25 border border-amber-400/40 shadow-[0_0_12px_rgba(255,183,3,0.15)]'
                : 'hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {/* Timestamp */}
              {showTimestamps && (
                <span className="font-mono text-[10px] text-slate-500 select-none">
                  {msg.timestamp}
                </span>
              )}

              {/* Badges */}
              {msg.badges && msg.badges.map((badge, idx) => renderBadge(badge, idx))}

              {/* Username */}
              <span
                className="font-semibold tracking-tight"
                style={{ color: msg.color || '#00f0ff' }}
              >
                {msg.username}:
              </span>

              {/* Message text */}
              <span className="text-slate-200 break-words leading-relaxed">
                {renderMessageText(msg.message)}
              </span>
            </div>

            {/* Special Cheer Sparks Banner */}
            {msg.isCheer && msg.sparksAmount && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                <Sparkles className="w-3 h-3 text-amber-300 animate-spin" />
                <span>Cheered {msg.sparksAmount.toLocaleString()} Sparks!</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating "Chat paused due to scroll" pill */}
      {isScrolledUp && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => scrollToBottom(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/90 text-cyan-300 border border-cyan-400/60 rounded-full text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-cyan-900 transition cursor-pointer animate-bounce"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Chat paused due to scroll</span>
          </button>
        </div>
      )}

      {/* Emote Picker Popover */}
      {isEmotePickerOpen && (
        <div className="absolute bottom-20 left-3 right-3 bg-[#07090e]/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-3 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Fluxa Cyber Emotes
            </span>
            <button
              onClick={() => setIsEmotePickerOpen(false)}
              className="p-1 text-slate-400 hover:text-cyan-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {EMOTES.map((emote) => {
              const config = EMOTE_ICON_MAP[emote.code];
              return (
                <button
                  key={emote.code}
                  onClick={() => handleSelectEmote(emote.code)}
                  title={emote.description}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-900/60 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 transition group cursor-pointer"
                >
                  <div className="w-6 h-6 flex items-center justify-center group-hover:scale-125 transition-transform">
                    {config?.icon || <Sparkles className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 group-hover:text-cyan-300">
                    {emote.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Flux Sparks Cheer Popover */}
      {isCheerPickerOpen && (
        <div className="absolute bottom-20 left-3 right-3 bg-[#07090e]/95 backdrop-blur-xl border border-amber-500/40 rounded-xl p-3 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Cheer with Flux Sparks
              </span>
            </div>
            <button
              onClick={() => setIsCheerPickerOpen(false)}
              className="p-1 text-slate-400 hover:text-amber-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3 px-2 py-1.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs font-mono">
            <span className="text-slate-400">Available Sparks:</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              {sparksBalance.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CHEER_TIERS.map((tier) => (
              <button
                key={tier.amount}
                onClick={() => handleSendCheer(tier.amount)}
                className={`p-2 rounded-lg bg-gradient-to-r ${tier.color} text-white font-mono text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input & Action Bar */}
      <div className="p-3 border-t border-cyan-500/20 bg-[#07090e]/95">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              maxLength={250}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Send a message..."
              className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-xl pl-3 pr-20 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.3)] transition"
            />

            {/* Input buttons: Emotes, Sparks, Send */}
            <div className="absolute right-1.5 flex items-center gap-1">
              {/* Emote Picker Button */}
              <button
                type="button"
                onClick={() => {
                  setIsEmotePickerOpen((prev) => !prev);
                  setIsCheerPickerOpen(false);
                }}
                title="Choose an Emote"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isEmotePickerOpen
                    ? 'text-cyan-400 bg-cyan-500/20'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                }`}
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Sparks Cheer Button */}
              <button
                type="button"
                onClick={() => {
                  setIsCheerPickerOpen((prev) => !prev);
                  setIsEmotePickerOpen(false);
                }}
                title="Cheer Flux Sparks"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isCheerPickerOpen
                    ? 'text-amber-400 bg-amber-500/20'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                title="Send Message"
                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 disabled:opacity-40 disabled:hover:bg-cyan-500/20 disabled:hover:text-cyan-300 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-bar: Character count & Points status */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1 text-cyan-400/80">
              <Zap className="w-3 h-3 text-amber-400" />
              {sparksBalance.toLocaleString()} Sparks
            </span>
            <span>{inputMessage.length}/250</span>
          </div>
        </form>
      </div>
    </div>
  );
};
