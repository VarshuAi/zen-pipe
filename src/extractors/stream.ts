/**
 * ZenTube Stream Extractor
 * Extracts video/audio streams, metadata, subtitles, chapters, and related videos
 * Inspired by NewPipe's YoutubeStreamExtractor.java
 */

import { HttpClient } from '../core/http.ts';
import { InnerTubeClient } from '../core/clients.ts';
import { CipherEngine } from '../core/cipher.ts';
import { getItagInfo } from '../core/itags.ts';
import { extractVideoId, parseDurationToSeconds, formatDuration } from '../utils/helper.ts';
import { getText, parseThumbnails, parseInteger } from '../utils/parser.ts';
import type {
  StreamInfo,
  VideoStream,
  AudioStream,
  SubtitleTrack,
  VideoChapter,
  RelatedVideoItem,
  Thumbnail,
} from '../types.ts';

export class StreamExtractor {
  /**
   * Main entry point to extract full stream info for a video
   */
  public static async extract(videoIdOrUrl: string): Promise<StreamInfo> {
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube video ID or URL: "${videoIdOrUrl}"`);
    }

    const visitorData = await HttpClient.getVisitorData();

    // 1. Fetch Streaming Formats using client cascading (VisionOS -> Android -> iOS -> Web)
    const playerPromise = this.fetchPlayerData(videoId, visitorData);

    // 2. Fetch Metadata, Chapters, and Related Videos using Web client
    const webContext = InnerTubeClient.createWebContext(visitorData);
    const nextPromise = HttpClient.postJson(
      `${InnerTubeClient.ENDPOINTS.NEXT}?prettyPrint=false`,
      InnerTubeClient.prepareNextBody(videoId, webContext),
      { headers: InnerTubeClient.getWebHeaders() }
    ).catch(() => null);

    const [playerData, nextData] = await Promise.all([playerPromise, nextPromise]);

    const playability = playerData?.playabilityStatus;
    if (playability?.status && playability.status !== 'OK') {
      const reason = playability.reason || 'Video cannot be played';
      if (reason.toLowerCase().includes('age-restricted') || reason.toLowerCase().includes('inappropriate')) {
        throw new Error(`AgeRestrictedError: ${reason}`);
      }
      if (reason.toLowerCase().includes('private')) {
        throw new Error(`PrivateVideoError: ${reason}`);
      }
      throw new Error(`ExtractionError (${playability.status}): ${reason}`);
    }

    const videoDetails = playerData.videoDetails || {};
    const streamingData = playerData.streamingData || {};

    // Parse video and audio formats
    const { videoStreams, audioStreams } = await this.parseFormats(streamingData);

    // Parse Subtitles
    const subtitles = this.parseSubtitles(playerData.captions);

    // Parse Chapters and Related videos from nextData
    const chapters = this.parseChapters(nextData);
    const relatedVideos = this.parseRelatedVideos(nextData);

    const thumbnails: Thumbnail[] = parseThumbnails(videoDetails.thumbnail);

    const duration = parseInteger(videoDetails.lengthSeconds, 0);

    return {
      id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: videoDetails.title || '',
      description: videoDetails.shortDescription || '',
      duration,
      viewCount: parseInteger(videoDetails.viewCount, 0),
      isLive: Boolean(videoDetails.isLive) || Boolean(videoDetails.isLiveContent) || Boolean(streamingData.hlsManifestUrl?.includes('yt_live_broadcast')) || Boolean((playerData.playabilityStatus as any)?.liveStreamability),
      uploader: {
        id: videoDetails.channelId || '',
        name: videoDetails.author || '',
        url: `https://www.youtube.com/channel/${videoDetails.channelId}`,
        verified: false,
      },
      thumbnails,
      videoStreams,
      audioStreams,
      subtitles,
      chapters,
      dashManifestUrl: streamingData.dashManifestUrl,
      hlsManifestUrl: streamingData.hlsManifestUrl,
      relatedVideos,
    };
  }

  /**
   * Fetches player data with client cascading:
   * VisionOS -> Android -> iOS -> Web
   * Ensures uninterrupted playback even on cloud datacenter IPs (Vercel, AWS, Azure, CI)
   */
  private static async fetchPlayerData(videoId: string, visitorData: string): Promise<any> {
    const clientsToTry = [
      {
        name: 'VISIONOS',
        context: InnerTubeClient.createVisionOsContext(visitorData),
        headers: InnerTubeClient.getVisionOsHeaders(),
        endpoint: `${InnerTubeClient.ENDPOINTS.PLAYER}?prettyPrint=false&id=${videoId}`,
      },
      {
        name: 'ANDROID',
        context: InnerTubeClient.createAndroidContext(visitorData),
        headers: InnerTubeClient.getAndroidHeaders(),
        endpoint: `${InnerTubeClient.ENDPOINTS.PLAYER}?prettyPrint=false&id=${videoId}`,
      },
      {
        name: 'IOS',
        context: InnerTubeClient.createIosContext(visitorData),
        headers: InnerTubeClient.getIosHeaders(),
        endpoint: `${InnerTubeClient.ENDPOINTS.PLAYER}?prettyPrint=false&id=${videoId}`,
      },
      {
        name: 'WEB',
        context: InnerTubeClient.createWebContext(visitorData),
        headers: InnerTubeClient.getWebHeaders(),
        endpoint: `${InnerTubeClient.ENDPOINTS.WEB_PLAYER}?prettyPrint=false`,
      },
    ];

    let lastData: any = null;
    let lastError: any = null;

    for (const client of clientsToTry) {
      try {
        const body = InnerTubeClient.preparePlayerBody(videoId, client.context);
        const data = await HttpClient.postJson(client.endpoint, body, { headers: client.headers });
        lastData = data;

        const playability = data?.playabilityStatus;
        const status = playability?.status;

        // If age-restricted or private, don't cascade further - it is an explicit video status
        const reason = (playability?.reason || '').toLowerCase();
        if (reason.includes('age-restricted') || reason.includes('inappropriate') || reason.includes('private')) {
          return data;
        }

        const formats = [
          ...(data?.streamingData?.formats || []),
          ...(data?.streamingData?.adaptiveFormats || []),
        ];
        const hasPlayableUrls = formats.some((f: any) => Boolean(f.url || f.signatureCipher));

        if (status === 'OK' && hasPlayableUrls) {
          return data;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (lastData) return lastData;
    throw lastError || new Error('Failed to retrieve player data from all InnerTube clients');
  }

  /**
   * Parses progressive and adaptive audio/video formats
   */
  private static async parseFormats(streamingData: any): Promise<{ videoStreams: VideoStream[]; audioStreams: AudioStream[] }> {
    const videoStreams: VideoStream[] = [];
    const audioStreams: AudioStream[] = [];

    const rawFormats: any[] = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || []),
    ];

    for (const raw of rawFormats) {
      let streamUrl = raw.url;
      if (!streamUrl && raw.signatureCipher) {
        streamUrl = await CipherEngine.resolveSignatureCipher(raw.signatureCipher);
      }
      if (!streamUrl) continue;

      const itag = raw.itag;
      const itagInfo = getItagInfo(itag);
      const mimeType = raw.mimeType || '';

      const container = itagInfo?.container || (mimeType.includes('webm') ? 'webm' : 'mp4');
      const codecs = mimeType.match(/codecs="([^"]+)"/)?.[1] || itagInfo?.videoCodec || itagInfo?.audioCodec || '';

      if (mimeType.startsWith('video/')) {
        const isVideoOnly = !raw.audioQuality && !mimeType.includes('audio');
        const width = raw.width || 0;
        const height = raw.height || 0;
        const resolution = raw.qualityLabel || itagInfo?.resolution || `${height}p`;

        videoStreams.push({
          itag,
          url: streamUrl,
          type: isVideoOnly ? 'video_only' : 'video_audio',
          mimeType,
          container,
          codecs,
          bitrate: raw.bitrate || 0,
          averageBitrate: raw.averageBitrate,
          contentLength: parseInteger(raw.contentLength),
          qualityLabel: raw.qualityLabel,
          approxDurationMs: parseInteger(raw.approxDurationMs),
          width,
          height,
          fps: raw.fps || itagInfo?.fps || 30,
          resolution,
        });
      } else if (mimeType.startsWith('audio/')) {
        audioStreams.push({
          itag,
          url: streamUrl,
          type: 'audio_only',
          mimeType,
          container,
          codecs,
          bitrate: raw.bitrate || 0,
          averageBitrate: raw.averageBitrate,
          contentLength: parseInteger(raw.contentLength),
          approxDurationMs: parseInteger(raw.approxDurationMs),
          audioQuality: raw.audioQuality || 'AUDIO_QUALITY_MEDIUM',
          audioSampleRate: parseInteger(raw.audioSampleRate, 44100),
          audioChannels: raw.audioChannels || 2,
          loudnessDb: raw.loudnessDb,
        });
      }
    }

    // Sort video streams by resolution (descending) and bitrate
    videoStreams.sort((a, b) => {
      const heightA = parseInteger(a.resolution, a.height);
      const heightB = parseInteger(b.resolution, b.height);
      if (heightB !== heightA) return heightB - heightA;
      return (b.bitrate || 0) - (a.bitrate || 0);
    });

    // If no dedicated audio-only streams exist, extract audio options from progressive video_audio streams
    if (audioStreams.length === 0) {
      for (const v of videoStreams) {
        if (v.type === 'video_audio' && v.url) {
          audioStreams.push({
            itag: v.itag,
            url: v.url,
            type: 'audio_only',
            mimeType: v.mimeType,
            container: v.container,
            codecs: v.codecs,
            bitrate: v.bitrate,
            averageBitrate: v.averageBitrate,
            contentLength: v.contentLength,
            approxDurationMs: v.approxDurationMs,
            audioQuality: 'AUDIO_QUALITY_MEDIUM',
            audioSampleRate: 44100,
            audioChannels: 2,
          });
        }
      }
    }

    // Sort audio streams by bitrate (descending)
    audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    return { videoStreams, audioStreams };
  }

  /**
   * Parses captions & subtitle tracks
   */
  private static parseSubtitles(captionsObj: any): SubtitleTrack[] {
    const tracks: SubtitleTrack[] = [];
    const renderer = captionsObj?.playerCaptionsTracklistRenderer;
    const captionTracks = renderer?.captionTracks;
    if (!Array.isArray(captionTracks)) return tracks;

    for (const track of captionTracks) {
      if (!track.baseUrl) continue;
      tracks.push({
        name: track.name?.simpleText || track.name?.runs?.[0]?.text || track.languageCode,
        languageCode: track.languageCode,
        baseUrl: track.baseUrl,
        isTranslatable: Boolean(track.isTranslatable),
        isAutoGenerated: track.kind === 'asr',
      });
    }

    return tracks;
  }

  /**
   * Parses video chapters from nextData
   */
  private static parseChapters(nextData: any): VideoChapter[] {
    const chapters: VideoChapter[] = [];
    if (!nextData) return chapters;

    const panels = nextData.engagementPanels;
    if (!Array.isArray(panels)) return chapters;

    for (const panel of panels) {
      const renderer = panel?.engagementPanelSectionListRenderer;
      if (renderer?.panelIdentifier === 'engagement-panel-macro-markers-description-chapters') {
        const contents = renderer.content?.macroMarkersListRenderer?.contents;
        if (Array.isArray(contents)) {
          for (const item of contents) {
            const marker = item.macroMarkersListItemRenderer;
            if (!marker) continue;
            const title = getText(marker.title);
            const timeText = getText(marker.timeDescription);
            const startTimeSeconds = parseDurationToSeconds(timeText);
            const thumb = marker.thumbnail?.thumbnails?.[0]?.url;

            chapters.push({
              title,
              startTimeSeconds,
              thumbnailUrl: thumb,
            });
          }
        }
      }
    }

    return chapters;
  }

  /**
   * Parses related videos from nextData
   */
  private static parseRelatedVideos(nextData: any): RelatedVideoItem[] {
    const items: RelatedVideoItem[] = [];
    if (!nextData) return items;

    const contents = nextData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
    if (!Array.isArray(contents)) return items;

    for (const item of contents) {
      const renderer = item.compactVideoRenderer;
      if (!renderer || !renderer.videoId) continue;

      items.push({
        id: renderer.videoId,
        title: getText(renderer.title),
        duration: getText(renderer.lengthText),
        viewCountText: getText(renderer.viewCountText),
        uploaderName: getText(renderer.shortBylineText || renderer.longBylineText),
        uploaderUrl: `https://www.youtube.com/channel/${renderer.channelId || ''}`,
        thumbnails: parseThumbnails(renderer.thumbnail),
      });
    }

    return items;
  }
}
