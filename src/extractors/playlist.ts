/**
 * ZenTube Playlist Extractor
 * Extracts playlist metadata, track listing, and continuation tokens
 * Supports both modern lockupViewModels and legacy playlistVideoRenderers
 * Inspired by NewPipe's YoutubePlaylistExtractor.java
 */

import { HttpClient } from '../core/http.ts';
import { InnerTubeClient } from '../core/clients.ts';
import { getText, parseThumbnails, parseInteger } from '../utils/parser.ts';
import { extractPlaylistId } from '../utils/helper.ts';
import type { PlaylistInfo, SearchVideoItem } from '../types.ts';

export class PlaylistExtractor {
  public static async extract(playlistIdOrUrl: string, continuationToken?: string): Promise<PlaylistInfo> {
    const playlistId = extractPlaylistId(playlistIdOrUrl);
    if (!playlistId) {
      throw new Error(`Invalid YouTube playlist ID or URL: "${playlistIdOrUrl}"`);
    }

    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    const browseId = playlistId.startsWith('VL') ? playlistId : `VL${playlistId}`;

    const data = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.BROWSE}?prettyPrint=false`,
      InnerTubeClient.prepareBrowseBody(browseId, webContext, undefined, continuationToken),
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const header = data.header?.playlistHeaderRenderer || data.header?.pageHeaderRenderer;
    const sidebar = data.sidebar?.playlistSidebarRenderer?.items;

    const title = getText(header?.title) || getText(sidebar?.[0]?.playlistSidebarPrimaryInfoRenderer?.title) || 'Playlist';
    const description = getText(header?.descriptionText) || getText(sidebar?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title) || '';
    const uploaderName = getText(header?.ownerText) || getText(sidebar?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title) || '';

    const stats = sidebar?.[0]?.playlistSidebarPrimaryInfoRenderer?.stats || [];
    const videoCountText = getText(header?.numVideosText) || getText(stats[0]) || '';
    const viewCountText = getText(header?.viewCountText) || getText(stats[1]) || '';

    const thumbnails = parseThumbnails(header?.playlistHeaderBanner?.heroPlaylistThumbnailRenderer?.thumbnail || sidebar?.[0]?.playlistSidebarPrimaryInfoRenderer?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail);

    const videos: SearchVideoItem[] = [];
    let nextContinuationToken: string | undefined;

    // Plist contents
    const tab = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer;
    const sectionList = tab?.content?.sectionListRenderer?.contents || data.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems;

    if (Array.isArray(sectionList)) {
      for (const section of sectionList) {
        const itemSection = section.itemSectionRenderer?.contents || [section];
        for (const item of itemSection) {
          // Check continuation item
          if (item.continuationItemRenderer) {
            nextContinuationToken = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
            continue;
          }

          // 1. Check Modern lockupViewModel (YouTube modern format)
          if (item.lockupViewModel && item.lockupViewModel.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
            const lvm = item.lockupViewModel;
            const meta = lvm.metadata?.lockupMetadataViewModel;
            const title = meta?.title?.content || '';
            const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
            const uploader = rows[0]?.metadataParts?.[0]?.text?.content || uploaderName;
            const viewsText = rows[1]?.metadataParts?.[0]?.text?.content || '';
            const thumbSources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
            const durationText = lvm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || '';

            videos.push({
              type: 'video',
              id: lvm.contentId,
              title,
              durationText,
              viewCountText: viewsText,
              uploader: {
                name: uploader,
                verified: false,
              },
              thumbnails: thumbSources.map((s: any) => ({ url: s.url, width: s.width, height: s.height })),
            });
            continue;
          }

          // 2. Check Classic playlistVideoListRenderer
          const playlistVideoList = item.playlistVideoListRenderer?.contents;
          if (Array.isArray(playlistVideoList)) {
            for (const pvr of playlistVideoList) {
              if (pvr.continuationItemRenderer) {
                nextContinuationToken = pvr.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
                continue;
              }

              const v = pvr.playlistVideoRenderer;
              if (v && v.videoId) {
                videos.push({
                  type: 'video',
                  id: v.videoId,
                  title: getText(v.title),
                  durationText: getText(v.lengthText),
                  uploader: {
                    name: getText(v.shortBylineText),
                    id: v.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
                    verified: false,
                  },
                  thumbnails: parseThumbnails(v.thumbnail),
                });
              }
            }
          }
        }
      }
    }

    return {
      id: playlistId,
      title,
      description,
      uploaderName,
      videoCount: parseInteger(videoCountText, videos.length),
      viewCountText,
      thumbnails,
      videos,
      continuationToken: nextContinuationToken,
    };
  }
}
