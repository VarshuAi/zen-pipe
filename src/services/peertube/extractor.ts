/**
 * ZenTube PeerTube Extractor
 * Extracts federated videos, streams, comments, channels, and search results
 * Inspired by NewPipe's PeertubeStreamExtractor.java
 */

import { PeerTubeClient } from './client.ts';
import { formatDuration } from '../../utils/helper.ts';
import type {
  PeerTubeVideo,
  PeerTubeFile,
  PeerTubeStreamingPlaylist,
  StreamInfo,
  VideoStream,
  AudioStream,
  SearchResult,
  SearchVideoItem,
  CommentItem,
  ChannelInfo,
} from '../../types.ts';

export class PeerTubeExtractor {
  /**
   * Fetches full video metadata and streams from any PeerTube URL or video ID
   */
  public static async getVideo(idOrUrl: string, instance?: string): Promise<PeerTubeVideo> {
    const parsed = PeerTubeClient.parseVideoUrl(idOrUrl);
    const targetInstance = parsed?.instance || instance || PeerTubeClient.DEFAULT_INSTANCE;
    const videoId = parsed?.videoId || idOrUrl;

    const data = await PeerTubeClient.get<any>(`/videos/${videoId}`, { instance: targetInstance });

    const host = PeerTubeClient.normalizeInstance(targetInstance);

    // Collect all MP4 files (from direct files or streamingPlaylists files)
    const directFiles: PeerTubeFile[] = (data.files || []).map((f: any) => ({
      resolution: { id: f.resolution?.id || 0, label: f.resolution?.label || `${f.resolution?.id || 0}p` },
      magnetUri: f.magnetUri,
      size: f.size || 0,
      fps: f.fps || 30,
      fileUrl: f.fileUrl,
      fileDownloadUrl: f.fileDownloadUrl || f.fileUrl,
      mimeType: f.mimeType || 'video/mp4',
    }));

    const streamingPlaylists: PeerTubeStreamingPlaylist[] = (data.streamingPlaylists || []).map((sp: any) => ({
      id: sp.id,
      type: sp.type,
      playlistUrl: sp.playlistUrl,
      segmentsSha256Url: sp.segmentsSha256Url,
      files: (sp.files || []).map((f: any) => ({
        resolution: { id: f.resolution?.id || 0, label: f.resolution?.label || `${f.resolution?.id || 0}p` },
        magnetUri: f.magnetUri,
        size: f.size || 0,
        fps: f.fps || 30,
        fileUrl: f.fileUrl,
        fileDownloadUrl: f.fileDownloadUrl || f.fileUrl,
        mimeType: f.mimeType || 'video/mp4',
      })),
    }));

    // If direct files were empty, pull from playlist files
    const allFiles = directFiles.length > 0 ? directFiles : (streamingPlaylists[0]?.files || []);

    const thumbnailUrl = data.thumbnailPath
      ? `https://${host}${data.thumbnailPath.startsWith('/') ? '' : '/'}${data.thumbnailPath}`
      : (data.thumbnailUrl || '');

    const previewUrl = data.previewPath
      ? `https://${host}${data.previewPath.startsWith('/') ? '' : '/'}${data.previewPath}`
      : data.previewUrl;

    return {
      id: data.id,
      uuid: data.uuid,
      name: data.name || '',
      description: data.description || '',
      duration: data.duration || 0,
      views: data.views || 0,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      publishedAt: data.publishedAt || '',
      originallyPublishedAt: data.originallyPublishedAt,
      category: data.category,
      licence: data.licence,
      language: data.language,
      privacy: data.privacy,
      channel: {
        id: data.channel?.id || 0,
        name: data.channel?.name || '',
        displayName: data.channel?.displayName || data.channel?.name || '',
        url: data.channel?.url || `https://${host}/video-channels/${data.channel?.name}`,
        avatars: data.channel?.avatars,
      },
      account: data.account ? {
        id: data.account.id || 0,
        name: data.account.name || '',
        displayName: data.account.displayName || data.account.name || '',
        url: data.account.url || `https://${host}/accounts/${data.account.name}`,
        avatars: data.account.avatars,
      } : undefined,
      thumbnailUrl,
      previewUrl,
      embedUrl: `https://${host}/videos/embed/${data.uuid || data.id}`,
      files: allFiles,
      streamingPlaylists,
      tags: Array.isArray(data.tags) ? data.tags : [],
      instanceHost: host,
    };
  }

