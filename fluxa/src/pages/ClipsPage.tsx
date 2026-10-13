import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Music,
  CheckCircle2,
  Radio,
  Check,
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import { ClipItem } from '../types';
import { mockClips } from '../data/mockData';
import { useFluxa } from '../context/FluxaContext';

export const ClipsPage: React.FC = () => {
  const { followedChannels, toggleFollow } = useFluxa();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [likedClipIds, setLikedClipIds] = useState<Set<string>>(new Set(['clip-01']));
  const [savedClipIds, setSavedClipIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments drawer for current clip
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [clipComments, setClipComments] = useState<Record<string, { author: string; text: string; time: string }[]>>({
    'clip-01': [
      { author: 'NeonRunner', text: 'Cleanest 1v5 clutch I have ever seen in my life!', time: '10m ago' },
      { author: 'QuantumPulse', text: 'The reaction time on that second flick was 120ms wow.', time: '25m ago' },
      { author: 'ValkyrieFan', text: 'Drops enabled? Just got my cyber skin!', time: '1h ago' },
    ],
  });
  const [newCommentInput, setNewCommentInput] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeClip: ClipItem = mockClips[currentIndex] || mockClips[0];
  const isLiked = likedClipIds.has(activeClip.id);
  const isSaved = savedClipIds.has(activeClip.id);
  const isFollowed = followedChannels.includes(activeClip.creator.id);
  const likesCount = activeClip.likes + (isLiked ? 1 : 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Switch to next clip
  const handleNext = useCallback(() => {
    if (currentIndex < mockClips.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setIsPlaying(true);
    } else {
      // Loop back to start
      setCurrentIndex(0);
      setProgress(0);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  // Switch to previous clip
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  // Handle Like
  const toggleLike = () => {
    setLikedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(activeClip.id)) {
        next.delete(activeClip.id);
      } else {
        next.add(activeClip.id);
      }
      return next;
    });
  };

  // Handle Save
  const toggleSave = () => {
    setSavedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(activeClip.id)) {
        next.delete(activeClip.id);
        showToast('Removed from Saved Clips');
      } else {
        next.add(activeClip.id);
        showToast('Saved to your Cyber Vault! ⚡');
      }
      return next;
    });
  };

  // Share clip
  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
      showToast('Clip link copied to clipboard!');
    } catch {
      showToast('Clip link ready to share!');
    }
  };

  // Add comment to active clip
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCommentInput.trim();
    if (!trimmed) return;

    setClipComments((prev) => {
      const list = prev[activeClip.id] || [];
      return {
        ...prev,
        [activeClip.id]: [{ author: 'You', text: trimmed, time: 'Just now' }, ...list],
      };
    });

    setNewCommentInput('');
  };

  // Update progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in comment input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          handlePrev();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isMuted]);

  // Video Autoplay on clip change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        // Fallback to muted autoplay
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
      });
    }
  }, [currentIndex]);

  const currentClipComments = clipComments[activeClip.id] || [
    { author: 'CyberSamurai', text: 'This stream highlight is absolutely mental! 🔥', time: '1h ago' },
    { author: 'MatrixOperative', text: 'Frame rate looks so smooth in 60FPS!', time: '3h ago' },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-65px)] bg-[#05070a] flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#07090e]/95 border border-cyan-400 text-cyan-300 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(0,240,255,0.08)_0%,_transparent_70%)]" />

      {/* Main Centered Vertical Clip Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[420px] h-[94%] max-h-[840px] bg-black rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)] border border-cyan-500/30 flex flex-col group/clip"
      >
        {/* Cyber Frame Corner Accents */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80" />
        </div>

        {/* Video Element */}
        <div className="relative w-full h-full bg-black cursor-pointer" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={activeClip.videoUrl}
            className="w-full h-full object-cover"
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleNext}
          />

          {/* Big Play/Pause Overlay Indicator on Pause */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.5)]">
                <Play className="w-8 h-8 text-cyan-300 fill-cyan-300 translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Top HUD Tag Overlay */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-[11px] font-mono font-bold text-red-400">
              <Radio className="w-3 h-3 animate-pulse" />
              CLIP #{currentIndex + 1}
            </span>
            <span className="text-[11px] font-mono text-cyan-300/80 bg-slate-900/80 px-2 py-0.5 rounded border border-cyan-500/20">
              {activeClip.views} views
            </span>
          </div>

          {/* Top Right Mute/Unmute Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/60 hover:bg-cyan-950/80 border border-cyan-500/30 text-white hover:text-cyan-300 transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Vertical Action Rail (Right Side) */}
        <div className="absolute right-3 bottom-14 z-30 flex flex-col items-center gap-4">
          {/* Streamer Avatar with Follow Badge */}
          <div className="relative mb-2">
            <img
              src={activeClip.creator.avatar}
              alt={activeClip.creator.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            />
            {!isFollowed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow(activeClip.creator.id);
                  showToast(`Followed ${activeClip.creator.name}! ✨`);
                }}
                title="Follow creator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow hover:scale-110 transition cursor-pointer"
              >
                +
              </button>
            )}
          </div>

          {/* Like Button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              title="Like clip"
              className={`p-3 rounded-full bg-black/65 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer active:scale-90 ${
                isLiked ? 'text-pink-500 bg-pink-950/40 border-pink-500' : 'text-white hover:text-pink-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500' : ''}`} />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold">
              {likesCount.toLocaleString()}
            </span>
          </div>

          {/* Comments Button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCommentsOpen(true);
              }}
              title="View comments"
              className="p-3 rounded-full bg-black/65 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 text-white hover:text-cyan-300 transition cursor-pointer active:scale-90"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold">
              {activeClip.commentsCount + (clipComments[activeClip.id]?.length || 0)}
            </span>
          </div>

          {/* Save / Vault Button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSave();
              }}
              title="Save clip"
              className={`p-3 rounded-full bg-black/65 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer active:scale-90 ${
                isSaved ? 'text-cyan-400 bg-cyan-950/50 border-cyan-400' : 'text-white hover:text-cyan-300'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-cyan-400' : ''}`} />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold">Save</span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              title="Share clip"
              className="p-3 rounded-full bg-black/65 backdrop-blur-md border border-cyan-500/30 hover:border-cyan-400 text-white hover:text-cyan-300 transition cursor-pointer active:scale-90"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold">Share</span>
          </div>
        </div>

        {/* Bottom Info Bar Overlay (Creator info, title, music soundtrack ticker) */}
        <div className="absolute bottom-2 left-0 right-16 p-4 z-30 space-y-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none">
          {/* Creator Name & Verified Check */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="font-bold text-sm text-white hover:text-cyan-300 cursor-pointer transition">
              {activeClip.creator.name}
            </span>
            {activeClip.creator.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
            )}
            <span className="text-xs font-mono text-slate-400 ml-1">
              {activeClip.creator.handle}
            </span>
          </div>

          {/* Title */}
          <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed drop-shadow">
            {activeClip.title}
          </p>

          {/* Audio Soundtrack Ticker */}
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300/90 pt-0.5">
            <Music className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span className="truncate">Original Sound // {activeClip.creator.name} Live Session</span>
          </div>
        </div>

        {/* Bottom Neon Progress Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80 z-30">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-[0_0_10px_#00f0ff] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Sliding Comments Drawer */}
        {isCommentsOpen && (
          <div className="absolute inset-0 bg-[#07090e]/95 backdrop-blur-xl z-40 p-4 flex flex-col animate-in slide-in-from-bottom duration-250 border-t border-cyan-500/40">
            {/* Comments Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                  Clip Comments ({currentClipComments.length})
                </span>
              </div>
              <button
                onClick={() => setIsCommentsOpen(false)}
                className="p-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {currentClipComments.map((comm, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-900/60 border border-cyan-500/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-cyan-400">{comm.author}</span>
                    <span className="font-mono text-slate-500">{comm.time}</span>
                  </div>
                  <p className="text-slate-200">{comm.text}</p>
                </div>
              ))}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="pt-2 flex gap-2">
              <input
                type="text"
                value={newCommentInput}
                onChange={(e) => setNewCommentInput(e.target.value)}
                placeholder="Add a comment to this clip..."
                className="flex-1 bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!newCommentInput.trim()}
                className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Floating Prev / Next Navigation Buttons on Desktop Side */}
      <div className="hidden sm:flex flex-col gap-3 ml-4 z-20">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          title="Previous Clip (Up Arrow)"
          className="p-3 rounded-full bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 disabled:opacity-30 disabled:pointer-events-none shadow-lg transition active:scale-95 cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          title="Next Clip (Down Arrow)"
          className="p-3 rounded-full bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 shadow-lg transition active:scale-95 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
