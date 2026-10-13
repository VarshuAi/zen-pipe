import React from 'react';
import {
  Home,
  Compass,
  Radio,
  Film,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useFluxa } from '../../context/FluxaContext';
import { mockChannels } from '../../data/mockData';
import { Channel } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    followedChannels,
    activeTab,
    setActiveTab,
    setCurrentVideo,
    allVideos,
  } = useFluxa();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse', icon: Compass },
    { id: 'live', label: 'Live Streams', icon: Radio, hasLiveBadge: true },
    { id: 'clips', label: 'Clips & Shorts', icon: Film },
    { id: 'library', label: 'My Library', icon: Bookmark },
  ];

  const followedList = mockChannels.filter((c) => followedChannels.includes(c.id));
  const recommendedList = mockChannels.filter((c) => !followedChannels.includes(c.id));

  const handleChannelClick = (channel: Channel) => {
    // Find active stream or video from this channel
    const targetVideo =
      allVideos.find((v) => v.channel.id === channel.id && v.isLive) ||
      allVideos.find((v) => v.channel.id === channel.id);

    if (targetVideo) {
      setCurrentVideo(targetVideo);
    }
  };

  return (
    <aside
      className={`relative h-[calc(100vh-4rem)] sticky top-16 z-40 flex flex-col bg-[#080c14]/95 backdrop-blur-md border-r border-cyan-500/15 transition-all duration-300 ease-in-out select-none shrink-0 ${
        isSidebarCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header / Collapse toggle */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80">
        {!isSidebarCollapsed && (
          <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Navigation
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all ${
            isSidebarCollapsed ? 'mx-auto' : ''
          }`}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation links */}
      <div className="py-2 px-2 space-y-1 border-b border-slate-800/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all group relative ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />
                {item.hasLiveBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </div>

              {!isSidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed mode */}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 border border-cyan-500/40 rounded-md text-[11px] font-semibold text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable Channels list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {/* FOLLOWED CHANNELS */}
        <div>
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
                Followed Channels
              </span>
              <span className="text-[10px] font-mono text-cyan-500/80">
                {followedList.length}
              </span>
            </div>
          ) : (
            <div className="flex justify-center mb-2" title="Followed Channels">
              <Users className="w-3.5 h-3.5 text-slate-500" />
            </div>
          )}

          <div className="space-y-1">
            {followedList.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800/60 transition-all group relative border border-transparent hover:border-cyan-500/20 text-left ${
                  isSidebarCollapsed ? 'justify-center p-2' : ''
                }`}
                title={
                  isSidebarCollapsed
                    ? `${channel.name} • ${channel.isLive ? `${channel.viewers} viewers` : 'Offline'}`
                    : undefined
                }
              >
                <div className="relative shrink-0">
                  <img
                    src={channel.avatar}
                    alt={channel.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-700 group-hover:border-cyan-400/80 transition-colors"
                  />
                  {channel.isLive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#080c14] shadow-[0_0_5px_#ef4444]"></span>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {channel.name}
                      </span>
                      {channel.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {channel.currentCategory || 'Live Stream'}
                    </p>
                  </div>
                )}

                {!isSidebarCollapsed && (
                  <div className="shrink-0 text-right">
                    {channel.isLive ? (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        <span className="text-[10px] font-mono font-medium text-slate-300">
                          {channel.viewers || '12K'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-600">Offline</span>
                    )}
                  </div>
                )}

                {/* Collapsed hover tooltip */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    <div className="font-semibold text-cyan-300">{channel.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {channel.isLive ? `🔴 ${channel.viewers} viewers` : 'Offline'}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* RECOMMENDED CHANNELS */}
        <div>
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between px-2 mb-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
                Recommended Channels
              </span>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800/80"></div>
          )}

          <div className="space-y-1">
            {recommendedList.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-800/60 transition-all group relative border border-transparent hover:border-cyan-500/20 text-left ${
                  isSidebarCollapsed ? 'justify-center p-2' : ''
                }`}
                title={
                  isSidebarCollapsed
                    ? `${channel.name} • ${channel.isLive ? `${channel.viewers} viewers` : 'Offline'}`
                    : undefined
                }
              >
                <div className="relative shrink-0">
                  <img
                    src={channel.avatar}
                    alt={channel.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-700 group-hover:border-cyan-400/80 transition-colors"
                  />
                  {channel.isLive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#080c14] shadow-[0_0_5px_#ef4444]"></span>
                  )}
                </div>

                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {channel.name}
                      </span>
                      {channel.isVerified && (
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {channel.currentCategory || 'VOD'}
                    </p>
                  </div>
                )}

                {!isSidebarCollapsed && (
                  <div className="shrink-0 text-right">
                    {channel.isLive ? (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="text-[10px] font-mono font-medium text-slate-300">
                          {channel.viewers || '8K'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-600">Offline</span>
                    )}
                  </div>
                )}

                {/* Collapsed hover tooltip */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg text-xs text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                    <div className="font-semibold text-cyan-300">{channel.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {channel.isLive ? `🔴 ${channel.viewers} viewers` : 'Offline'}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
