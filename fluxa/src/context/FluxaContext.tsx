import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { Video, Category, ChatMessage } from '../types';
import { mockVideos, mockChannels } from '../data/mockData';
import { startChatSimulation, INITIAL_CHAT_MESSAGES } from '../services/chatSimulator';

export interface FluxaContextType {
  currentVideo: Video | null;
  setCurrentVideo: (video: Video) => void;
  isTheaterMode: boolean;
  toggleTheaterMode: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeCategory: Category;
  setActiveCategory: (cat: Category) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  followedChannels: string[];
  toggleFollow: (channelId: string) => void;
  likedVideos: string[];
  toggleLike: (videoId: string) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  cheerSparks: (amount: number) => void;
  loadCustomVideo: (urlOrId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sparksBalance: number;
  allVideos: Video[];
}

const FluxaContext = createContext<FluxaContextType | undefined>(undefined);

export const FluxaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to first live stream video
  const firstLive = mockVideos.find((v) => v.isLive) || mockVideos[0];
  const [currentVideo, _setCurrentVideo] = useState<Video | null>(firstLive);
  const [allVideos, setAllVideos] = useState<Video[]>(mockVideos);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sparksBalance, setSparksBalance] = useState<number>(1250);

  const setCurrentVideo = useCallback((video: Video) => {
    _setCurrentVideo(video);
    setActiveTab('watch');
  }, []);

  // Followed channels (default with 3 popular channels)
  const [followedChannels, setFollowedChannels] = useState<string[]>([
    'ch-neon-valkyrie',
    'ch-cyber-nexus',
    'ch-synth-wave',
  ]);

  // Liked video IDs
  const [likedVideos, setLikedVideos] = useState<string[]>(['flux-vid-01', 'flux-vid-02']);

  // Live Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);

  // Subscribe to live simulated chat
  useEffect(() => {
    const stopSimulation = startChatSimulation((newMsg) => {
      setChatMessages((prev) => {
        // Keep last 120 messages
        const updated = [...prev, newMsg];
        return updated.length > 120 ? updated.slice(-120) : updated;
      });
    });

    return () => {
      stopSimulation();
    };
  }, [currentVideo?.id]);

  const toggleTheaterMode = useCallback(() => {
    setIsTheaterMode((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleFollow = useCallback((channelId: string) => {
    setFollowedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((id) => id !== channelId) : [...prev, channelId]
    );
  }, []);

  const toggleLike = useCallback((videoId: string) => {
    setLikedVideos((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      username: 'You',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      color: '#00f0ff',
      badges: [{ type: 'sub', label: 'SUB', color: '#00f0ff' }],
      message: text.trim(),
      timestamp,
    };

    setChatMessages((prev) => [...prev.slice(-120), userMsg]);
  }, []);

  const cheerSparks = useCallback((amount: number) => {
    if (amount <= 0) return;

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: Math.min(amount, 80),
        spread: 60,
        origin: { y: 0.7, x: 0.8 },
        colors: ['#00f0ff', '#ff007f', '#ffb703', '#00ff88'],
      });
    } catch {
      // ignore in environments without canvas
    }

    setSparksBalance((prev) => Math.max(0, prev - amount));

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const cheerMsg: ChatMessage = {
      id: `msg-cheer-${Date.now()}`,
      username: 'You',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      color: '#00f0ff',
      badges: [{ type: 'sub', label: 'SUB', color: '#00f0ff' }],
      message: `Cheered ${amount} Sparks! ✨ High energy stream!`,
      timestamp,
      isCheer: true,
      sparksAmount: amount,
    };

    setChatMessages((prev) => [...prev.slice(-120), cheerMsg]);
  }, []);

  const loadCustomVideo = useCallback((urlOrId: string) => {
    const trimmed = urlOrId.trim();
    if (!trimmed) return;

    let isYouTube = false;
    let videoUrl = trimmed;
    let extractedTitle = 'Custom Stream';

    // Check YouTube URL patterns
    const ytMatch = trimmed.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );

    if (ytMatch && ytMatch[1]) {
      isYouTube = true;
      videoUrl = ytMatch[1];
      extractedTitle = `YouTube Stream [${ytMatch[1]}]`;
    } else if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
      // Looks like a raw YouTube ID
      isYouTube = true;
      videoUrl = trimmed;
      extractedTitle = `YouTube Stream [${trimmed}]`;
    } else {
      // Direct MP4 / Video Stream
      const fileName = trimmed.split('/').pop()?.split('?')[0] || 'Custom Video';
      extractedTitle = fileName.replace(/\.[^/.]+$/, '');
    }

    const customVideo: Video = {
      id: `custom-vid-${Date.now()}`,
      title: extractedTitle,
      description: `User loaded custom broadcast: ${trimmed}`,
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      videoUrl,
      isYouTube,
      duration: 'LIVE',
      views: '1',
      uploadedAt: 'Just now',
      channel: mockChannels[0],
      category: 'Cyberpunk & Tech',
      tags: ['Custom', 'UserLoaded', 'Live'],
      likes: 1,
      dislikes: 0,
      isLive: true,
      liveViewers: '1',
      upNext: mockVideos.slice(0, 3).map((v) => v.id),
    };

    setAllVideos((prev) => [customVideo, ...prev]);
    setCurrentVideo(customVideo);
    setActiveTab('home');
  }, []);

  return (
    <FluxaContext.Provider
      value={{
        currentVideo,
        setCurrentVideo,
        isTheaterMode,
        toggleTheaterMode,
        isSidebarCollapsed,
        toggleSidebar,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        followedChannels,
        toggleFollow,
        likedVideos,
        toggleLike,
        chatMessages,
        sendChatMessage,
        cheerSparks,
        loadCustomVideo,
        activeTab,
        setActiveTab,
        sparksBalance,
        allVideos,
      }}
    >
      {children}
    </FluxaContext.Provider>
  );
};

export const useFluxa = (): FluxaContextType => {
  const context = useContext(FluxaContext);
  if (!context) {
    throw new Error('useFluxa must be used within a FluxaProvider');
  }
  return context;
};
