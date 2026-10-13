/**
 * ZenTube Fallback Mirror Engine
 * Privacy-respecting federated fallback layer for Invidious and Piped instances
 * Enables automated failover when direct YouTube requests are blocked or rate-limited
 */

import type {
  StreamInfo,
  VideoStream,
  AudioStream,
  SubtitleTrack,
  Thumbnail,
  RelatedVideoItem,
} from '../types.ts';
import { StreamExtractor } from '../extractors/stream.ts';
import { extractVideoId } from '../utils/helper.ts';

export interface MirrorInstance {
  url: string;
  name: string;
  type: 'invidious' | 'piped';
  healthy: boolean;
  latencyMs: number;
  lastChecked?: number;
}

export const DEFAULT_MIRRORS: MirrorInstance[] = [
  // Invidious instances
  { url: 'https://inv.nadeko.net', name: 'Nadeko (Invidious)', type: 'invidious', healthy: false, latencyMs: 0 },
  { url: 'https://invidious.nerdvpn.de', name: 'NerdVPN (Invidious)', type: 'invidious', healthy: false, latencyMs: 0 },
  { url: 'https://yt.chocolatemoo53.com', name: 'ChocolateMoo (Invidious)', type: 'invidious', healthy: false, latencyMs: 0 },
  { url: 'https://invidious.jing.rocks', name: 'JingRocks (Invidious)', type: 'invidious', healthy: false, latencyMs: 0 },
  { url: 'https://invidious.private.coffee', name: 'PrivateCoffee (Invidious)', type: 'invidious', healthy: false, latencyMs: 0 },
  // Piped instances
  { url: 'https://pipedapi.kavin.rocks', name: 'Kavin Rocks (Piped)', type: 'piped', healthy: false, latencyMs: 0 },
  { url: 'https://api.piped.privacydev.net', name: 'PrivacyDev (Piped)', type: 'piped', healthy: false, latencyMs: 0 },
  { url: 'https://piped-api.lunar.icu', name: 'Lunar (Piped)', type: 'piped', healthy: false, latencyMs: 0 },
];

export class MirrorManager {
  private static mirrors: MirrorInstance[] = [...DEFAULT_MIRRORS];
  private static lastBenchmark = 0;

  /**
   * Retrieves registered mirror instances
   */
  public static getMirrors(): MirrorInstance[] {
    return [...this.mirrors];
  }

