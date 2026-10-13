/**
 * ZenTube Extractor
 * Multi-Platform Streaming Media & Metadata Extraction Engine
 * Full NewPipe Extractor Parity: YouTube, SoundCloud, Bandcamp, PeerTube, MediaCCC
 */

import { StreamExtractor } from './extractors/stream.ts';
import { SearchExtractor } from './extractors/search.ts';
import { ChannelExtractor } from './extractors/channel.ts';
import { PlaylistExtractor } from './extractors/playlist.ts';
import { CommentsExtractor } from './extractors/comments.ts';
import { TranscriptExtractor } from './services/youtube/transcript.ts';
import { ShortsExtractor } from './services/youtube/shorts.ts';
import { RelatedStreamsExtractor } from './services/youtube/related.ts';
import { ChannelFeedExtractor } from './services/youtube/feed.ts';
import { TrendingExtractor, type TrendingCategory } from './extractors/trending.ts';
import { SoundCloudExtractor } from './services/soundcloud/extractor.ts';
import { BandcampExtractor } from './services/bandcamp/extractor.ts';
import { PeerTubeExtractor } from './services/peertube/extractor.ts';
import { PeerTubeClient } from './services/peertube/client.ts';
import { MediaCCCExtractor } from './services/mediaccc/extractor.ts';
import { UniversalRouter } from './core/router.ts';
import { StreamDownloader, type DownloadSelection } from './core/downloader.ts';
import { StreamMuxer } from './core/muxer.ts';
import { SubscriptionManager } from './core/subscriptions.ts';
import { SponsorBlockClient } from './services/youtube/sponsorblock.ts';
import { DislikeClient } from './services/youtube/dislikes.ts';
import { MirrorManager, type MirrorInstance } from './core/mirrors.ts';
import type { SearchFilter, DownloadProgress, SubscriptionItem, StreamInfo } from './types.ts';

export type * from './types.ts';
export * from './core/itags.ts';
export * from './core/http.ts';
export * from './core/clients.ts';
export * from './core/cipher.ts';
export * from './core/downloader.ts';
export * from './core/muxer.ts';
export * from './core/subscriptions.ts';
export * from './core/router.ts';
export * from './core/mirrors.ts';
export * from './utils/helper.ts';
export * from './utils/parser.ts';

// Service Class Exports
export { StreamExtractor } from './extractors/stream.ts';
export { SearchExtractor } from './extractors/search.ts';
export { ChannelExtractor } from './extractors/channel.ts';
export { PlaylistExtractor } from './extractors/playlist.ts';
export { CommentsExtractor } from './extractors/comments.ts';
export { TranscriptExtractor } from './services/youtube/transcript.ts';
export { ShortsExtractor } from './services/youtube/shorts.ts';
export { RelatedStreamsExtractor } from './services/youtube/related.ts';
export { ChannelFeedExtractor } from './services/youtube/feed.ts';
export { TrendingExtractor } from './extractors/trending.ts';
export { SoundCloudExtractor } from './services/soundcloud/extractor.ts';
export { BandcampExtractor } from './services/bandcamp/extractor.ts';
export { PeerTubeExtractor } from './services/peertube/extractor.ts';
export { PeerTubeClient } from './services/peertube/client.ts';
export { MediaCCCExtractor } from './services/mediaccc/extractor.ts';
export { SubscriptionManager } from './core/subscriptions.ts';
export { StreamMuxer } from './core/muxer.ts';
export { SponsorBlockClient } from './services/youtube/sponsorblock.ts';
export { DislikeClient } from './services/youtube/dislikes.ts';
export { MirrorManager } from './core/mirrors.ts';

/**
 * ZenTube Main Multi-Platform Facade
 */
export class ZenTube {
  /**
   * Universal extractor: Automatically detects platform (YouTube, SoundCloud, Bandcamp, PeerTube, MediaCCC) from URL
   */
  public static async extract(urlOrId: string) {
    return UniversalRouter.extract(urlOrId);
  }

  // --- YOUTUBE SERVICE ---

  /**
   * Extracts playable video/audio streams and rich metadata for a YouTube video
   */
  public static async getStream(videoIdOrUrl: string) {
    const stream = await StreamExtractor.extract(videoIdOrUrl);
    stream.platform = 'youtube';
    return stream;
  }

