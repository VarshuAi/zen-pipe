/**
 * ZenTube SoundCloud Extractor
 * Extracts tracks, stream URLs, playlists, and search results from SoundCloud
 * Inspired by NewPipe's SoundCloud Service
 */

import { SoundCloudClient } from './client.ts';
import type { StreamInfo, AudioStream, SearchResult, SearchTrackItem, PlaylistInfo, SearchVideoItem } from '../../types.ts';

export class SoundCloudExtractor {
  /**
   * Extracts playable audio stream & metadata from a SoundCloud track URL
   */
  public static async extractTrack(trackUrl: string): Promise<StreamInfo> {
    const data = await SoundCloudClient.resolveUrl(trackUrl);
    if (!data || data.kind !== 'track') {
      throw new Error(`Invalid SoundCloud track URL or could not resolve: "${trackUrl}"`);
    }

    const streamUrl = await SoundCloudClient.resolveStreamUrl(data.media?.transcodings || []);
    const duration = Math.floor((data.duration || 0) / 1000);

    const audioStreams: AudioStream[] = [];
    if (streamUrl) {
      audioStreams.push({
        itag: 999, // Custom itag for SoundCloud
        url: streamUrl,
        type: 'audio_only',
        mimeType: 'audio/mpeg',
        container: 'mp3',
        codecs: 'mp3',
        bitrate: 128000,
        audioQuality: 'HIGH',
        audioSampleRate: 44100,
        audioChannels: 2,
      });
    }

    const artwork = data.artwork_url ? data.artwork_url.replace('-large', '-t500x500') : (data.user?.avatar_url || '');

    return {
      platform: 'soundcloud',
      id: String(data.id),
      url: data.permalink_url || trackUrl,
      title: data.title || '',
      description: data.description || '',
      duration,
      viewCount: data.playback_count || 0,
      uploadDate: data.created_at,
      isLive: false,
      uploader: {
        id: String(data.user?.id || ''),
        name: data.user?.username || 'Unknown Artist',
        url: data.user?.permalink_url || '',
        avatarUrl: data.user?.avatar_url,
        verified: Boolean(data.user?.verified),
      },
      thumbnails: [
        {
          url: artwork,
          width: 500,
          height: 500,
        },
      ],
      videoStreams: [],
      audioStreams,
      subtitles: [],
      chapters: [],
      relatedVideos: [],
    };
  }

  /**
   * Extracts SoundCloud playlist / set
   */
  public static async extractPlaylist(playlistUrl: string): Promise<PlaylistInfo> {
    const data = await SoundCloudClient.resolveUrl(playlistUrl);
    if (!data || (data.kind !== 'playlist' && data.kind !== 'system-playlist')) {
      throw new Error(`Invalid SoundCloud playlist URL: "${playlistUrl}"`);
    }

    const tracks: SearchVideoItem[] = (data.tracks || []).map((t: any) => ({
      type: 'video',
      platform: 'soundcloud' as const,
      id: String(t.id),
      title: t.title || '',
      durationText: `${Math.floor((t.duration || 0) / 60000)}:${Math.floor(((t.duration || 0) % 60000) / 1000).toString().padStart(2, '0')}`,
      uploader: {
        name: t.user?.username || '',
        id: String(t.user?.id || ''),
        avatarUrl: t.user?.avatar_url,
        verified: Boolean(t.user?.verified),
      },
      thumbnails: [
        {
          url: t.artwork_url ? t.artwork_url.replace('-large', '-t500x500') : (t.user?.avatar_url || ''),
          width: 500,
          height: 500,
        },
      ],
    }));

    const artwork = data.artwork_url ? data.artwork_url.replace('-large', '-t500x500') : '';

    return {
      platform: 'soundcloud',
      id: String(data.id),
      title: data.title || '',
      description: data.description || '',
      uploaderName: data.user?.username || '',
      videoCount: data.track_count || tracks.length,
      thumbnails: artwork ? [{ url: artwork, width: 500, height: 500 }] : [],
      videos: tracks,
    };
  }

  /**
   * Searches SoundCloud tracks
   */
  public static async search(query: string): Promise<SearchResult> {
    const data = await SoundCloudClient.searchTracks(query);
    const collection = data.collection || [];

    const items: SearchTrackItem[] = collection.map((t: any) => ({
      type: 'track' as const,
      platform: 'soundcloud' as const,
      id: String(t.id),
      title: t.title || '',
      artist: t.user?.username || '',
      durationText: `${Math.floor((t.duration || 0) / 60000)}:${Math.floor(((t.duration || 0) % 60000) / 1000).toString().padStart(2, '0')}`,
      streamUrl: t.permalink_url,
      thumbnails: [
        {
          url: t.artwork_url ? t.artwork_url.replace('-large', '-t500x500') : (t.user?.avatar_url || ''),
          width: 500,
          height: 500,
        },
      ],
    }));

    return {
      query,
      platform: 'soundcloud',
      items,
      continuationToken: data.next_href,
    };
  }
}
