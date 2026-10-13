import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Radio,
  Bell,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  Menu,
  Check,
  Video as VideoIcon,
  Tv,
} from 'lucide-react';
import { useFluxa } from '../../context/FluxaContext';

export const Navbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    toggleSidebar,
    sparksBalance,
    loadCustomVideo,
    setActiveTab,
  } = useFluxa();

  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [customInputUrl, setCustomInputUrl] = useState<string>('');
  const [customError, setCustomError] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showWhispers, setShowWhispers] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hotkey Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) {
      setCustomError('Please enter a valid video stream URL or YouTube ID');
      return;
    }

    loadCustomVideo(customInputUrl.trim());
    setCustomInputUrl('');
    setCustomError('');
    setIsUrlModalOpen(false);
  };

  const handleQuickPreset = (preset: string) => {
    loadCustomVideo(preset);
    setIsUrlModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-16 w-full bg-[#0a0e17]/95 backdrop-blur-md border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.8)] select-none">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 gap-3">
          {/* Left section: Sidebar toggle & Brand */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors border border-transparent hover:border-cyan-500/30"
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 group-hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)]">
                <Radio className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                  FLUXA
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono tracking-widest text-cyan-500/70 uppercase border border-cyan-500/30 px-1 rounded bg-cyan-950/40">
                  HUD
                </span>
              </div>
            </div>
          </div>

          {/* Middle section: Cyberpunk Search Bar & Custom Loader */}
          <div className="flex-1 max-w-xl mx-2">
            <div className="relative flex items-center">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search streams, games, creators, cyber tags..."
                  className="w-full h-10 pl-10 pr-20 bg-slate-900/90 text-sm text-slate-200 placeholder-slate-500 rounded-l-lg border border-slate-800 border-r-0 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-12 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="hidden sm:flex items-center absolute right-3 pointer-events-none">
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                    Ctrl K
                  </kbd>
                </div>
              </div>

              {/* Quick Load URL button */}
              <button
                onClick={() => setIsUrlModalOpen(true)}
                className="h-10 px-3.5 bg-cyan-950/40 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 rounded-r-lg flex items-center gap-1.5 text-xs font-semibold tracking-wide transition-all shadow-[inset_0_0_10px_rgba(0,240,255,0.05)] shrink-0"
                title="Load Custom Stream or YouTube Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Load URL</span>
              </button>
            </div>
          </div>

          {/* Right section: Sparks, Go Live, Notifications, Whispers, Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sparks Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 font-mono text-xs shadow-[0_0_12px_rgba(0,240,255,0.15)]"
              title="Your Cheer Sparks Balance"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span className="font-bold">{sparksBalance.toLocaleString()}</span>
              <span className="text-slate-400 text-[10px]">SPARKS</span>
            </div>

            {/* "Go Live" Button */}
            <button
              onClick={() => alert('Broadcast Studio: Stream encoder connecting to RTMP rtmp://live.fluxa.tv/app...')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_20px_rgba(239,68,68,0.7)]"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>Go Live</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowWhispers(false);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-cyan-500/30 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">Live Alerts</span>
                    <span className="text-[10px] font-mono text-cyan-400">3 NEW</span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-cyan-500/20">
                      <p className="font-semibold text-cyan-300">NeonValkyrie went live!</p>
                      <p className="text-slate-400 text-[11px] truncate">NEO-TOKYO 2099 Ranked Finals</p>
                      <span className="text-[10px] text-slate-500">5m ago</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-cyan-500/20">
                      <p className="font-semibold text-pink-400">Drops Claimed!</p>
                      <p className="text-slate-400 text-[11px]">Prismatic Neon Railgun Skin Unlocked</p>
                      <span className="text-[10px] text-slate-500">22m ago</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-cyan-500/20">
                      <p className="font-semibold text-emerald-400">Tournament Starting</p>
                      <p className="text-slate-400 text-[11px]">Grand Finals: Fnatic vs Sentinels</p>
                      <span className="text-[10px] text-slate-500">1h ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Whispers / Direct Messages */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowWhispers(!showWhispers);
                  setShowNotifications(false);
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border border-transparent hover:border-cyan-500/30 transition-colors relative"
                aria-label="Whispers"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ff007f]"></span>
              </button>

              {showWhispers && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold tracking-wider text-slate-200 uppercase">Whispers</span>
                    <span className="text-[10px] font-mono text-pink-400">1 UNREAD</span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer">
                      <p className="font-semibold text-slate-200">KitsuneCode</p>
                      <p className="text-slate-400 text-[11px] truncate">Check out the new WebGPU compute pipeline!</p>
                      <span className="text-[10px] text-pink-400">12m ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar with Cyber Ring */}
            <div className="relative pl-1">
              <button
                className="relative group flex items-center justify-center rounded-full p-0.5 focus:outline-none"
                title="Logged in as CyberUser"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-cyan-400/80 group-hover:border-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all">
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                    alt="User profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Online pulse indicator */}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0e17] shadow-[0_0_6px_#10b981]"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Custom Stream / Video Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0d1322] border border-cyan-500/30 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
            <button
              onClick={() => setIsUrlModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Load Stream or Video</h3>
                <p className="text-xs text-slate-400">Paste any YouTube URL/ID or direct MP4 stream</p>
              </div>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Stream URL or Video ID
                </label>
                <input
                  type="text"
                  value={customInputUrl}
                  onChange={(e) => {
                    setCustomInputUrl(e.target.value);
                    setCustomError('');
                  }}
                  placeholder="e.g. https://www.youtube.com/watch?v=... or .mp4 URL"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                {customError && <p className="mt-1 text-xs text-red-400">{customError}</p>}
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-xs font-medium text-slate-400 mb-2">Quick Test Presets:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('jfKfPfyJRdk')}
                    className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-left text-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span className="truncate">Lofi Girl (YouTube Live)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPreset(
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
                      )
                    }
                    className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-left text-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <VideoIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">Tears of Steel (MP4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('dQw4w9WgXcQ')}
                    className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-left text-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <Tv className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="truncate">Rick Astley 4K</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPreset(
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                      )
                    }
                    className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-left text-slate-200 flex items-center gap-2 transition-colors"
                  >
                    <VideoIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Big Buck Bunny (MP4)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                >
                  Load & Play
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
