/**
 * ZenTube media.ccc.de (Chaos Computer Club) Extractor
 * Extracts conferences, events, recordings, and direct CDN media streams
 * Inspired by NewPipe's MediaCCCHelper.java and MediaCCCService.java
 */

import { formatDuration } from '../../utils/helper.ts';
import type {
  MediaCCCEvent,
  MediaCCCRecording,
  MediaCCCConference,
  StreamInfo,
  VideoStream,
  AudioStream,
  SearchResult,
  SearchVideoItem,
} from '../../types.ts';

export class MediaCCCExtractor {
  private static readonly BASE_API = 'https://api.media.ccc.de/public';
  private static readonly USER_AGENT = 'ZenTube/1.0 (https://github.com/zentube/zentube)';

  /**
   * Parses an event slug or ID from a media.ccc.de URL
   */
  public static parseSlugOrId(url: string): string {
    if (!url.startsWith('http')) return url;
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      // Format /v/:slug
      if (parts[0] === 'v' && parts[1]) {
        return parts[1];
      }
      // Format /public/events/:slugOrId
      const evIdx = parts.indexOf('events');
      if (evIdx !== -1 && parts[evIdx + 1]) {
        return parts[evIdx + 1];
      }
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  /**
   * Fetches full event details and recordings from media.ccc.de
   */
  public static async getEvent(idOrSlugOrUrl: string): Promise<MediaCCCEvent> {
    const slug = this.parseSlugOrId(idOrSlugOrUrl);
    const res = await fetch(`${this.BASE_API}/events/${encodeURIComponent(slug)}`, {
      headers: { 'User-Agent': this.USER_AGENT, 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`MediaCCC event fetch failed: HTTP ${res.status} for "${slug}"`);
    }

    const data = await res.json();

    const recordings: MediaCCCRecording[] = (data.recordings || []).map((r: any) => ({
      id: r.id,
      mimeType: r.mime_type || 'video/mp4',
      folder: r.folder,
      language: r.language,
      quality: r.high_quality ? 'HD' : 'SD',
      resolution: r.label || (r.height ? `${r.height}p` : undefined),
      url: r.url,
      streamUrl: r.recording_url,
      filename: r.filename,
      sizeMb: r.size,
      lengthSeconds: r.length,
      highQuality: r.high_quality,
    }));

    return {
      id: data.id || data.guid,
      guid: data.guid,
      title: data.title || 'Untitled Event',
      subtitle: data.subtitle,
      slug: data.slug,
      conferenceSlug: data.conference_slug,
      conferenceTitle: data.conference_title,
      description: data.description || '',
      date: data.date,
      releaseDate: data.release_date,
      duration: data.length || 0,
      viewCount: data.view_count || 0,
      persons: Array.isArray(data.persons) ? data.persons : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      thumbnailUrl: data.thumb_url || data.poster_url || '',
      posterUrl: data.poster_url,
      timelineUrl: data.timeline_url,
      slidesUrl: data.slides_url,
      url: data.frontend_link || `https://media.ccc.de/v/${data.slug}`,
      recordings,
    };
  }

  /**
   * Adapts a MediaCCCEvent into the unified ZenTube StreamInfo model
   */
  public static toStreamInfo(event: MediaCCCEvent): StreamInfo {
    const videoStreams: VideoStream[] = event.recordings
      .filter((r) => r.mimeType.startsWith('video/'))
      .map((r, idx) => {
        const height = r.resolution ? parseInt(r.resolution.replace(/[^0-9]/g, ''), 10) || 720 : 720;
        return {
          itag: 2000 + idx,
          url: r.streamUrl,
          mimeType: r.mimeType,
          container: r.mimeType.includes('webm') ? 'webm' : 'mp4',
          codecs: r.mimeType.includes('webm') ? 'vp9, opus' : 'avc1, mp4a',
          bitrate: r.sizeMb && event.duration > 0 ? Math.round((r.sizeMb * 1024 * 1024 * 8) / event.duration) : 2000000,
          contentLength: r.sizeMb ? r.sizeMb * 1024 * 1024 : undefined,
          qualityLabel: r.resolution || `${height}p`,
          type: 'video_audio',
          width: 0,
          height,
          fps: 30,
          resolution: r.resolution || `${height}p`,
        };
      });

    const audioStreams: AudioStream[] = event.recordings
      .filter((r) => r.mimeType.startsWith('audio/'))
      .map((r, idx) => ({
        itag: 2100 + idx,
        url: r.streamUrl,
        mimeType: r.mimeType,
        container: r.mimeType.includes('opus') ? 'webm' : 'mp3',
        codecs: r.mimeType.includes('opus') ? 'opus' : 'mp3',
        bitrate: 128000,
        audioQuality: r.highQuality ? 'HIGH' : 'MEDIUM',
        audioSampleRate: 44100,
        audioChannels: 2,
        type: 'audio_only',
      }));

    return {
      platform: 'mediaccc',
      id: event.slug,
      url: event.url,
      title: event.title,
      description: event.description,
      duration: event.duration,
      viewCount: event.viewCount || 0,
      uploadDate: event.releaseDate || event.date,
      isLive: false,
      uploader: {
        id: event.conferenceSlug || 'ccc',
        name: event.conferenceTitle || event.persons.join(', ') || 'Chaos Computer Club',
        url: `https://media.ccc.de/c/${event.conferenceSlug || ''}`,
        verified: true,
      },
      thumbnails: event.thumbnailUrl ? [{ url: event.thumbnailUrl, width: 640, height: 360 }] : [],
      videoStreams,
      audioStreams,
      subtitles: [],
      chapters: [],
      relatedVideos: [],
    };
  }

  /**
   * Retrieves all available conferences from media.ccc.de
   */
  public static async getConferences(): Promise<MediaCCCConference[]> {
    const res = await fetch(`${this.BASE_API}/conferences`, {
      headers: { 'User-Agent': this.USER_AGENT, 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`MediaCCC conferences fetch failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    return (data.conferences || []).map((c: any) => ({
      acronym: c.acronym,
      title: c.title,
      url: c.url,
      logoUrl: c.logo_url,
      aspectRatio: c.aspect_ratio,
      updatedAt: c.updated_at,
      eventsCount: c.event_count,
    }));
  }

  /**
   * Searches media.ccc.de for events
   */
  public static async search(query: string): Promise<SearchResult> {
    const res = await fetch(`${this.BASE_API}/events/search?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': this.USER_AGENT, 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`MediaCCC search failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const items: SearchVideoItem[] = (data.events || []).map((e: any) => ({
      type: 'video',
      platform: 'mediaccc',
      id: e.slug || e.guid,
      title: e.title || '',
      descriptionSnippet: e.description?.slice(0, 150) || e.subtitle || '',
      durationText: formatDuration(e.length || 0),
      viewCountText: e.view_count ? `${e.view_count.toLocaleString()} views` : '',
      publishedTimeText: e.release_date || e.date || '',
      uploader: {
        name: e.conference_title || (Array.isArray(e.persons) ? e.persons.join(', ') : 'MediaCCC'),
        id: e.conference_slug,
        verified: true,
      },
      thumbnails: e.thumb_url ? [{ url: e.thumb_url, width: 320, height: 180 }] : [],
    }));

    return {
      query,
      platform: 'mediaccc',
      items,
    };
  }
}