  /**
   * Extracts stream with automated fallback to healthy Invidious & Piped mirrors if direct requests fail
   */
  public static async getStreamWithFallback(videoIdOrUrl: string) {
    return MirrorManager.extractWithFallback(videoIdOrUrl);
  }

  /**
   * Searches YouTube for videos, channels, or playlists
   */
  public static async search(query: string, filter?: SearchFilter, continuationToken?: string) {
    return SearchExtractor.search(query, filter, continuationToken);
  }

  /**
   * Retrieves search suggestions for auto-complete
   */
  public static async getSuggestions(query: string) {
    return SearchExtractor.getSuggestions(query);
  }

  /**
   * Extracts channel information, tabs, and recent uploads
   */
  public static async getChannel(channelIdOrHandle: string) {
    return ChannelExtractor.extract(channelIdOrHandle);
  }

  /**
   * Extracts playlist information and video items
   */
  public static async getPlaylist(playlistIdOrUrl: string, continuationToken?: string) {
    return PlaylistExtractor.extract(playlistIdOrUrl, continuationToken);
  }

  /**
   * Extracts comments and replies for a video
   */
  public static async getComments(videoIdOrUrl: string, continuationToken?: string) {
    return CommentsExtractor.getComments(videoIdOrUrl, continuationToken);
  }

  /**
   * Extracts timestamped transcript segments for a video
   */
  public static async getTranscript(videoIdOrUrl: string, languageCode = 'en') {
    return TranscriptExtractor.getTranscript(videoIdOrUrl, languageCode);
  }

  /**
   * Converts subtitles into clean SRT, VTT, or plain text
   */
  public static async convertSubtitles(trackUrl: string, format: 'vtt' | 'srt' | 'text' | 'json' = 'vtt') {
    return TranscriptExtractor.convertSubtitles(trackUrl, format);
  }

  /**
   * Extracts the YouTube Shorts feed
   */
  public static async getShorts(channelOrQueryOrToken?: string, continuationToken?: string) {
    if (channelOrQueryOrToken && !continuationToken && (channelOrQueryOrToken.length > 50 || channelOrQueryOrToken.includes('%'))) {
      return ShortsExtractor.getShortsFeed('@NoCopyrightSounds', channelOrQueryOrToken);
    }
    return ShortsExtractor.getShortsFeed(channelOrQueryOrToken || '@NoCopyrightSounds', continuationToken);
  }

  /**
   * Extracts related and recommended videos for a video
   */
  public static async getRelated(videoIdOrUrl: string) {
    return RelatedStreamsExtractor.getRelated(videoIdOrUrl);
  }

  /**
   * Fetches latest video feed for a YouTube channel via fast RSS Atom
   */
  public static async getFeed(channelIdOrHandle: string) {
    return ChannelFeedExtractor.getFeed(channelIdOrHandle);
  }

  /**
   * Aggregates latest uploads from multiple channels into a single chronological feed
   */
  public static async getAggregatedFeed(channelIdsOrHandles: string[], maxTotal?: number) {
    return ChannelFeedExtractor.aggregate(channelIdsOrHandles, maxTotal);
  }

  /**
   * Extracts trending and popular videos by category and region
   */
  public static async getTrending(category: TrendingCategory = 'all', region = 'US') {
    return TrendingExtractor.extract(category, region);
  }

  /**
   * Fetches community-submitted sponsor, intro, outro segments via SponsorBlock
   */
  public static async getSponsorSegments(videoIdOrUrl: string, categories?: string[]) {
    return SponsorBlockClient.getSegments(videoIdOrUrl, categories);
  }

  /**
   * Fetches estimated dislike counters and ratings via Return YouTube Dislike (RYD)
   */
  public static async getDislikes(videoIdOrUrl: string) {
    return DislikeClient.getDislikes(videoIdOrUrl);
  }