  /**
   * Pings a mirror instance to evaluate health and round-trip latency
   */
  public static async pingMirror(mirror: MirrorInstance, timeoutMs = 3500): Promise<MirrorInstance> {
    const startTime = Date.now();
    try {
      const pingUrl = mirror.type === 'invidious'
        ? `${mirror.url}/api/v1/stats`
        : `${mirror.url}/streams/jNQXAC9IVRw`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(pingUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
        },
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const healthy = res.ok || res.status === 200;

      return {
        ...mirror,
        healthy,
        latencyMs: healthy ? latencyMs : 9999,
        lastChecked: Date.now(),
      };
    } catch {
      return {
        ...mirror,
        healthy: false,
        latencyMs: 9999,
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Concurrently checks and benchmarks all registered mirrors, sorting by lowest latency
   */
  public static async checkAllMirrors(timeoutMs = 3500): Promise<MirrorInstance[]> {
    const results = await Promise.all(
      this.mirrors.map((m) => this.pingMirror(m, timeoutMs))
    );

    // Sort: healthy instances first by latency, then unhealthy instances
    this.mirrors = results.sort((a, b) => {
      if (a.healthy && !b.healthy) return -1;
      if (!a.healthy && b.healthy) return 1;
      return a.latencyMs - b.latencyMs;
    });

    this.lastBenchmark = Date.now();
    return [...this.mirrors];
  }

  /**
   * Returns healthy mirrors sorted by lowest latency.
   * Auto-refreshes if checks are older than 5 minutes.
   */
  public static async getHealthyMirrors(): Promise<MirrorInstance[]> {
    const now = Date.now();
    if (this.lastBenchmark === 0 || now - this.lastBenchmark > 5 * 60 * 1000) {
      await this.checkAllMirrors();
    }
    return this.mirrors.filter((m) => m.healthy);
  }

  /**
   * Extracts video stream information from an Invidious instance and normalizes to StreamInfo
   */
  public static async extractFromInvidious(instanceUrl: string, videoId: string): Promise<StreamInfo> {
    const cleanUrl = instanceUrl.replace(/\/+$/, '');
    const apiUrl = `${cleanUrl}/api/v1/videos/${videoId}`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!res.ok) {
      throw new Error(`Invidious mirror (${instanceUrl}) responded with HTTP ${res.status}`);
    }

    const data: any = await res.json();

    const videoStreams: VideoStream[] = [];
    const audioStreams: AudioStream[] = [];

    // Map progressive format streams
    if (Array.isArray(data.formatStreams)) {
      for (const f of data.formatStreams) {
        const height = parseInt((f.resolution || f.qualityLabel || '360p').replace(/\D/g, ''), 10) || 360;
        videoStreams.push({
          itag: f.itag || 18,
          url: f.url,
          mimeType: f.type || 'video/mp4',
          container: (f.container || 'mp4').toLowerCase(),
          codecs: f.encoding || '',
          bitrate: f.bitrate ? parseInt(f.bitrate, 10) : 1000000,
          qualityLabel: f.qualityLabel || f.resolution || `${height}p`,
          type: 'video_audio',
          width: f.width || Math.round((height * 16) / 9),
          height,
          fps: f.fps || 30,
          resolution: `${height}p`,
        });
      }
    }

    // Map adaptive formats (video-only and audio-only)
    if (Array.isArray(data.adaptiveFormats)) {
      for (const a of data.adaptiveFormats) {
        const isAudio = a.type?.startsWith('audio/') || (!a.resolution && a.audioQuality);
        if (isAudio) {
          audioStreams.push({
            itag: a.itag || 140,
            url: a.url,
            mimeType: a.type || 'audio/mp4',
            container: (a.container || (a.type?.includes('webm') ? 'webm' : 'm4a')).toLowerCase(),
            codecs: a.encoding || '',
            bitrate: a.bitrate ? parseInt(a.bitrate, 10) : 128000,
            type: 'audio_only',
            audioQuality: a.audioQuality || 'AUDIO_QUALITY_MEDIUM',
            audioSampleRate: a.audioSampleRate ? parseInt(a.audioSampleRate, 10) : 44100,
            audioChannels: a.audioChannels || 2,
          });
        } else {
          const height = parseInt((a.resolution || a.qualityLabel || '720p').replace(/\D/g, ''), 10) || 720;
          videoStreams.push({
            itag: a.itag || 136,
            url: a.url,
            mimeType: a.type || 'video/mp4',
            container: (a.container || 'mp4').toLowerCase(),
            codecs: a.encoding || '',
            bitrate: a.bitrate ? parseInt(a.bitrate, 10) : 2000000,
            qualityLabel: a.qualityLabel || a.resolution || `${height}p`,
            type: 'video_only',
            width: a.width || Math.round((height * 16) / 9),
            height,
            fps: a.fps || 30,
            resolution: `${height}p`,
          });
        }
      }
    }

    // Map subtitles
    const subtitles: SubtitleTrack[] = (data.captions || data.subtitles || []).map((c: any) => ({
      name: c.label || c.name || 'Captions',
      languageCode: c.languageCode || 'en',
      baseUrl: cleanUrl + (c.url.startsWith('/') ? c.url : `/${c.url}`),
      isAutoGenerated: Boolean(c.isAutoGenerated),
    }));

    // Map thumbnails
    const thumbnails: Thumbnail[] = (data.videoThumbnails || []).map((t: any) => ({
      url: t.url,
      width: t.width || 640,
      height: t.height || 360,
    }));

    // Map related videos
    const relatedVideos: RelatedVideoItem[] = (data.recommendedVideos || []).map((r: any) => ({
      id: r.videoId,
      title: r.title,
      duration: r.lengthSeconds ? `${Math.floor(r.lengthSeconds / 60)}:${(r.lengthSeconds % 60).toString().padStart(2, '0')}` : undefined,
      viewCountText: r.viewCountText,
      uploaderName: r.author,
      uploaderAvatarUrl: undefined,
      thumbnailUrl: r.videoThumbnails?.[0]?.url,
    }));

    return {
      platform: 'youtube',
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: data.title || 'Untitled',
      description: data.description || '',
      duration: data.lengthSeconds || 0,
      viewCount: data.viewCount || 0,
      uploadDate: data.published ? new Date(data.published * 1000).toISOString() : undefined,
      isLive: Boolean(data.liveNow),
      uploader: {
        id: data.authorId || '',
        name: data.author || 'Unknown',
        url: data.authorUrl ? (data.authorUrl.startsWith('http') ? data.authorUrl : `${cleanUrl}${data.authorUrl}`) : '',
        avatarUrl: data.authorThumbnails?.[0]?.url,
        verified: Boolean(data.authorVerified),
        subscriberCountText: data.subCountText,
      },
      thumbnails,
      videoStreams,
      audioStreams,
      subtitles,
      chapters: [],
      hlsManifestUrl: data.hlsUrl,
      dashManifestUrl: data.dashUrl,
      relatedVideos,
    };
  }

  /**
   * Extracts video stream information from a Piped instance and normalizes to StreamInfo
   */
  public static async extractFromPiped(instanceUrl: string, videoId: string): Promise<StreamInfo> {
    const cleanUrl = instanceUrl.replace(/\/+$/, '');
    const apiUrl = `${cleanUrl}/streams/${videoId}`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!res.ok) {
      throw new Error(`Piped mirror (${instanceUrl}) responded with HTTP ${res.status}`);
    }

    const data: any = await res.json();

    const videoStreams: VideoStream[] = (data.videoStreams || []).map((v: any) => {
      const height = parseInt((v.quality || '720p').replace(/\D/g, ''), 10) || 720;
      return {
        itag: v.itag || 136,
        url: v.url,
        mimeType: v.mimeType || 'video/mp4',
        container: (v.format || 'mp4').toLowerCase(),
        codecs: v.codec || '',
        bitrate: v.bitrate || 2000000,
        qualityLabel: v.quality || `${height}p`,
        type: v.videoOnly ? 'video_only' : 'video_audio',
        width: v.width || Math.round((height * 16) / 9),
        height,
        fps: v.fps || 30,
        resolution: `${height}p`,
      };
    });

    const audioStreams: AudioStream[] = (data.audioStreams || []).map((a: any) => ({
      itag: a.itag || 140,
      url: a.url,
      mimeType: a.mimeType || 'audio/mp4',
      container: (a.format || 'm4a').toLowerCase(),
      codecs: a.codec || '',
      bitrate: a.bitrate || 128000,
      type: 'audio_only',
      audioQuality: a.quality || 'AUDIO_QUALITY_MEDIUM',
      audioSampleRate: a.sampleRate || 44100,
      audioChannels: a.channels || 2,
    }));

    const subtitles: SubtitleTrack[] = (data.subtitles || []).map((s: any) => ({
      name: s.name || 'Captions',
      languageCode: s.code || 'en',
      baseUrl: s.url,
      isAutoGenerated: Boolean(s.autoGenerated),
    }));

    const thumbnails: Thumbnail[] = data.thumbnailUrl
      ? [{ url: data.thumbnailUrl, width: 640, height: 360 }]
      : [];

    const relatedVideos: RelatedVideoItem[] = (data.relatedStreams || []).map((r: any) => ({
      id: r.url?.replace(/^\/watch\?v=/, '') || '',
      title: r.title,
      duration: r.duration ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, '0')}` : undefined,
      viewCountText: r.views?.toLocaleString(),
      uploaderName: r.uploaderName,
      uploaderAvatarUrl: r.uploaderAvatar,
      thumbnailUrl: r.thumbnail,
    }));

    return {
      platform: 'youtube',
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: data.title || 'Untitled',
      description: data.description || '',
      duration: data.duration || 0,
      viewCount: data.views || 0,
      uploadDate: data.uploadDate,
      isLive: Boolean(data.livestream),
      uploader: {
        id: data.uploaderUrl?.replace(/^\/channel\//, '') || '',
        name: data.uploader || 'Unknown',
        url: data.uploaderUrl ? `${cleanUrl}${data.uploaderUrl}` : '',
        avatarUrl: data.uploaderAvatar,
        verified: Boolean(data.uploaderVerified),
      },
      thumbnails,
      videoStreams,
      audioStreams,
      subtitles,
      chapters: [],
      hlsManifestUrl: data.hls,
      dashManifestUrl: data.dash,
      relatedVideos,
    };
  }

  /**
   * Primary extraction with seamless fallback across healthy Invidious and Piped mirrors.
   * Attempts direct InnerTube extraction first; if failed/blocked, cascades to fastest healthy mirror.
   */
  public static async extractWithFallback(videoIdOrUrl: string): Promise<StreamInfo & { mirrorUsed?: string }> {
    const videoId = extractVideoId(videoIdOrUrl) || videoIdOrUrl;

    // 1. Try standard direct InnerTube extraction
    try {
      const directStream = await StreamExtractor.extract(videoId);
      return {
        ...directStream,
        platform: 'youtube',
      };
    } catch (primaryErr: any) {
      console.warn(`[ZenTube Mirror] Direct YouTube extraction failed (${primaryErr.message}). Initiating mirror failover...`);

      // 2. Discover or use currently known healthy mirrors
      let healthy = await this.getHealthyMirrors();
      if (healthy.length === 0) {
        // Run full benchmark across all mirrors
        healthy = (await this.checkAllMirrors()).filter((m) => m.healthy);
      }

      const errors: string[] = [];

      // 3. Iterate through healthy mirrors (ordered by lowest latency)
      for (const mirror of healthy) {
        try {
          console.log(`[ZenTube Mirror] Attempting failover extraction via ${mirror.name} (${mirror.url})...`);
          let stream: StreamInfo;
          if (mirror.type === 'invidious') {
            stream = await this.extractFromInvidious(mirror.url, videoId);
          } else {
            stream = await this.extractFromPiped(mirror.url, videoId);
          }

          console.log(`[ZenTube Mirror] Successfully retrieved stream via ${mirror.name}!`);
          return {
            ...stream,
            mirrorUsed: mirror.url,
          };
        } catch (mirrorErr: any) {
          errors.push(`${mirror.name}: ${mirrorErr.message}`);
        }
      }

      throw new Error(
        `Direct extraction failed (${primaryErr.message}), and all ${healthy.length} fallback mirrors failed: [${errors.join('; ')}]`
      );
    }
  }
}
