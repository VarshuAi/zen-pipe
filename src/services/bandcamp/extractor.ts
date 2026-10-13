/**
 * ZenTube Bandcamp Extractor
 * Extracts albums, tracks, lyrics, artwork, and direct MP3 streaming URLs from Bandcamp
 * Inspired by NewPipe's Bandcamp Service
 */

import { HttpClient } from '../../core/http.ts';
import type { StreamInfo, AudioStream, BandcampAlbum, BandcampTrack } from '../../types.ts';

export class BandcampExtractor {
  /**
   * Extracts album or track from a Bandcamp URL
   */
  public static async extract(url: string): Promise<StreamInfo> {
    const html = await HttpClient.get(url);

    // Extract TralbumData
    const tralbumMatch = html.match(/data-tralbum="([^"]+)"/);
    if (!tralbumMatch) {
      throw new Error(`Could not parse Bandcamp data from: "${url}"`);
    }

    const rawJson = tralbumMatch[1].replace(/&quot;/g, '"');
    const tralbum = JSON.parse(rawJson);

    const isAlbum = tralbum.item_type === 'album';
    const current = tralbum.current || {};
    const trackInfo = tralbum.trackinfo || [];

    // Extract primary track
    const firstTrack = trackInfo[0] || {};
    const streamUrl = firstTrack.file?.['mp3-128'] || current.file?.['mp3-128'] || '';

    // Artwork
    const artId = tralbum.art_id || current.art_id;
    const artworkUrl = artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : '';

    const artist = tralbum.artist || current.artist || 'Unknown Artist';
    const title = current.title || tralbum.current?.title || firstTrack.title || 'Bandcamp Track';
    const duration = Math.floor(firstTrack.duration || current.duration || 0);

    const audioStreams: AudioStream[] = [];
    if (streamUrl) {
      audioStreams.push({
        itag: 888, // Custom itag for Bandcamp MP3
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

    return {
      platform: 'bandcamp',
      id: String(current.id || tralbum.id),
      url,
      title: isAlbum ? `${title} (Album)` : title,
      description: current.about || tralbum.about || '',
      duration,
      viewCount: 0,
      uploadDate: current.release_date || tralbum.album_release_date,
      isLive: false,
      uploader: {
        id: artist,
        name: artist,
        url: url.split('.bandcamp.com')[0] + '.bandcamp.com',
        verified: false,
      },
      thumbnails: artworkUrl ? [{ url: artworkUrl, width: 700, height: 700 }] : [],
      videoStreams: [],
      audioStreams,
      subtitles: [],
      chapters: [],
      relatedVideos: trackInfo.slice(1, 10).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        duration: `${Math.floor(t.duration / 60)}:${Math.floor(t.duration % 60).toString().padStart(2, '0')}`,
        uploaderName: artist,
        thumbnails: artworkUrl ? [{ url: artworkUrl, width: 120, height: 120 }] : [],
      })),
    };
  }

  /**
   * Extracts a full Bandcamp album with all individual track streams
   */
  public static async extractAlbum(url: string): Promise<BandcampAlbum> {
    const html = await HttpClient.get(url);

    const tralbumMatch = html.match(/data-tralbum="([^"]+)"/);
    if (!tralbumMatch) {
      throw new Error(`Could not parse Bandcamp album data from: "${url}"`);
    }

    const rawJson = tralbumMatch[1].replace(/&quot;/g, '"');
    const tralbum = JSON.parse(rawJson);

    const artId = tralbum.art_id || tralbum.current?.art_id;
    const artworkUrl = artId ? `https://f4.bcbits.com/img/a${artId}_10.jpg` : '';
    const artist = tralbum.artist || 'Unknown Artist';

    const tracks: BandcampTrack[] = (tralbum.trackinfo || []).map((t: any) => ({
      id: String(t.id),
      title: t.title || '',
      trackNum: t.track_num,
      duration: Math.floor(t.duration || 0),
      streamUrl: t.file?.['mp3-128'] || '',
      artist,
      albumTitle: tralbum.current?.title || '',
      lyrics: t.lyrics,
      artworkUrl,
    }));

    return {
      id: String(tralbum.id || tralbum.current?.id),
      url,
      title: tralbum.current?.title || 'Bandcamp Album',
      artist,
      artistUrl: url.split('.bandcamp.com')[0] + '.bandcamp.com',
      releaseDate: tralbum.current?.release_date || tralbum.album_release_date,
      artworkUrl,
      tracks,
    };
  }
}
