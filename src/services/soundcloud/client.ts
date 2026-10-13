/**
 * ZenTube SoundCloud Client & Dynamic Client-ID Scraper
 * Automatically discovers active client_id from SoundCloud frontend bundles
 * Inspired by NewPipe's SoundCloud service
 */

import { HttpClient } from '../../core/http.ts';

export class SoundCloudClient {
  private static cachedClientId: string | null = null;
  private static clientIdExpiry: number = 0;

  private static readonly API_BASE = 'https://api-v2.soundcloud.com';

  /**
   * Retrieves active SoundCloud client_id (cached or scraped)
   */
  public static async getClientId(): Promise<string> {
    const now = Date.now();
    if (this.cachedClientId && now < this.clientIdExpiry) {
      return this.cachedClientId;
    }

    try {
      const html = await HttpClient.get('https://soundcloud.com');
      const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(m => m[1]);

      for (const url of scriptUrls.slice(-8)) {
        try {
          const js = await HttpClient.get(url);
          const match = js.match(/client_id[:=]"([a-zA-Z0-9]{32})"/);
          if (match) {
            this.cachedClientId = match[1];
            this.clientIdExpiry = now + 1000 * 60 * 60 * 24; // 24 hours
            return this.cachedClientId;
          }
        } catch {}
      }
    } catch {}

    // Fallback known client_id if scraping fails
    return 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo';
  }

  /**
   * Resolves any SoundCloud URL (track, playlist, user) to API object
   */
  public static async resolveUrl(url: string): Promise<any> {
    const clientId = await this.getClientId();
    const endpoint = `${this.API_BASE}/resolve?url=${encodeURIComponent(url)}&client_id=${clientId}`;
    return HttpClient.postJson(endpoint, {}, { headers: { 'Accept': 'application/json' } }).catch(async () => {
      const text = await HttpClient.get(endpoint);
      return JSON.parse(text);
    });
  }

  /**
   * Searches SoundCloud for tracks
   */
  public static async searchTracks(query: string, limit = 20): Promise<any> {
    const clientId = await this.getClientId();
    const endpoint = `${this.API_BASE}/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}`;
    const text = await HttpClient.get(endpoint);
    return JSON.parse(text);
  }

  /**
   * Resolves a progressive or HLS audio stream URL for a track
   */
  public static async resolveStreamUrl(transcodings: any[]): Promise<string> {
    const clientId = await this.getClientId();
    if (!Array.isArray(transcodings) || transcodings.length === 0) {
      return '';
    }

    // Prefer progressive mp3, then hls
    const progressive = transcodings.find(t => t.format?.protocol === 'progressive');
    const target = progressive || transcodings[0];

    if (target && target.url) {
      const streamInfoUrl = `${target.url}?client_id=${clientId}`;
      const resText = await HttpClient.get(streamInfoUrl);
      const resJson = JSON.parse(resText);
      return resJson.url || '';
    }

    return '';
  }
}
