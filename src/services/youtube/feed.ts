/**
 * ZenTube YouTube Channel RSS / Atom Feed Extractor
 * Provides instant, zero-auth, zero-botguard channel video feeds
 * Inspired by NewPipe's feed extractor & YoutubeSubscriptionHelper
 */

import { ChannelExtractor } from '../../extractors/channel.ts';
import { extractChannelIdOrHandle } from '../../utils/helper.ts';
import type { ChannelFeed, FeedVideoItem } from '../../types.ts';

export class ChannelFeedExtractor {
  private static readonly FEED_URL = 'https://www.youtube.com/feeds/videos.xml';

  /**
   * Helper to extract text between XML tags
   */
  private static extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  }

  /**
   * Helper to extract an attribute from an XML tag
   */
  private static extractAttr(xml: string, tag: string, attr: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
    return match ? match[1] : '';
  }

  /**
   * Fetches and parses the latest video feed for a YouTube channel
   */
  public static async getFeed(channelIdOrHandleOrUrl: string): Promise<ChannelFeed> {
    const extracted = extractChannelIdOrHandle(channelIdOrHandleOrUrl);
    let channelId = extracted ? extracted.value : channelIdOrHandleOrUrl;

    // Resolve handle to channel ID if needed
    if (!channelId.startsWith('UC') || channelId.startsWith('@')) {
      channelId = await ChannelExtractor.resolveChannelId(channelId);
    }

    const feedUrl = `${this.FEED_URL}?channel_id=${encodeURIComponent(channelId)}`;
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/atom+xml,application/xml,text/xml',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch channel feed: HTTP ${res.status} for "${channelId}"`);
    }

    const xml = await res.text();

    const channelTitle = this.extractTag(xml, 'title');
    const channelLink = this.extractAttr(xml, 'link', 'href');
    const published = this.extractTag(xml, 'published');
    const authorName = this.extractTag(xml, 'name');

    // Parse all <entry> elements
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
    const items: FeedVideoItem[] = entries.map((entry) => {
      const videoId = this.extractTag(entry, 'yt:videoId');
      const title = this.extractTag(entry, 'title');
      const link = this.extractAttr(entry, 'link', 'href') || `https://www.youtube.com/watch?v=${videoId}`;
      const pubDate = this.extractTag(entry, 'published');
      const updated = this.extractTag(entry, 'updated');
      const description = this.extractTag(entry, 'media:description');
      const thumbnailUrl = this.extractAttr(entry, 'media:thumbnail', 'url');
      const viewsStr = this.extractAttr(entry, 'media:statistics', 'views');

      return {
        id: videoId,
        title,
        link,
        published: pubDate,
        updated,
        channelId,
        channelTitle: channelTitle || authorName,
        description,
        thumbnailUrl,
        views: viewsStr ? parseInt(viewsStr, 10) : undefined,
      };
    });

    return {
      channelId,
      title: channelTitle || authorName,
      link: channelLink,
      published,
      author: authorName,
      items,
    };
  }

  /**
   * Aggregates latest video uploads from multiple channels into a single chronological feed
   */
  public static async aggregate(
    channelIdsOrHandles: string[],
    maxTotal: number = 60
  ): Promise<FeedVideoItem[]> {
    if (!channelIdsOrHandles || channelIdsOrHandles.length === 0) {
      return [];
    }

    const uniqueTargets = Array.from(new Set(channelIdsOrHandles)).slice(0, 30);
    const allItems: FeedVideoItem[] = [];

    // Process in bounded batches of 5 concurrent requests
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueTargets.length; i += BATCH_SIZE) {
      const batch = uniqueTargets.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (target) => {
        try {
          const feed = await this.getFeed(target);
          return feed.items;
        } catch {
          return [];
        }
      });

      const batchResults = await Promise.all(promises);
      for (const res of batchResults) {
        allItems.push(...res);
      }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    const deduped: FeedVideoItem[] = [];
    for (const item of allItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }

    // Sort chronologically descending (newest first)
    deduped.sort((a, b) => {
      const timeA = a.published ? new Date(a.published).getTime() : 0;
      const timeB = b.published ? new Date(b.published).getTime() : 0;
      return timeB - timeA;
    });

    return deduped.slice(0, maxTotal);
  }
}
