import React from 'react';
import {
  Play,
  Users,
  CheckCircle2,
  Heart,
  Clock,
  Flame,
} from 'lucide-react';
import { Video } from '../../types';
import { useFluxa } from '../../context/FluxaContext';

interface VideoCardProps {
  video: Video;
  onClick?: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  const { setCurrentVideo, likedVideos, toggleLike } = useFluxa();

  const isLiked = likedVideos.includes(video.id);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setCurrentVideo(video);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(video.id);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#0d1322]/80 hover:bg-[#11192e] border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,240,255,0.15)] cursor-pointer select-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Hover play button pulse */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/90 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.6)] scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Live badge or Duration timestamp */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {video.isLive ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold tracking-wider uppercase shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-slate-200 text-[11px] font-mono font-medium">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{video.duration}</span>
            </div>
          )}
        </div>

        {/* Viewers or Views count */}
        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-slate-200 text-[11px] font-mono flex items-center gap-1">
          {video.isLive ? (
            <>
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{video.liveViewers || '14.2K'} viewers</span>
            </>
          ) : (
            <span>{video.views} views</span>
          )}
        </div>

        {/* Quick Like Action button */}
        <button
          onClick={handleLike}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-sm transition-all ${
            isLiked
              ? 'bg-pink-500/80 text-white shadow-[0_0_10px_rgba(255,0,127,0.5)] opacity-100'
              : 'bg-black/60 text-slate-300 hover:text-pink-400 opacity-0 group-hover:opacity-100'
          }`}
          title={isLiked ? 'Liked' : 'Like Video'}
          aria-label="Like Video"
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Video Info Section */}
      <div className="p-3.5 flex gap-3">
        {/* Creator Avatar */}
        <div className="relative shrink-0 pt-0.5">
          <img
            src={video.channel.avatar}
            alt={video.channel.name}
            className="w-9 h-9 rounded-full object-cover border border-slate-700 group-hover:border-cyan-400/70 transition-colors"
          />
          {video.isLive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#0d1322]"></span>
          )}
        </div>

        {/* Title, Channel, Category */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
            {video.title}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span className="truncate hover:text-slate-200 transition-colors">
              {video.channel.name}
            </span>
            {video.channel.isVerified && (
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[10px] font-medium text-cyan-300 truncate">
              {video.category}
            </span>
            {!video.isLive && (
              <span className="text-[10px] text-slate-500 truncate">
                {video.uploadedAt}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
