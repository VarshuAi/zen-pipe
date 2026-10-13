/**
 * ZenTube PeerTube API Client
 * Facilitates communicating with federated PeerTube instances
 * Inspired by NewPipe's PeertubeService.java
 */

export interface PeerTubeRequestOptions {
  instance?: string;
  timeoutMs?: number;
}

export class PeerTubeClient {
  public static readonly DEFAULT_INSTANCE = 'peertube.tv';
  public static readonly GLOBAL_SEARCH_INSTANCE = 'search.joinpeertube.org';

  /**
   * Normalizes an instance hostname (strips protocol and trailing slash)
   */
  public static normalizeInstance(instance?: string): string {
    if (!instance) return this.DEFAULT_INSTANCE;
    return instance
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
  }

  /**
   * Extracts instance host and video ID/UUID from a PeerTube URL
   */
  public static parseVideoUrl(url: string): { instance: string; videoId: string } | null {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const instance = parsed.host;
      const pathname = parsed.pathname;

      // Matches /w/:id, /w/:uuid, /videos/watch/:id, /videos/watch/:uuid
      const wMatch = pathname.match(/\/w\/([a-zA-Z0-9_-]+)/);
      if (wMatch) return { instance, videoId: wMatch[1] };

      const watchMatch = pathname.match(/\/videos\/watch\/([a-zA-Z0-9_-]+)/);
      if (watchMatch) return { instance, videoId: watchMatch[1] };

      const apiMatch = pathname.match(/\/api\/v1\/videos\/([a-zA-Z0-9_-]+)/);
      if (apiMatch) return { instance, videoId: apiMatch[1] };

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Performs an API GET against the specified PeerTube instance
   */
  public static async get<T = any>(
    endpoint: string,
    options: PeerTubeRequestOptions = {}
  ): Promise<T> {
    const instance = this.normalizeInstance(options.instance);
    const url = endpoint.startsWith('http') ? endpoint : `https://${instance}/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ZenTube/1.0 (https://github.com/zentube/zentube)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`PeerTube HTTP ${res.status} from ${url}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
