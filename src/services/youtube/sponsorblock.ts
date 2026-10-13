/**
 * ZenTube SponsorBlock Integration
 * Automatically retrieves community-submitted sponsor segments, intros, outros, and promotions
 * Powered by the official SponsorBlock API (https://sponsor.ajay.app)
 */

import { extractVideoId } from '../../utils/helper.ts';
import type { SponsorSegment } from '../../types.ts';

export const SPONSOR_CATEGORY_COLORS: Record<string, string> = {
  sponsor: '#00d486',
  intro: '#00ffff',
  outro: '#3b82f6',
  interaction: '#ec4899',
  selfpromo: '#eab308',
  music_offtopic: '#f97316',
};

export class SponsorBlockClient {
  private static readonly API_ENDPOINT = 'https://sponsor.ajay.app/api/skipSegments';

  public static readonly DEFAULT_CATEGORIES = [
    'sponsor',
    'intro',
    'outro',
    'interaction',
    'selfpromo',
  ];

  /**
   * Fetches sponsor segments for a YouTube video
   */
  public static async getSegments(
    videoIdOrUrl: string,
    categories: string[] = this.DEFAULT_CATEGORIES
  ): Promise<SponsorSegment[]> {
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube video ID or URL: "${videoIdOrUrl}"`);
    }

    const encodedCategories = encodeURIComponent(JSON.stringify(categories));
    const url = `${this.API_ENDPOINT}?videoID=${encodeURIComponent(videoId)}&categories=${encodedCategories}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ZenTube/1.0 (https://github.com/zentube/zentube)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      // 404 indicates no segments found for this video
      if (res.status === 404) {
        return [];
      }

      if (!res.ok) {
        throw new Error(`SponsorBlock API HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((item: any) => {
        const start = Array.isArray(item.segment) ? item.segment[0] : 0;
        const end = Array.isArray(item.segment) ? item.segment[1] : 0;
        const category = item.category || 'sponsor';

        return {
          category,
          actionType: item.actionType || 'skip',
          startTime: Math.round(start * 100) / 100,
          endTime: Math.round(end * 100) / 100,
          duration: Math.round((end - start) * 100) / 100,
          uuid: item.UUID || '',
          votes: item.votes || 0,
          color: SPONSOR_CATEGORY_COLORS[category] || '#00d486',
        };
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
