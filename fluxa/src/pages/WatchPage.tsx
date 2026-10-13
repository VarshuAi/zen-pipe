import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  ListVideo,
  Eye,
  Radio,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Video } from '../types';
import { useFluxa } from '../context/FluxaContext';
import { CyberVideoPlayer } from '../components/player/CyberVideoPlayer';
import { LiveChatPanel } from '../components/chat/LiveChatPanel';
import { VideoDetails } from '../components/watch/VideoDetails';
import { CommentsSection } from '../components/watch/CommentsSection';

export const WatchPage: React.FC = () => {
  const { currentVideo, setCurrentVideo, allVideos, isTheaterMode } = useFluxa();

  // If no current video is selected, fallback to the first video
  const activeVideo: Video = currentVideo || allVideos[0];

  // Right sidebar tab on standard mode or responsive mobile
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'upnext'>('chat');

  // Track seek timestamp clicks from description to player
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);

  // Top page container ref for smooth scrolling to top when changing videos
  const topRef = useRef<HTMLDivElement | null>(null);

  const handleSelectVideo = (video: Video) => {
    setCurrentVideo(video);
    setSeekTimestamp(null);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSeek = (seconds: number) => {
    setSeekTimestamp(seconds);
  };

  // Up Next video recommendations (filter out current video)
  const upNextVideos = allVideos.filter((v) => v.id !== activeVideo.id);

  return (
    <div ref={topRef} className="min-h-screen bg-[#07090e] text-slate-100 font-sans">
      {/* ========================================================================= */}
      {/* THEATER MODE LAYOUT (Twitch-Style Immersive Stage) */}
      {/* ========================================================================= */}
      {isTheaterMode ? (
        <div className="flex flex-col w-full">
          {/* Upper Theater Stage: Video Player + Live Chat side-by-side */}
          <div className="w-full bg-black border-b border-cyan-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col lg:flex-row h-[55vh] md:h-[68vh] lg:h-[78vh] min-h-[420px] max-h-[920px]">
              {/* Player expands across main space */}
              <div className="flex-1 h-full bg-black flex items-center justify-center overflow-hidden">
                <CyberVideoPlayer
                  video={activeVideo}
                  seekToTime={seekTimestamp}
                  className="w-full h-full rounded-none border-none shadow-none"
                />
              </div>

              {/* Twitch-Style Live Chat alongside player in Theater Mode */}
              <div className="w-full lg:w-[380px] xl:w-[420px] h-[360px] lg:h-full border-t lg:border-t-0 lg:border-l border-cyan-500/20 shrink-0">
                <LiveChatPanel className="h-full border-none" />
              </div>
            </div>
          </div>

          {/* Lower Section: Details, Comments, and Up Next Recommendations */}
          <div className="max-w-[1700px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 8 cols: Video Details & Comments */}
              <div className="lg:col-span-8 space-y-8">
                <VideoDetails video={activeVideo} onSeek={handleSeek} />
                <CommentsSection videoId={activeVideo.id} />
              </div>

              {/* Right 4 cols: Up Next Videos Feed */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-mono text-sm font-bold tracking-wider text-cyan-300 uppercase text-glow-cyan">
                      Up Next Broadcasts
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {upNextVideos.length} streams
                  </span>
                </div>

                {/* Recommendations list */}
                <div className="space-y-3">
                  {upNextVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => handleSelectVideo(vid)}
                      className="group flex gap-3 p-2 rounded-xl bg-slate-900/40 hover:bg-cyan-950/30 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer"
                    >
                      {/* Thumbnail with duration or live badge */}
                      <div className="relative w-36 sm:w-40 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-slate-200">
                          {vid.isLive ? (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              LIVE
                            </span>
                          ) : (
                            vid.duration
                          )}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-2 leading-snug transition-colors">
                            {vid.title}
                          </h4>
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                            <span className="truncate">{vid.channel.name}</span>
                            {vid.channel.isVerified && (
                              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                          {vid.isLive ? (
                            <span className="text-red-400 flex items-center gap-1">
                              <Radio className="w-3 h-3" />
                              {vid.liveViewers || '18K'} watching
                            </span>
                          ) : (
                            <>
                              <span>{vid.views} views</span>
                              <span>•</span>
                              <span>{vid.uploadedAt}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARD MODE LAYOUT (Twitch Stream + YouTube Meta Fusion) */
        /* ========================================================================= */
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Center Main Column (8 cols in lg, 9 cols in xl) */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              {/* Cyber-Cyan Video Player */}
              <div className="w-full">
                <CyberVideoPlayer
                  video={activeVideo}
                  seekToTime={seekTimestamp}
                  className="w-full shadow-[0_4px_30px_rgba(0,0,0,0.7)]"
                />
              </div>

              {/* Video Details & Actions */}
              <VideoDetails video={activeVideo} onSeek={handleSeek} />

              {/* YouTube-Style Threaded Comments */}
              <CommentsSection videoId={activeVideo.id} />
            </div>

            {/* Right Sidebar Column (4 cols in lg, 3 cols in xl) */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4">
              {/* Sidebar Header Tabs: Live Chat vs Up Next */}
              <div className="flex rounded-xl bg-slate-900/90 p-1 border border-cyan-500/20 text-xs font-mono">
                <button
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                    activeSidebarTab === 'chat'
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)] border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Stream Chat</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('upnext')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold uppercase tracking-wider transition cursor-pointer ${
                    activeSidebarTab === 'upnext'
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)] border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListVideo className="w-3.5 h-3.5" />
                  <span>Up Next ({upNextVideos.length})</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeSidebarTab === 'chat' ? (
                <div className="h-[620px] rounded-xl overflow-hidden border border-cyan-500/20 shadow-xl">
                  <LiveChatPanel className="h-full border-none" />
                </div>
              ) : (
                /* Up Next Video Recommendations List */
                <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                  {upNextVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => handleSelectVideo(vid)}
                      className="group flex gap-2.5 p-2 rounded-xl bg-slate-900/50 hover:bg-cyan-950/30 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-950">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-slate-200">
                          {vid.isLive ? (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              LIVE
                            </span>
                          ) : (
                            vid.duration
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-2 leading-tight transition-colors">
                            {vid.title}
                          </h4>
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                            <span className="truncate">{vid.channel.name}</span>
                            {vid.channel.isVerified && (
                              <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-1">
                          {vid.isLive ? (
                            <span className="text-red-400 font-semibold">
                              {vid.liveViewers || '18K'} live
                            </span>
                          ) : (
                            <span>{vid.views} views</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
