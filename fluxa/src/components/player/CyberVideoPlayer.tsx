import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  PictureInPicture2,
  Settings,
  RotateCcw,
  Check,
  Radio,
  Sparkles,
} from 'lucide-react';
import { Video } from '../../types';
import { useFluxa } from '../../context/FluxaContext';

interface CyberVideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  seekToTime?: number | null;
}

const QUALITIES = ['Auto', '1080p60', '720p', '480p'] as const;
type Quality = typeof QUALITIES[number];

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

export const CyberVideoPlayer: React.FC<CyberVideoPlayerProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
  onTimeUpdate,
  seekToTime,
}) => {
  const { isTheaterMode, toggleTheaterMode } = useFluxa();

  // Video and container refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [selectedQuality, setSelectedQuality] = useState<Quality>('1080p60');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality'>('main');

  // Hover scrub state
  const [hoverScrubTime, setHoverScrubTime] = useState<number | null>(null);
  const [hoverScrubPosition, setHoverScrubPosition] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Play/Pause flash animation
  const [centerAnimation, setCenterAnimation] = useState<'play' | 'pause' | null>(null);

  // Determine if video is YouTube
  const isYouTube = Boolean(
    video.isYouTube ||
      (video.videoUrl &&
        (video.videoUrl.length === 11 ||
          video.videoUrl.includes('youtube.com') ||
          video.videoUrl.includes('youtu.be')))
  );

  const getYouTubeEmbedUrl = (urlOrId: string): string => {
    let videoId = urlOrId;
    if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('.')) {
      videoId = urlOrId;
    } else {
      const match = urlOrId.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
      );
      if (match && match[1]) {
        videoId = match[1];
      }
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(
      typeof window !== 'undefined' ? window.location.origin : ''
    )}`;
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Autoplay and Source Change
  useEffect(() => {
    if (!isYouTube && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsLoading(true);
      if (autoPlay) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Browser autoplay policy might require mute
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            });
        }
      }
    }
  }, [video.videoUrl, isYouTube, autoPlay]);

  // Handle external seek requests (e.g. from timestamp chapter clicks)
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime]);

  // Handle Play/Pause
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play();
      setIsPlaying(true);
      setCenterAnimation('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setCenterAnimation('pause');
    }
    setTimeout(() => setCenterAnimation(null), 600);
  }, []);

  // Handle Mute/Unmute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  }, [isMuted, volume]);

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  // Seek time calculation
  const getScrubTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pos * (duration || 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const seekTo = getScrubTimeFromEvent(e);
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverScrubPosition(pos);
    setHoverScrubTime(pos * duration);

    if (isScrubbing && videoRef.current) {
      videoRef.current.currentTime = pos * duration;
      setCurrentTime(pos * duration);
    }
  };

  const handleProgressMouseLeave = () => {
    setHoverScrubTime(null);
    setIsScrubbing(false);
  };

  // Handle Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  }, []);

  // Listen to fullscreen changes (e.g. Escape key)
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Handle Picture-in-Picture
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.error('PiP toggle error:', err);
    }
  }, []);

  // Handle Playback Speed
  const handleSpeedChange = (speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSettingsOpen(false);
    setSettingsTab('main');
  };

  // Handle Quality change (visual placeholder for direct video)
  const handleQualityChange = (q: Quality) => {
    setSelectedQuality(q);
    setIsSettingsOpen(false);
    setSettingsTab('main');
  };

  // Reset inactivity timer for overlay controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (isPlaying && !isSettingsOpen && !isScrubbing) {
        setShowControls(false);
      }
    }, 2500);
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isSettingsOpen && !isScrubbing) {
      setShowControls(false);
    }
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs/chat
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          toggleTheaterMode();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              duration || 0,
              videoRef.current.currentTime + 5
            );
          }
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, prev + 0.05);
            if (videoRef.current) videoRef.current.volume = next;
            return next;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, prev - 0.05);
            if (videoRef.current) videoRef.current.volume = next;
            return next;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, toggleFullscreen, toggleTheaterMode, toggleMute, duration]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    onTimeUpdate?.(curr, videoRef.current.duration || 0);

    // Update buffer progress
    if (videoRef.current.buffered.length > 0) {
      for (let i = 0; i < videoRef.current.buffered.length; i++) {
        if (
          videoRef.current.buffered.start(i) <= curr &&
          curr <= videoRef.current.buffered.end(i)
        ) {
          setBufferedEnd(videoRef.current.buffered.end(i));
          break;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group select-none bg-black overflow-hidden font-sans rounded-xl border border-cyan-500/20 shadow-[0_0_25px_rgba(0,240,255,0.12)] transition-all duration-300 ${className}`}
      style={{
        aspectRatio: '16/9',
      }}
    >
      {/* Cyber HUD Corner Brackets */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>

      {isYouTube ? (
        /* YouTube Embed View */
        <div className="relative w-full h-full">
          <iframe
            src={getYouTubeEmbedUrl(video.videoUrl)}
            title={video.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {/* Quick HUD bar for YouTube embed */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-[#07090e]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-300">
            <span className="flex items-center gap-1 text-red-400">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
              YT-FEED
            </span>
            <span className="text-slate-600">|</span>
            <button
              onClick={toggleTheaterMode}
              title="Toggle Theater Mode (T)"
              className="hover:text-cyan-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              {isTheaterMode ? 'STANDARD' : 'THEATER'}
            </button>
          </div>
        </div>
      ) : (
        /* HTML5 Cyber-Cyan Video Player */
        <>
          <video
            ref={videoRef}
            src={video.videoUrl}
            poster={video.thumbnail}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlayPause}
            onDoubleClick={toggleFullscreen}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              onEnded?.();
            }}
            playsInline
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-black/40 backdrop-blur-xs">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-ping" />
                <div className="w-12 h-12 border-3 border-transparent border-t-cyan-400 border-r-cyan-400 rounded-full animate-spin shadow-[0_0_15px_#00f0ff]" />
                <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
              </div>
              <span className="mt-3 text-xs font-mono uppercase tracking-widest text-cyan-400/90 text-glow-cyan">
                SYNCHRONIZING STREAM...
              </span>
            </div>
          )}

          {/* Big Center Play/Pause Indicator Flash */}
          {centerAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-out fade-out zoom-out duration-500">
              <div className="w-20 h-20 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                {centerAnimation === 'play' ? (
                  <Play className="w-10 h-10 text-cyan-400 fill-cyan-400 translate-x-0.5" />
                ) : (
                  <Pause className="w-10 h-10 text-cyan-400 fill-cyan-400" />
                )}
              </div>
            </div>
          )}

          {/* Top HUD Title Bar Overlay */}
          <div
            className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 transition-opacity duration-300 flex items-center justify-between ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate max-w-[70%]">
              {video.isLive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-[11px] font-mono font-bold tracking-wider text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 font-semibold tracking-wider">
                  HUD // VOD
                </span>
              )}
              <h2 className="text-sm font-medium text-white/95 truncate drop-shadow-md">
                {video.title}
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-cyan-400/80">
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-900/80 border border-cyan-500/20">
                CYBER-60FPS
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-slate-900/80 border border-cyan-500/20">
                AAC 320K
              </span>
            </div>
          </div>

          {/* Bottom Cyber-Cyan Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-20 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Scrubber Bar */}
            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={handleProgressMouseLeave}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              className="relative w-full h-2 group/scrubber cursor-pointer mb-3 py-1 flex items-center"
            >
              {/* Hover Scrubber Tooltip */}
              {hoverScrubTime !== null && (
                <div
                  className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 bg-[#0a0e17] border border-cyan-500/60 rounded text-[11px] font-mono text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)] pointer-events-none"
                  style={{ left: `${hoverScrubPosition * 100}%` }}
                >
                  {formatTime(hoverScrubTime)}
                </div>
              )}

              {/* Progress Background Track */}
              <div className="relative w-full h-1.5 group-hover/scrubber:h-2.5 rounded-full bg-slate-800/80 transition-all duration-200 overflow-hidden">
                {/* Buffer Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-slate-600/50 rounded-full transition-all duration-300"
                  style={{ width: `${bufferPercent}%` }}
                />

                {/* Progress Active Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full shadow-[0_0_12px_#00f0ff]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Glowing Scrubber Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-300 border-2 border-[#07090e] shadow-[0_0_12px_#00f0ff] opacity-0 group-hover/scrubber:opacity-100 transition-all duration-150 pointer-events-none scale-110"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between gap-2 text-white">
              {/* Left Group: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  className="p-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-500/20 active:scale-95 transition cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Volume Slider Group */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <div className="w-0 group-hover/vol:w-20 sm:w-20 overflow-hidden transition-all duration-300 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Duration / Timestamp */}
                <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <span className="text-cyan-300 font-semibold">{formatTime(currentTime)}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-400">{formatTime(duration)}</span>
                  {video.isLive && (
                    <span className="ml-1.5 flex items-center gap-1 text-[11px] text-red-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Right Group: Quality, Speed, PiP, Theater, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Settings Dropdown Popover */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsSettingsOpen((prev) => !prev);
                      setSettingsTab('main');
                    }}
                    title="Playback Settings"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isSettingsOpen
                        ? 'text-cyan-400 bg-cyan-500/20'
                        : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {isSettingsOpen && (
                    <div className="absolute bottom-11 right-0 w-52 bg-[#0a0e17]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-2 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                      {settingsTab === 'main' && (
                        <div className="space-y-1">
                          <div className="px-2 py-1 font-mono text-[11px] text-cyan-400 uppercase tracking-wider border-b border-cyan-500/20 mb-1 flex items-center justify-between">
                            <span>HUD Controls</span>
                            <span className="text-slate-500">v1.0</span>
                          </div>

                          <button
                            onClick={() => setSettingsTab('speed')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                              Playback Speed
                            </span>
                            <span className="font-mono text-cyan-300">{playbackSpeed}x</span>
                          </button>

                          <button
                            onClick={() => setSettingsTab('quality')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-200 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Radio className="w-3.5 h-3.5 text-cyan-400" />
                              Quality
                            </span>
                            <span className="font-mono text-cyan-300">{selectedQuality}</span>
                          </button>
                        </div>
                      )}

                      {settingsTab === 'speed' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => setSettingsTab('main')}
                            className="w-full text-left px-2 py-1 font-mono text-[11px] text-cyan-400 hover:underline mb-1"
                          >
                            ← Back
                          </button>
                          {PLAYBACK_SPEEDS.map((speed) => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                playbackSpeed === speed
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'hover:bg-cyan-500/10 text-slate-300'
                              }`}
                            >
                              <span className="font-mono">{speed}x</span>
                              {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {settingsTab === 'quality' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => setSettingsTab('main')}
                            className="w-full text-left px-2 py-1 font-mono text-[11px] text-cyan-400 hover:underline mb-1"
                          >
                            ← Back
                          </button>
                          {QUALITIES.map((quality) => (
                            <button
                              key={quality}
                              onClick={() => handleQualityChange(quality)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                                selectedQuality === quality
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'hover:bg-cyan-500/10 text-slate-300'
                              }`}
                            >
                              <span className="font-mono">{quality}</span>
                              {selectedQuality === quality && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Picture in Picture */}
                {document.pictureInPictureEnabled && (
                  <button
                    onClick={togglePiP}
                    title="Picture-in-Picture"
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isPiPActive
                        ? 'text-cyan-300 bg-cyan-500/20'
                        : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10'
                    }`}
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>
                )}

                {/* Theater Mode Toggle */}
                <button
                  onClick={toggleTheaterMode}
                  title="Theater Mode (T)"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isTheaterMode
                      ? 'text-cyan-400 bg-cyan-500/20 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                      : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10'
                  }`}
                >
                  <Tv className="w-5 h-5" />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 active:scale-95 transition cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
