/**
 * ZenTube Downloader & HTTP Client
 * Handles request spoofing, consent cookies, headers, and visitorData caching
 * Inspired by NewPipe's Downloader & YoutubeParsingHelper
 */

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  body?: any;
  timeoutMs?: number;
}

export class HttpClient {
  private static visitorDataCache: string | null = null;
  private static visitorDataExpiry: number = 0;

  // Default consent cookie to prevent consent redirects
  private static readonly CONSENT_COOKIE = 'SOCS=CAESEwgDEgk2OTc3NjExMDUaAmVuIAEaBgiA_K-0Bg; CONSENT=PENDING+999';

  /**
   * Performs an HTTP POST request with JSON payload
   */
  public static async postJson<T = any>(
    url: string,
    body: any,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cookie': this.CONSENT_COOKIE,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} from ${url}: ${errorText.slice(0, 300)}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Performs an HTTP GET request
   */
  public static async get(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<string> {
    const isGoogle = url.includes('youtube.com') || url.includes('google.com') || url.includes('googlevideo.com');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      ...(isGoogle ? { 'Cookie': this.CONSENT_COOKIE } : {}),
      ...options.headers,
    };

    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }

        return await response.text();
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(res => setTimeout(res, 800));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }

  /**
   * Retrieves or refreshes YouTube visitorData token
   */
  public static async getVisitorData(): Promise<string> {
    const now = Date.now();
    if (this.visitorDataCache && now < this.visitorDataExpiry) {
      return this.visitorDataCache;
    }

    try {
      const res = await this.postJson<{ responseContext?: { visitorData?: string } }>(
        'https://www.youtube.com/youtubei/v1/visitor_id?prettyPrint=false',
        {
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20260805.01.00',
              hl: 'en',
              gl: 'US',
            },
          },
        },
        {
          headers: {
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': '2.20260805.01.00',
          },
        }
      );

      const visitorData = res.responseContext?.visitorData;
      if (visitorData) {
        this.visitorDataCache = visitorData;
        this.visitorDataExpiry = now + 1000 * 60 * 60 * 12; // Cache for 12 hours
        return visitorData;
      }
    } catch (err) {
      // Fallback default visitor token if fetch fails
    }

    // Default fallback visitor token
    return 'CgtSQmxzMHAtOXJBUSjLm-vUBjIKCgJJThIEGgAgLw%3D%3D';
  }
}
