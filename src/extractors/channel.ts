/**
 * ZenTube Channel Extractor
 * Extracts channel details, subscribers, avatars, banners, and tab items
 * Inspired by NewPipe's YoutubeChannelExtractor.java
 */

import { HttpClient } from '../core/http.ts';
import { InnerTubeClient } from '../core/clients.ts';
import { getText, parseThumbnails } from '../utils/parser.ts';
import { extractChannelIdOrHandle } from '../utils/helper.ts';
import type { ChannelInfo, SearchVideoItem } from '../types.ts';

export class ChannelExtractor {
  /**
   * Resolves a channel handle (@name) or custom path into a canonical UC channel ID
   */
  public static async resolveChannelId(idOrHandle: string): Promise<string> {
    if (idOrHandle.startsWith('UC') && idOrHandle.length >= 24) {
      return idOrHandle;
    }

    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    const targetUrl = idOrHandle.startsWith('http')
      ? idOrHandle
      : `https://www.youtube.com/${idOrHandle.startsWith('@') ? idOrHandle : '@' + idOrHandle}`;

    const res = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.RESOLVE_URL}?prettyPrint=false`,
      {
        context: { client: webContext },
        url: targetUrl,
      },
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const resolvedId = res.endpoint?.browseEndpoint?.browseId;
    if (!resolvedId) {
      throw new Error(`Could not resolve channel ID for: "${idOrHandle}"`);
    }

    return resolvedId;
  }

  /**
   * Extracts channel info from Channel ID (UC...) or Handle (@name)
   */
  public static async extract(channelIdOrHandleOrUrl: string): Promise<ChannelInfo> {
    const extracted = extractChannelIdOrHandle(channelIdOrHandleOrUrl);
    if (!extracted) {
      throw new Error(`Invalid YouTube channel ID, handle, or URL: "${channelIdOrHandleOrUrl}"`);
    }

    const canonicalChannelId = await this.resolveChannelId(extracted.value);

    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    const data = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.BROWSE}?prettyPrint=false`,
      InnerTubeClient.prepareBrowseBody(canonicalChannelId, webContext),
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const header = data.header?.c4TabbedHeaderRenderer || data.header?.pageHeaderRenderer;
    const metadata = data.metadata?.channelMetadataRenderer || {};

    const name = getText(header?.title) || metadata.title || '';
    const description = metadata.description || getText(data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[0]?.text) || '';
    const id = metadata.externalId || data.responseContext?.serviceTrackingParams?.[0]?.params?.find((p: any) => p.key === 'browse_id')?.value || extracted.value;

    // Sub counts
    const subscriberCountText =
      getText(header?.subscriberCountText) ||
      getText(data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[0]?.text);

    const avatarUrl =
      header?.avatar?.thumbnails?.[0]?.url ||
      metadata.avatar?.thumbnails?.[0]?.url ||
      data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources?.[0]?.url;

    const bannerUrl =
      header?.banner?.thumbnails?.slice(-1)[0]?.url ||
      data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources?.slice(-1)[0]?.url;

    // Tabs
    const tabsList = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const tabs: string[] = [];
    const recentVideos: SearchVideoItem[] = [];

    for (const tab of tabsList) {
      const tabRenderer = tab.tabRenderer;
      if (!tabRenderer) continue;

      const title = tabRenderer.title || '';
      if (title) tabs.push(title);

      // Parse recent videos from Home or Videos tab
      if (tabRenderer.selected && tabRenderer.content?.sectionListRenderer?.contents) {
        const sections = tabRenderer.content.sectionListRenderer.contents;
        for (const section of sections) {
          const itemSection = section.itemSectionRenderer?.contents;
          if (Array.isArray(itemSection)) {
            for (const item of itemSection) {
              const gridVideos = item.gridRenderer?.items || item.shelfRenderer?.content?.gridRenderer?.items || item.shelfRenderer?.content?.horizontalListRenderer?.items;
              if (Array.isArray(gridVideos)) {
                for (const gv of gridVideos) {
                  const vr = gv.gridVideoRenderer || gv.videoRenderer;
                  if (vr && vr.videoId) {
                    recentVideos.push({
                      type: 'video',
                      id: vr.videoId,
                      title: getText(vr.title),
                      durationText: getText(vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text),
                      viewCountText: getText(vr.viewCountText),
                      publishedTimeText: getText(vr.publishedTimeText),
                      uploader: {
                        name,
                        id,
                        verified: false,
                      },
                      thumbnails: parseThumbnails(vr.thumbnail),
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      id,
      name,
      handle: extracted.type === 'handle' ? extracted.value : undefined,
      description,
      subscriberCountText,
      avatarUrl,
      bannerUrl,
      verified: Boolean(header?.badges?.some((b: any) => b.metadataBadgeRenderer?.style?.includes('VERIFIED'))),
      tabs,
      recentVideos,
    };
  }
}
