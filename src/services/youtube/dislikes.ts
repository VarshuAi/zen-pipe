/**
 * ZenTube Return YouTube Dislike (RYD) Integration
 * Restores public dislike counts and ratings via returnyoutubedislikeapi.com
 */

import { extractVideoId } from '../../utils/helper.ts';
import type { DislikeInfo } from '../../types.ts';

export class DislikeClient {
  private static readonly API_ENDPOINT = 'https://returnyoutubedislikeapi.com/votes';

  /**
   * Fetches estimated dislikes and rating metrics for a video
   */
  public static async getDislikes(videoIdOrUrl: string): Promise<DislikeInfo> {
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube video ID or URL: "${videoIdOrUrl}"`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${this.API_ENDPOINT}?videoId=${encodeURIComponent(videoId)}`, {
        headers: {
          'User-Agent': 'ZenTube/1.0 (https://github.com/zentube/zentube)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Return YouTube Dislike API HTTP ${res.status}`);
      }

      const data = await res.json();
      const likes = data.likes || 0;
      const dislikes = data.dislikes || 0;
      const total = likes + dislikes;

      const likePercentage = total > 0 ? Math.round((likes / total) * 1000) / 10 : 100;
      const dislikePercentage = total > 0 ? Math.round((dislikes / total) * 1000) / 10 : 0;

      return {
        id: data.id || videoId,
        likes,
        dislikes,
        rating: Math.round((data.rating || 5.0) * 100) / 100,
        viewCount: data.viewCount || 0,
        likePercentage,
        dislikePercentage,
      };
    } catch {
      // Fallback response if API is unreachable
      return {
        id: videoId,
        likes: 0,
        dislikes: 0,
        rating: 5.0,
        viewCount: 0,
        likePercentage: 100,
        dislikePercentage: 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
