export type StreamStatus = 'live' | 'offline' | 'vod';

export type Category = 
  | 'All'
  | 'Gaming'
  | 'Cyberpunk & Tech'
  | 'Coding & Dev'
  | 'Synthwave & Lo-Fi'
  | 'AI & Science'
  | 'Esports'
  | 'Speedruns'
  | 'IRL & Creative';

export interface Channel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  banner?: string;
  subscribers: string;
  isVerified: boolean;
  isLive: boolean;
  currentCategory?: string;
  currentStreamTitle?: string;
  viewers?: string;
  bio?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string; // MP4 URL or YouTube ID (e.g. "dQw4w9WgXcQ" or direct mp4)
  isYouTube?: boolean;
  duration: string;
  views: string;
  uploadedAt: string;
  channel: Channel;
  category: Category;
  tags: string[];
  likes: number;
  dislikes: number;
  isLive?: boolean;
  liveViewers?: string;
  upNext?: string[];
}

export interface ChatBadge {
  type: 'mod' | 'vip' | 'sub' | 'verified' | 'creator';
  label: string;
  color: string;
}

export interface ChatEmote {
  code: string;
  url: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  avatar?: string;
  color?: string;
  badges?: ChatBadge[];
  message: string;
  timestamp: string;
  isCheer?: boolean;
  sparksAmount?: number;
  emotes?: string[];
}

export interface VideoComment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  likes: number;
  userLiked?: boolean;
}

export interface ClipItem {
  id: string;
  title: string;
  creator: Channel;
  videoUrl: string;
  views: string;
  likes: number;
  commentsCount: number;
  duration: string;
}
