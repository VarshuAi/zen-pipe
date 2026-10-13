/**
 * ZenTube Search Extractor
 * Extracts search results (videos, channels, playlists), filters, and continuation
 * Supports both modern lockupViewModels and legacy renderers
 * Inspired by NewPipe's YoutubeSearchExtractor.java
 */

import { HttpClient } from '../core/http.ts';
import { InnerTubeClient } from '../core/clients.ts';
import { getText, parseThumbnails } from '../utils/parser.ts';
import type { SearchResult, SearchItem, SearchFilter } from '../types.ts';

export class SearchExtractor {
  // Predefined filter parameters for YouTube Search
  private static readonly FILTER_PARAMS: Record<string, string> = {
    video: 'EgIQAQ==',
    channel: 'EgIQAg==',
    playlist: 'EgIQAw==',
  };

  /**
   * Searches YouTube for videos, channels, or playlists
   */
  public static async search(
    query: string,
    filter?: SearchFilter,
    continuationToken?: string
  ): Promise<SearchResult> {
    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    const filterParam = filter?.type && filter.type !== 'all' ? this.FILTER_PARAMS[filter.type] : undefined;

    const body = InnerTubeClient.prepareSearchBody(query, webContext, filterParam, continuationToken);

    const data = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.SEARCH}?prettyPrint=false`,
      body,
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const items: SearchItem[] = [];
    let nextContinuationToken: string | undefined;

    // Standard search results structure
    let sectionList =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ||
      data.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems;

    if (Array.isArray(sectionList)) {
      for (const section of sectionList) {
        if (section.continuationItemRenderer) {
          nextContinuationToken =
            section.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
        }

        const itemSection = section.itemSectionRenderer?.contents;
        if (Array.isArray(itemSection)) {
          for (const rawItem of itemSection) {
            const parsed = this.parseItem(rawItem);
            if (parsed) {
              items.push(parsed);
            }
          }
        }
      }
    }

    return {
      query,
      items,
      continuationToken: nextContinuationToken,
    };
  }

  /**
   * Fetches search suggestions for auto-complete
   */
  public static async getSuggestions(query: string): Promise<string[]> {
    if (!query) return [];
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&client=firefox&q=${encodeURIComponent(query)}`;
      const res = await HttpClient.get(url);
      const json = JSON.parse(res);
      if (Array.isArray(json) && Array.isArray(json[1])) {
        return json[1];
      }
    } catch {
      // ignore
    }
    return [];
  }

  private static parseItem(raw: any): SearchItem | null {
    // 1. Check Modern lockupViewModel
    if (raw.lockupViewModel) {
      const lvm = raw.lockupViewModel;
      const meta = lvm.metadata?.lockupMetadataViewModel;
      const title = meta?.title?.content || '';
      const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];

      if (lvm.contentType === 'LOCKUP_CONTENT_TYPE_PLAYLIST') {
        const uploader = rows[0]?.metadataParts?.[0]?.text?.content;
        const videoCount = rows[0]?.metadataParts?.[1]?.text?.content;
        const thumbSources = lvm.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources || [];

        return {
          type: 'playlist',
          id: lvm.contentId,
          title,
          videoCountText: videoCount,
          uploaderName: uploader,
          thumbnails: thumbSources.map((s: any) => ({ url: s.url, width: s.width, height: s.height })),
        };
      }

      if (lvm.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
        const uploader = rows[0]?.metadataParts?.[0]?.text?.content || '';
        const viewsText = rows[1]?.metadataParts?.[0]?.text?.content;
        const published = rows[1]?.metadataParts?.[1]?.text?.content;
        const thumbSources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
        const rawDuration = lvm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || '';
        const overlaysStr = JSON.stringify(lvm.contentImage?.thumbnailViewModel?.overlays || {});
        const isLive = Boolean(
          rawDuration.toLowerCase().includes('live') ||
          title.includes('🔴') ||
          title.toLowerCase().includes('live') ||
          overlaysStr.toLowerCase().includes('live') ||
          viewsText?.toLowerCase()?.includes('watching')
        );

        return {
          type: 'video',
          id: lvm.contentId,
          title,
          durationText: isLive ? '🔴 LIVE' : rawDuration,
          isLive,
          viewCountText: viewsText,
          publishedTimeText: published,
          uploader: {
            name: uploader,
            verified: false,
          },
          thumbnails: thumbSources.map((s: any) => ({ url: s.url, width: s.width, height: s.height })),
        };
      }
    }

    // 2. Check Classic Video Renderer
    if (raw.videoRenderer) {
      const v = raw.videoRenderer;
      const rawDuration = getText(v.lengthText);
      const title = getText(v.title);
      const viewsText = getText(v.viewCountText);
      const isLive = Boolean(
        !rawDuration ||
        v.badges?.some((b: any) => b.metadataBadgeRenderer?.style?.includes('LIVE')) ||
        v.thumbnailOverlays?.some((o: any) => JSON.stringify(o).toLowerCase().includes('live')) ||
        viewsText?.toLowerCase()?.includes('watching') ||
        title.includes('🔴') ||
        title.toLowerCase().includes('live')
      );

      return {
        type: 'video',
        id: v.videoId,
        title,
        descriptionSnippet: getText(v.detailedMetadataSnippets?.[0]?.snippetText || v.descriptionSnippet),
        durationText: isLive ? '🔴 LIVE' : rawDuration,
        isLive,
        viewCountText: viewsText,
        publishedTimeText: getText(v.publishedTimeText),
        uploader: {
          name: getText(v.ownerText),
          id: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
          avatarUrl: v.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url,
          verified: Boolean(v.ownerBadges?.some((b: any) => b.metadataBadgeRenderer?.style?.includes('VERIFIED'))),
        },
        thumbnails: parseThumbnails(v.thumbnail),
      };
    }

    // 3. Check Classic Channel Renderer
    if (raw.channelRenderer) {
      const c = raw.channelRenderer;
      return {
        type: 'channel',
        id: c.channelId,
        name: getText(c.title),
        handle: getText(c.subscriberCountText),
        descriptionSnippet: getText(c.descriptionSnippet),
        videoCountText: getText(c.videoCountText),
        subscriberCountText: getText(c.subscriberCountText),
        thumbnails: parseThumbnails(c.thumbnail),
      };
    }

    // 4. Check Classic Playlist Renderer
    if (raw.playlistRenderer) {
      const p = raw.playlistRenderer;
      return {
        type: 'playlist',
        id: p.playlistId,
        title: getText(p.title),
        videoCountText: getText(p.videoCount),
        uploaderName: getText(p.shortBylineText || p.longBylineText),
        thumbnails: parseThumbnails(p.thumbnails?.[0] || p.thumbnail),
      };
    }

    return null;
  }
}