  // --- FALLBACK MIRRORS NAMESPACE ---
  public static readonly mirrors = {
    getMirrors: () => MirrorManager.getMirrors(),
    checkAllMirrors: (timeoutMs?: number) => MirrorManager.checkAllMirrors(timeoutMs),
    getHealthyMirrors: () => MirrorManager.getHealthyMirrors(),
    pingMirror: (mirror: MirrorInstance, timeoutMs?: number) => MirrorManager.pingMirror(mirror, timeoutMs),
    extractFromInvidious: (url: string, id: string) => MirrorManager.extractFromInvidious(url, id),
    extractFromPiped: (url: string, id: string) => MirrorManager.extractFromPiped(url, id),
    extractWithFallback: (videoIdOrUrl: string) => MirrorManager.extractWithFallback(videoIdOrUrl),
  };

  // --- SOUNDCLOUD SERVICE NAMESPACE ---
  public static readonly soundcloud = {
    getTrack: (url: string) => SoundCloudExtractor.extractTrack(url),
    getPlaylist: (url: string) => SoundCloudExtractor.extractPlaylist(url),
    search: (query: string) => SoundCloudExtractor.search(query),
  };

  // --- BANDCAMP SERVICE NAMESPACE ---
  public static readonly bandcamp = {
    getAlbum: (url: string) => BandcampExtractor.extractAlbum(url),
    getTrack: (url: string) => BandcampExtractor.extract(url),
  };

  // --- PEERTUBE SERVICE NAMESPACE ---
  public static readonly peertube = {
    getVideo: (idOrUrl: string, instance?: string) => PeerTubeExtractor.getVideo(idOrUrl, instance),
    toStreamInfo: (video: any) => PeerTubeExtractor.toStreamInfo(video),
    search: (query: string, options?: any) => PeerTubeExtractor.search(query, options),
    getTrending: (options?: any) => PeerTubeExtractor.getTrending(options),
    getComments: (idOrUrl: string, instance?: string) => PeerTubeExtractor.getComments(idOrUrl, instance),
    getChannel: (channelName: string, instance?: string) => PeerTubeExtractor.getChannel(channelName, instance),
  };

  // --- MEDIACCC SERVICE NAMESPACE ---
  public static readonly mediaccc = {
    getEvent: (idOrSlugOrUrl: string) => MediaCCCExtractor.getEvent(idOrSlugOrUrl),
    toStreamInfo: (event: any) => MediaCCCExtractor.toStreamInfo(event),
    getConferences: () => MediaCCCExtractor.getConferences(),
    search: (query: string) => MediaCCCExtractor.search(query),
  };

  // --- SUBSCRIPTIONS & OPML NAMESPACE ---
  public static readonly subscriptions = {
    importOpml: (opmlXml: string) => SubscriptionManager.importOpml(opmlXml),
    exportOpml: (subs: SubscriptionItem[], title?: string) => SubscriptionManager.exportOpml(subs, title),
    importNewPipeJson: (jsonString: string) => SubscriptionManager.importNewPipeJson(jsonString),
    exportNewPipeJson: (subs: SubscriptionItem[]) => SubscriptionManager.exportNewPipeJson(subs),
  };

  // --- DOWNLOADER & MUXER METHODS ---

  /**
   * Selects optimal format from StreamInfo for requested quality
   */
  public static selectFormat(stream: StreamInfo, quality = '720p'): DownloadSelection {
    return StreamDownloader.selectFormat(stream, quality);
  }

  /**
   * Downloads any audio or video stream URL to a local destination file
   */
  public static async download(
    streamUrl: string,
    outputPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ) {
    return StreamDownloader.download(streamUrl, outputPath, onProgress);
  }

  /**
   * Downloads separate adaptive video and audio streams and muxes them into a single container
   */
  public static async downloadAndMux(
    videoUrl: string,
    audioUrl: string,
    outputPath: string,
    onProgress?: (step: string, progress?: DownloadProgress) => void
  ) {
    return StreamMuxer.downloadAndMux(videoUrl, audioUrl, outputPath, onProgress);
  }

  /**
   * High-level media downloader: automatically selects optimal streams,
   * muxes adaptive streams when FFmpeg is available, and saves to output directory.
   */
  public static async downloadMedia(
    stream: StreamInfo,
    options?: {
      quality?: string;
      outputDir?: string;
      onProgress?: (progress: DownloadProgress) => void;
    }
  ) {
    return StreamDownloader.downloadMedia(stream, options);
  }
}

export default ZenTube;
