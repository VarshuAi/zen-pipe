import React, { useState, useEffect } from 'react';
import {
  Play,
  Radio,
  Users,
  CheckCircle2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useFluxa } from '../../context/FluxaContext';

export const HeroCarousel: React.FC = () => {
  const {
    allVideos,
    setCurrentVideo,
    followedChannels,
    toggleFollow,
  } = useFluxa();

  // Pick live streams for carousel, or top featured videos
  const featuredList = allVideos.filter((v) => v.isLive).slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const currentItem = featuredList[currentIndex] || allVideos[0];
  const isFollowed = currentItem ? followedChannels.includes(currentItem.channel.id) : false;

  // Auto-advance carousel every 6 seconds if not hovered/paused
  useEffect(() => {
    if (isPaused || featuredList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, featuredList.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? featuredList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredList.length);
  };

  const handleWatchNow = () => {
    if (currentItem) {
      setCurrentVideo(currentItem);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!currentItem) return null;

  return (
    <div
      className="relative w-full mb-8 rounded-2xl overflow-hidden bg-gradient-to-b from-[#0e1626] to-[#090d16] border border-cyan-500/25 shadow-[0_8px_40px_rgba(0,0,0,0.85)] group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background ambient glow matching cyber theme */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Main hero grid: Left Video Preview + Right Stream Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10">
        {/* Video Thumbnail / Preview (7 cols) */}
        <div className="lg:col-span-8 relative aspect-video w-full overflow-hidden bg-black/60 group/preview cursor-pointer" onClick={handleWatchNow}>
          <img
            src={currentItem.thumbnail}
            alt={currentItem.title}
            className="w-full h-full object-cover object-center group-hover/preview:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Big hover play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/90 text-slate-950 shadow-[0_0_30px_rgba(0,240,255,0.8)] scale-90 group-hover/preview:scale-100 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>

          {/* Top Left: LIVE Badge & Category */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 backdrop-blur-sm text-white text-xs font-extrabold tracking-wider uppercase shadow-[0_0_12px_rgba(239,68,68,0.6)]">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              {currentItem.category}
            </div>
          </div>

          {/* Bottom Left: Viewer Count */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/75 backdrop-blur-sm border border-white/10 text-slate-200 text-xs font-mono">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentItem.liveViewers || '18.4K'} viewers</span>
          </div>
        </div>

        {/* Stream & Creator Details (4 cols) */}
        <div className="lg:col-span-4 p-5 lg:p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-cyan-500/20 bg-[#0b101c]/90">
          <div className="space-y-4">
            {/* Streamer Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={currentItem.channel.avatar}
                    alt={currentItem.channel.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0b101c]"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-100 hover:text-cyan-400 cursor-pointer transition-colors">
                      {currentItem.channel.name}
                    </span>
                    {currentItem.channel.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentItem.channel.subscribers} followers
                  </span>
                </div>
              </div>

              {/* Follow Button */}
              <button
                onClick={() => toggleFollow(currentItem.channel.id)}
                className={`p-2 rounded-lg border transition-all ${
                  isFollowed
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-cyan-400 hover:border-cyan-500/30'
                }`}
                title={isFollowed ? 'Following' : 'Follow Channel'}
              >
                <Heart className={`w-4 h-4 ${isFollowed ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Stream Title */}
            <h2
              onClick={handleWatchNow}
              className="text-base lg:text-lg font-bold text-slate-100 hover:text-cyan-300 cursor-pointer transition-colors line-clamp-2 leading-snug"
            >
              {currentItem.title}
            </h2>

            {/* Description Snippet */}
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {currentItem.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentItem.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-cyan-400" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons & Navigation */}
          <div className="pt-6 space-y-3">
            <button
              onClick={handleWatchNow}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Live Stream</span>
            </button>

            {/* Carousel navigation controls & dot indicators */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {featuredList.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex
                        ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="Previous featured stream"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="Next featured stream"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
