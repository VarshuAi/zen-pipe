/**
 * ZenTube Trending & Popular Extractor
 * Extracts trending videos across categories (All, Music, Gaming, News, Movies)
 * Supports localized regional feeds (US, IN, GB, DE, JP, BR, etc.)
 * Inspired by NewPipe's Kiosk / Trending service
 */

import { HttpClient } from '../core/http.ts';
import { InnerTubeClient } from '../core/clients.ts';
import { SearchExtractor } from './search.ts';
import { MirrorManager } from '../core/mirrors.ts';
import type { SearchVideoItem } from '../types.ts';

export type TrendingCategory = 'all' | 'music' | 'gaming' | 'news' | 'movies';

export class TrendingExtractor {
  private static readonly CATEGORY_QUERIES: Record<TrendingCategory, string> = {
    all: 'trending viral videos 2026',
    music: 'trending music songs top tracks',
    gaming: 'trending gameplay games official',
    news: 'trending news headlines updates',
    movies: 'trending movie trailers official 2026',
  };

  /**
   * Extracts trending videos for a specified category and region code
   */
  public static async extract(
    category: TrendingCategory = 'all',
    regionCode: string = 'US'
  ): Promise<{ category: TrendingCategory; region: string; items: SearchVideoItem[] }> {
    const cleanCategory = (category.toLowerCase() in this.CATEGORY_QUERIES ? category.toLowerCase() : 'all') as TrendingCategory;
    const cleanRegion = (regionCode || 'US').toUpperCase();

    // 1. Try Invidious mirror if a healthy one is available
    const mirrors = MirrorManager.getMirrors().filter(m => m.healthy && m.type === 'invidious');
    if (mirrors.length > 0) {
      const invMirror = mirrors[0];
      try {
        const invType = cleanCategory === 'all' ? 'default' : cleanCategory;
        const res = await HttpClient.get(`${invMirror.url}/api/v1/trending?type=${invType}&region=${cleanRegion}`, {
          timeoutMs: 3000,
        });
        const rawItems = JSON.parse(res);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const items: SearchVideoItem[] = rawItems.slice(0, 30).map((v: any) => ({
            type: 'video',
            platform: 'youtube',
            id: v.videoId,
            title: v.title,
            descriptionSnippet: v.description || '',
            durationText: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${(v.lengthSeconds % 60).toString().padStart(2, '0')}` : '',
            viewCountText: v.viewCount ? `${v.viewCount.toLocaleString()} views` : '',
            publishedTimeText: v.publishedText || '',
            uploader: {
              id: v.authorId || '',
              name: v.author || 'YouTube Creator',
              url: `https://www.youtube.com/channel/${v.authorId || ''}`,
              verified: Boolean(v.authorVerified),
            },
            thumbnails: v.videoThumbnails?.map((t: any) => ({
              url: t.url,
              width: t.width || 320,
              height: t.height || 180,
            })) || [{ url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, width: 480, height: 360 }],
          }));
          return { category: cleanCategory, region: cleanRegion, items };
        }
      } catch {
        // Fallback to direct YouTube InnerTube extraction
      }
    }

    // 2. Direct InnerTube Search with Regional Context
    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);
    webContext.gl = cleanRegion;

    const query = this.CATEGORY_QUERIES[cleanCategory];
    const searchBody = InnerTubeClient.prepareSearchBody(query, webContext, 'EgIQAQ=='); // Video only

    try {
      const searchData = await HttpClient.postJson<any>(
        `${InnerTubeClient.ENDPOINTS.SEARCH}?prettyPrint=false`,
        searchBody,
        { headers: InnerTubeClient.getWebHeaders() }
      );

      const items: SearchVideoItem[] = [];
      const sectionList =
        searchData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;

      if (Array.isArray(sectionList)) {
        for (const section of sectionList) {
          const itemSection = section.itemSectionRenderer?.contents;
          if (Array.isArray(itemSection)) {
            for (const rawItem of itemSection) {
              const parsed = SearchExtractor.parseItem(rawItem);
              if (parsed && parsed.type === 'video') {
                items.push(parsed as SearchVideoItem);
              }
            }
          }
        }
      }

      if (items.length > 0) {
        return { category: cleanCategory, region: cleanRegion, items };
      }
    } catch {
      // Fallback
    }

    // 3. Resilient Fallback Search
    const fallbackSearch = await SearchExtractor.search(query, { type: 'video' });
    return {
      category: cleanCategory,
      region: cleanRegion,
      items: fallbackSearch.items.filter(i => i.type === 'video') as SearchVideoItem[],
    };
  }
}