  /**
   * Adapts a PeerTubeVideo into the unified ZenTube StreamInfo model
   */
  public static toStreamInfo(video: PeerTubeVideo): StreamInfo {
    const videoStreams: VideoStream[] = video.files.map((file, index) => ({
      itag: 1000 + (file.resolution.id || index),
      url: file.fileUrl,
      mimeType: file.mimeType || 'video/mp4',
      container: 'mp4',
      codecs: 'avc1, mp4a',
      bitrate: file.size > 0 && video.duration > 0 ? Math.round((file.size * 8) / video.duration) : 1500000,
      contentLength: file.size,
      qualityLabel: file.resolution.label || `${file.resolution.id}p`,
      type: 'video_audio',
      width: 0,
      height: file.resolution.id || 0,
      fps: file.fps || 30,
      resolution: file.resolution.label || `${file.resolution.id}p`,
    }));

    // Create an audio representation from the highest quality file or stream
    const audioStreams: AudioStream[] = video.files.length > 0 ? [{
      itag: 999,
      url: video.files[0].fileUrl,
      mimeType: 'audio/mp4',
      container: 'mp4',
      codecs: 'mp4a.40.2',
      bitrate: 128000,
      audioQuality: 'MEDIUM',
      audioSampleRate: 44100,
      audioChannels: 2,
      type: 'audio_only',
    }] : [];

    const hlsUrl = video.streamingPlaylists?.[0]?.playlistUrl;

    return {
      platform: 'peertube',
      id: String(video.id),
      url: `https://${video.instanceHost}/w/${video.uuid || video.id}`,
      title: video.name,
      description: video.description,
      duration: video.duration,
      viewCount: video.views,
      uploadDate: video.publishedAt,
      isLive: false,
      uploader: {
        id: String(video.channel.id),
        name: video.channel.displayName || video.channel.name,
        url: video.channel.url,
        verified: false,
      },
      thumbnails: video.thumbnailUrl ? [{ url: video.thumbnailUrl, width: 640, height: 360 }] : [],
      videoStreams,
      audioStreams,
      subtitles: [],
      chapters: [],
      hlsManifestUrl: hlsUrl,
      relatedVideos: [],
    };
  }

  /**
   * Searches a PeerTube instance for videos
   */
  public static async search(
    query: string,
    options: { instance?: string; count?: number; start?: number } = {}
  ): Promise<SearchResult> {
    const instance = options.instance || PeerTubeClient.DEFAULT_INSTANCE;
    const count = options.count || 20;
    const start = options.start || 0;

    const data = await PeerTubeClient.get<any>(
      `/search/videos?search=${encodeURIComponent(query)}&count=${count}&start=${start}`,
      { instance }
    );

    const host = PeerTubeClient.normalizeInstance(instance);
    const items: SearchVideoItem[] = (data.data || []).map((v: any) => ({
      type: 'video',
      platform: 'peertube',
      id: v.uuid || String(v.id),
      title: v.name || '',
      descriptionSnippet: v.description?.slice(0, 150),
      durationText: formatDuration(v.duration || 0),
      viewCountText: `${(v.views || 0).toLocaleString()} views`,
      publishedTimeText: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '',
      uploader: {
        name: v.channel?.displayName || v.channel?.name || v.account?.name || 'Unknown',
        id: String(v.channel?.id || ''),
        verified: false,
      },
      thumbnails: v.thumbnailPath
        ? [{ url: `https://${host}${v.thumbnailPath.startsWith('/') ? '' : '/'}${v.thumbnailPath}`, width: 320, height: 180 }]
        : [],
    }));

    return {
      query,
      platform: 'peertube',
      items,
      continuationToken: (start + count < (data.total || 0)) ? String(start + count) : undefined,
    };
  }

