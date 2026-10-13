import React from 'react';
import { FluxaProvider, useFluxa } from './context/FluxaContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CategoryPills } from './components/feed/CategoryPills';
import { HeroCarousel } from './components/feed/HeroCarousel';
import { VideoCard } from './components/feed/VideoCard';
import { WatchPage } from './pages/WatchPage';
import { ClipsPage } from './pages/ClipsPage';
import {
  Radio,
  Flame,
  Sparkles,
  ArrowLeft,
  Bookmark,
  Heart,
  Users,
  Film,
  Compass,
} from 'lucide-react';
import { mockChannels } from './data/mockData';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    allVideos,
    activeCategory,
    searchQuery,
    setCurrentVideo,
    isTheaterMode,
    likedVideos,
    followedChannels,
  } = useFluxa();

  // Filter videos by search query and category
  const filteredVideos = allVideos.filter((video) => {
    const matchesCategory =
      activeCategory === 'All' || video.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const liveStreams = filteredVideos.filter((v) => v.isLive);
  const onDemandVideos = filteredVideos.filter((v) => !v.isLive);
  const myLikedVideosList = allVideos.filter((v) => likedVideos.includes(v.id));
  const myFollowedChannelsList = mockChannels.filter((c) =>
    followedChannels.includes(c.id)
  );

  const handleVideoClick = (vid: typeof allVideos[0]) => {
    setCurrentVideo(vid);
    setActiveTab('watch');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* Top Cyber HUD Navbar */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Collapsible Sidebar (hidden in theater mode on WatchPage for full immersive view) */}
        {!isTheaterMode && <Sidebar />}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {activeTab === 'clips' ? (
            <ClipsPage />
          ) : activeTab === 'watch' ? (
            <div>
              {/* Back to feed quick bar if not theater mode */}
              {!isTheaterMode && (
                <div className="bg-[#0a0e17]/80 border-b border-cyan-500/20 px-4 sm:px-6 py-2 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Stream Feed</span>
                  </button>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                      Now Playing
                    </span>
                  </div>
                </div>
              )}
              <WatchPage />
            </div>
          ) : activeTab === 'library' ? (
            /* ========================================================================= */
            /* MY LIBRARY VIEW (Saved & Liked Videos, Followed Creators) */
            /* ========================================================================= */
            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
              <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold font-mono text-slate-100 uppercase tracking-wider">
                      My Cyber Vault & Library
                    </h1>
                    <p className="text-xs text-slate-400 font-mono">
                      Your saved broadcasts, liked streams, and followed creators
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400">
                    {likedVideos.length} Liked Broadcasts
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-400">
                    {followedChannels.length} Followed Creators
                  </span>
                </div>
              </div>

              {/* Liked Videos Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <Heart className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  <h2 className="text-base font-mono font-bold uppercase tracking-wider text-slate-200">
                    Liked Broadcasts ({myLikedVideosList.length})
                  </h2>
                </div>
                {myLikedVideosList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                    {myLikedVideosList.map((vid) => (
                      <VideoCard
                        key={vid.id}
                        video={vid}
                        onClick={() => handleVideoClick(vid)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 font-mono text-sm text-slate-400">
                    No liked broadcasts yet. Click the heart icon on any stream to add it here.
                  </div>
                )}
              </div>

              {/* Followed Creators Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h2 className="text-base font-mono font-bold uppercase tracking-wider text-slate-200">
                    Followed Creators & Streamers ({myFollowedChannelsList.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {myFollowedChannelsList.map((channel) => (
                    <div
                      key={channel.id}
                      className="p-4 rounded-xl bg-[#0d1322]/70 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center gap-3.5 group cursor-pointer"
                      onClick={() => {
                        const target =
                          allVideos.find((v) => v.channel.id === channel.id && v.isLive) ||
                          allVideos.find((v) => v.channel.id === channel.id);
                        if (target) handleVideoClick(target);
                      }}
                    >
                      <div className="relative">
                        <img
                          src={channel.avatar}
                          alt={channel.name}
                          className="w-12 h-12 rounded-full object-cover border border-cyan-500/30"
                        />
                        {channel.isLive && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#07090e] animate-pulse" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                          {channel.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate">
                          {channel.subscribers} followers
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400/80 truncate">
                          {channel.isLive ? `🔴 LIVE: ${channel.viewers}` : 'Offline'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'live' ? (
            /* ========================================================================= */
            /* LIVE DIRECTORY VIEW */
            /* ========================================================================= */
            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold font-mono text-slate-100 uppercase tracking-wider">
                      Live Broadcast Directory
                    </h1>
                    <p className="text-xs text-slate-400 font-mono">
                      All creators streaming live on Fluxa right now
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                  {liveStreams.length} Channels Broadcasting
                </span>
              </div>

              <CategoryPills />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {liveStreams.map((vid) => (
                  <VideoCard
                    key={vid.id}
                    video={vid}
                    onClick={() => handleVideoClick(vid)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* HOME & BROWSE FEED */
            /* ========================================================================= */
            <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Featured Hero Carousel */}
              <HeroCarousel />

              {/* Category Pills Filter */}
              <CategoryPills />

              {/* Search Active Indicator */}
              {searchQuery && (
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-300">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>
                    Showing search results for &ldquo;{searchQuery}&rdquo; ({filteredVideos.length} matches)
                  </span>
                </div>
              )}

              {/* Live Streams Section */}
              {liveStreams.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <Radio className="w-4 h-4 text-red-400" />
                      <h2 className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-slate-100">
                        Live Channels We Think You&apos;ll Like
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-cyan-400/80">
                      {liveStreams.length} Live Now
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {liveStreams.map((vid) => (
                      <VideoCard
                        key={vid.id}
                        video={vid}
                        onClick={() => handleVideoClick(vid)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* On Demand & Recommended Videos Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between pb-1 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-slate-100">
                      {activeCategory === 'All' ? 'Trending Cyber Broadcasts' : `${activeCategory} Videos`}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {onDemandVideos.length} Videos
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {onDemandVideos.map((vid) => (
                    <VideoCard
                      key={vid.id}
                      video={vid}
                      onClick={() => handleVideoClick(vid)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FluxaProvider>
      <MainLayout />
    </FluxaProvider>
  );
}
