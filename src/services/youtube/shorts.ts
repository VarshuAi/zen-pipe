/**
 * ZenTube YouTube Shorts Feed Extractor
 * Extracts vertical shorts reels and metadata
 * Supports modern shortsLockupViewModels and classic reelItemRenderers
 */

import { HttpClient } from '../../core/http.ts';
import { InnerTubeClient } from '../../core/clients.ts';
import { ChannelExtractor } from '../../extractors/channel.ts';
import { getText } from '../../utils/parser.ts';
import type { ShortsItem } from '../../types.ts';

export class ShortsExtractor {
  /**
   * Fetches YouTube Shorts from a channel or trending shorts
   */
  public static async getShortsFeed(
    channelOrQuery = '@NoCopyrightSounds',
    continuationToken?: string
  ): Promise<{ items: ShortsItem[]; continuationToken?: string }> {
    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    let browseId = 'UC_aEa8K-EOJ3D6gOs7HcyNg'; // Default NCS
    if (channelOrQuery.startsWith('@') || channelOrQuery.startsWith('UC')) {
      try {
        browseId = await ChannelExtractor.resolveChannelId(channelOrQuery);
      } catch {}
    }

    const data = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.BROWSE}?prettyPrint=false`,
      InnerTubeClient.prepareBrowseBody(browseId, webContext, 'EgZzaG9ydHPyBgUKA5oBAA%3D%3D', continuationToken),
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const items: ShortsItem[] = [];
    let nextToken: string | undefined;

    const tab = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.find((t: any) => t.tabRenderer?.selected) || data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0];
    const contents =
      tab?.tabRenderer?.content?.richGridRenderer?.contents ||
      data.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems ||
      [];

    for (const item of contents) {
      if (item.continuationItemRenderer) {
        nextToken = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
        continue;
      }

      const content = item.richItemRenderer?.content;
      if (!content) continue;

      // 1. Modern shortsLockupViewModel
      if (content.shortsLockupViewModel) {
        const vm = content.shortsLockupViewModel;
        const videoId = vm.entityId ? vm.entityId.replace('shorts-shelf-item-', '') : '';
        const title = vm.overlayMetadata?.primaryText?.content || vm.accessibilityText || '';
        const views = vm.overlayMetadata?.secondaryText?.content || '';
        const thumb = vm.thumbnailViewModel?.image?.sources?.[0]?.url || '';

        if (videoId) {
          const fallbackThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          items.push({
            id: videoId,
            title,
            channelName: channelOrQuery,
            channelId: browseId,
            avatarUrl: `https://yt3.ggpht.com/ytc/AIdro_k=s88-c-k-c0x00ffffff-no-rj`,
            thumbnailUrl: thumb || fallbackThumb,
            viewCountText: views,
          });
        }
        continue;
      }

      // 2. Classic reelItemRenderer
      const reel = content.reelItemRenderer;
      if (reel && reel.videoId) {
        const fallbackThumb = `https://i.ytimg.com/vi/${reel.videoId}/hqdefault.jpg`;
        items.push({
          id: reel.videoId,
          title: getText(reel.headline || reel.title),
          channelName: getText(reel.ownerText || reel.channelTitleText),
          channelId: reel.navigationEndpoint?.reelWatchEndpoint?.overlay?.reelPlayerOverlayRenderer?.reelPlayerHeaderSupportedRenderers?.reelPlayerHeaderRenderer?.channelTitleText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || browseId,
          avatarUrl: reel.channelThumbnail?.thumbnails?.[0]?.url,
          thumbnailUrl: reel.thumbnail?.thumbnails?.[0]?.url || fallbackThumb,
          viewCountText: getText(reel.viewCountText),
        });
      }
    }

    return { items, continuationToken: nextToken };
  }
}