  /**
   * Retrieves trending videos from a PeerTube instance
   */
  public static async getTrending(
    options: { instance?: string; count?: number; start?: number } = {}
  ): Promise<SearchResult> {
    const instance = options.instance || PeerTubeClient.DEFAULT_INSTANCE;
    const count = options.count || 20;
    const start = options.start || 0;

    const data = await PeerTubeClient.get<any>(
      `/videos?sort=-trending&count=${count}&start=${start}`,
      { instance }
    );

    const host = PeerTubeClient.normalizeInstance(instance);
    const items: SearchVideoItem[] = (data.data || []).map((v: any) => ({
      type: 'video',
      platform: 'peertube',
      id: v.uuid || String(v.id),
      title: v.name || '',
      descriptionSnippet: v.description?.slice(0, 150),
      durationText: formatDuration(v.duration || 0),
      viewCountText: `${(v.views || 0).toLocaleString()} views`,
      publishedTimeText: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '',
      uploader: {
        name: v.channel?.displayName || v.channel?.name || v.account?.name || 'Unknown',
        id: String(v.channel?.id || ''),
        verified: false,
      },
      thumbnails: v.thumbnailPath
        ? [{ url: `https://${host}${v.thumbnailPath.startsWith('/') ? '' : '/'}${v.thumbnailPath}`, width: 320, height: 180 }]
        : [],
    }));

    return {
      query: 'trending',
      platform: 'peertube',
      items,
      continuationToken: (start + count < (data.total || 0)) ? String(start + count) : undefined,
    };
  }

  /**
   * Fetches comment threads for a PeerTube video
   */
  public static async getComments(idOrUrl: string, instance?: string): Promise<CommentItem[]> {
    const parsed = PeerTubeClient.parseVideoUrl(idOrUrl);
    const targetInstance = parsed?.instance || instance || PeerTubeClient.DEFAULT_INSTANCE;
    const videoId = parsed?.videoId || idOrUrl;

    try {
      const data = await PeerTubeClient.get<any>(`/videos/${videoId}/comment-threads`, {
        instance: targetInstance,
      });

      return (data.data || []).map((c: any) => ({
        id: String(c.id),
        authorName: c.account?.displayName || c.account?.name || 'Anonymous',
        authorAvatarUrl: c.account?.avatars?.[0]?.path
          ? `https://${targetInstance}${c.account.avatars[0].path}`
          : undefined,
        content: c.text || '',
        publishedTimeText: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
        replyCount: c.totalReplies || 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches channel details and recent videos from a PeerTube instance
   */
  public static async getChannel(channelName: string, instance?: string): Promise<ChannelInfo> {
    const targetInstance = instance || PeerTubeClient.DEFAULT_INSTANCE;
    const host = PeerTubeClient.normalizeInstance(targetInstance);

    const channelData = await PeerTubeClient.get<any>(`/video-channels/${encodeURIComponent(channelName)}`, {
      instance: targetInstance,
    });

    const videosData = await PeerTubeClient.get<any>(
      `/video-channels/${encodeURIComponent(channelName)}/videos?count=20`,
      { instance: targetInstance }
    );

    const recentVideos: SearchVideoItem[] = (videosData.data || []).map((v: any) => ({
      type: 'video',
      platform: 'peertube',
      id: v.uuid || String(v.id),
      title: v.name || '',
      descriptionSnippet: v.description?.slice(0, 150),
      durationText: formatDuration(v.duration || 0),
      viewCountText: `${(v.views || 0).toLocaleString()} views`,
      publishedTimeText: v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '',
      uploader: {
        name: channelData.displayName || channelData.name,
        id: String(channelData.id),
        verified: false,
      },
      thumbnails: v.thumbnailPath
        ? [{ url: `https://${host}${v.thumbnailPath.startsWith('/') ? '' : '/'}${v.thumbnailPath}`, width: 320, height: 180 }]
        : [],
    }));

    return {
      platform: 'peertube',
      id: String(channelData.id),
      name: channelData.displayName || channelData.name,
      description: channelData.description || '',
      subscriberCountText: `${channelData.support || 0} followers`,
      videoCountText: `${videosData.total || recentVideos.length} videos`,
      avatarUrl: channelData.avatars?.[0]?.path ? `https://${host}${channelData.avatars[0].path}` : undefined,
      verified: false,
      tabs: ['Videos', 'About'],
      recentVideos,
    };
  }
}
