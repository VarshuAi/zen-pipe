import React, { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Scissors,
  Bookmark,
  CheckCircle2,
  Users,
  Eye,
  Calendar,
  Radio,
  Tag,
  Check,
  Copy,
} from 'lucide-react';
import { Video } from '../../types';
import { useFluxa } from '../../context/FluxaContext';

interface VideoDetailsProps {
  video: Video;
  onSeek?: (seconds: number) => void;
}

export const VideoDetails: React.FC<VideoDetailsProps> = ({ video, onSeek }) => {
  const { followedChannels, toggleFollow, likedVideos, toggleLike } = useFluxa();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [hasDisliked, setHasDisliked] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isLiked = likedVideos.includes(video.id);
  const isFollowed = followedChannels.includes(video.channel.id);

  const displayLikesCount = isLiked ? video.likes + 1 : video.likes;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Copy share URL
  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Stream link copied to clipboard!');
      } else {
        showToast('Link ready to share!');
      }
    } catch {
      showToast('Link copied to clipboard!');
    }
  };

  // Handle Dislike toggle
  const handleToggleDislike = () => {
    setHasDisliked((prev) => !prev);
    if (!hasDisliked && isLiked) {
      toggleLike(video.id);
    }
  };

  // Handle Like toggle
  const handleToggleLike = () => {
    toggleLike(video.id);
    if (!isLiked && hasDisliked) {
      setHasDisliked(false);
    }
  };

  // Convert mm:ss or hh:mm:ss to seconds
  const parseTimestampToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  // Render clickable timestamps inside description
  const renderDescriptionWithTimestamps = (text: string) => {
    const timestampRegex = /(\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;
    const parts = text.split(timestampRegex);

    return parts.map((part, index) => {
      if (timestampRegex.test(part)) {
        return (
          <button
            key={index}
            onClick={() => {
              const sec = parseTimestampToSeconds(part);
              onSeek?.(sec);
              showToast(`Jumped to chapter ${part}`);
            }}
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 hover:underline font-mono font-semibold px-1 rounded hover:bg-cyan-500/10 transition cursor-pointer"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4 text-slate-100 font-sans relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#07090e]/95 border border-cyan-400 text-cyan-300 px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] text-xs font-mono animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Video Title & Live / Category Badges */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {video.isLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/60 text-xs font-mono font-bold text-red-400 tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              LIVE STREAM
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300">
              VOD ARCHIVE
            </span>
          )}

          <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
            {video.category}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white/95 drop-shadow-sm">
          {video.title}
        </h1>
      </div>

      {/* Streamer / Channel Bar & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-cyan-500/20">
        {/* Left: Streamer Info & Subscribe Button */}
        <div className="flex items-center gap-3">
          <div className="relative group/avatar cursor-pointer">
            <img
              src={video.channel.avatar}
              alt={video.channel.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/40 group-hover/avatar:border-cyan-400 transition shadow-[0_0_12px_rgba(0,240,255,0.2)]"
            />
            {video.channel.isLive && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#07090e] animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-100 hover:text-cyan-300 transition cursor-pointer">
                {video.channel.name}
              </span>
              {video.channel.isVerified && (
                <CheckCircle2 className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
              )}
            </div>
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span>{video.channel.subscribers} subscribers</span>
              {video.channel.handle && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">{video.channel.handle}</span>
                </>
              )}
            </div>
          </div>

          {/* Follow / Subscribe Button */}
          <button
            onClick={() => {
              toggleFollow(video.channel.id);
              showToast(
                isFollowed
                  ? `Unfollowed ${video.channel.name}`
                  : `Subscribed to ${video.channel.name}! 🎉`
              );
            }}
            className={`ml-3 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              isFollowed
                ? 'bg-slate-800/90 text-slate-300 hover:bg-red-500/20 hover:text-red-400 border border-slate-700'
                : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 hover:brightness-110 shadow-[0_0_15px_rgba(0,240,255,0.4)] active:scale-95'
            }`}
          >
            {isFollowed ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>FOLLOWING</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span>FOLLOW</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Actions (Like/Dislike, Share, Clip, Save) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Like / Dislike Pill Group */}
          <div className="flex items-center bg-slate-900/90 rounded-xl border border-cyan-500/30 overflow-hidden text-xs font-mono">
            {/* Like */}
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 px-3.5 py-2 transition cursor-pointer hover:bg-cyan-500/20 ${
                isLiked ? 'text-cyan-400 bg-cyan-500/20' : 'text-slate-300'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-cyan-400' : ''}`} />
              <span className="font-semibold">{displayLikesCount.toLocaleString()}</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-700" />

            {/* Dislike */}
            <button
              onClick={handleToggleDislike}
              className={`px-3 py-2 transition cursor-pointer hover:bg-red-500/20 ${
                hasDisliked ? 'text-red-400 bg-red-500/20' : 'text-slate-400'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${hasDisliked ? 'fill-red-400' : ''}`} />
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-cyan-500/30 text-xs font-mono transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Clip Button */}
          <button
            onClick={() => showToast('Creating 30s Flux Clip...')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-cyan-500/30 text-xs font-mono transition cursor-pointer"
          >
            <Scissors className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Clip</span>
          </button>

          {/* Save / Bookmark Button */}
          <button
            onClick={() => {
              setIsSaved((prev) => !prev);
              showToast(isSaved ? 'Removed from Library' : 'Saved to Cyber Library!');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-mono transition cursor-pointer ${
              isSaved
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                : 'bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border-cyan-500/30'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-cyan-400 text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Description Box */}
      <div className="bg-[#0a0e17]/85 backdrop-blur-md rounded-xl p-4 border border-cyan-500/20 space-y-3">
        {/* Meta Header: Views, Upload Date, Tags */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            {video.isLive ? (
              <>
                <Users className="w-3.5 h-3.5 text-red-400" />
                <span>{video.liveViewers || '24.8K'} watching now</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{video.views} views</span>
              </>
            )}
          </div>

          <span className="text-slate-600">•</span>

          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{video.uploadedAt}</span>
          </div>

          <span className="text-slate-600">•</span>

          <div className="flex items-center gap-1.5 flex-wrap">
            {video.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-cyan-950/40 text-[11px] text-cyan-400 border border-cyan-500/30 flex items-center gap-1"
              >
                <Tag className="w-2.5 h-2.5" />
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Description Body */}
        <div
          className={`text-xs sm:text-sm text-slate-300 leading-relaxed font-sans whitespace-pre-line ${
            isDescriptionExpanded ? '' : 'line-clamp-3'
          }`}
        >
          {renderDescriptionWithTimestamps(video.description)}
        </div>

        {/* Show More / Show Less Toggle */}
        <button
          onClick={() => setIsDescriptionExpanded((prev) => !prev)}
          className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:underline uppercase tracking-wider transition cursor-pointer"
        >
          {isDescriptionExpanded ? 'Show less ▲' : 'Show more ▼'}
        </button>
      </div>
    </div>
  );
};
