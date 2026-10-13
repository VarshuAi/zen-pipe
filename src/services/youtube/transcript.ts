/**
 * ZenTube YouTube Transcript & Subtitle Extractor
 * Extracts timestamped transcripts and converts captions to SRT, VTT, and plain text
 * Inspired by NewPipe's Subtitles / Captions handling
 */

import { HttpClient } from '../../core/http.ts';
import { StreamExtractor } from '../../extractors/stream.ts';
import { extractVideoId, formatDuration } from '../../utils/helper.ts';
import type { TranscriptSegment, SubtitleTrack } from '../../types.ts';

export class TranscriptExtractor {
  /**
   * Retrieves full timestamped transcript segments for a video
   */
  public static async getTranscript(videoIdOrUrl: string, languageCode = 'en'): Promise<TranscriptSegment[]> {
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error(`Invalid video ID or URL: "${videoIdOrUrl}"`);
    }

    // Extract stream info to get available subtitle tracks
    const stream = await StreamExtractor.extract(videoId);
    if (!stream.subtitles || stream.subtitles.length === 0) {
      return [];
    }

    // Find best matching subtitle track
    const track =
      stream.subtitles.find(s => s.languageCode === languageCode) ||
      stream.subtitles.find(s => s.languageCode.startsWith(languageCode.split('-')[0])) ||
      stream.subtitles[0];

    if (!track || !track.baseUrl) {
      return [];
    }

    // Fetch JSON3 timed text format
    const url = track.baseUrl.includes('fmt=') ? track.baseUrl : `${track.baseUrl}&fmt=json3`;
    const res = await HttpClient.get(url);
    const json = JSON.parse(res);

    const segments: TranscriptSegment[] = [];
    const events = json.events || [];

    for (const ev of events) {
      if (!ev.segs) continue;
      const text = ev.segs.map((s: any) => s.utf8 || '').join('').trim();
      if (!text || text === '\n') continue;

      const startMs = ev.tStartMs || 0;
      const durationMs = ev.dDurationMs || 0;
      const timeFormatted = formatDuration(Math.floor(startMs / 1000));

      segments.push({
        startMs,
        durationMs,
        timeFormatted,
        text,
      });
    }

    return segments;
  }

  /**
   * Downloads and converts captions to SRT, VTT, or plain text
   */
  public static async convertSubtitles(
    subtitleTrackUrl: string,
    format: 'vtt' | 'srt' | 'text' | 'json' = 'vtt'
  ): Promise<string> {
    if (format === 'vtt') {
      const url = subtitleTrackUrl.includes('fmt=') ? subtitleTrackUrl : `${subtitleTrackUrl}&fmt=vtt`;
      return HttpClient.get(url);
    }

    // Fetch json3 for SRT/Text conversion
    const url = subtitleTrackUrl.includes('fmt=') ? subtitleTrackUrl : `${subtitleTrackUrl}&fmt=json3`;
    const res = await HttpClient.get(url);
    const json = JSON.parse(res);

    if (format === 'json') {
      return JSON.stringify(json, null, 2);
    }

    const events = (json.events || []).filter((e: any) => e.segs);

    if (format === 'text') {
      return events
        .map((e: any) => e.segs.map((s: any) => s.utf8 || '').join('').trim())
        .filter(Boolean)
        .join('\n');
    }

    if (format === 'srt') {
      let srt = '';
      let index = 1;

      for (const ev of events) {
        const text = ev.segs.map((s: any) => s.utf8 || '').join('').trim();
        if (!text) continue;

        const startMs = ev.tStartMs || 0;
        const endMs = startMs + (ev.dDurationMs || 0);

        srt += `${index++}\n`;
        srt += `${this.formatSrtTime(startMs)} --> ${this.formatSrtTime(endMs)}\n`;
        srt += `${text}\n\n`;
      }
      return srt;
    }

    return '';
  }

  private static formatSrtTime(ms: number): string {
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
  }
}
