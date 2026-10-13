/**
 * ZenTube YouTube Related / Recommended Streams Extractor
 * Fetches and parses secondary results from the /next InnerTube endpoint
 * Inspired by NewPipe's YoutubeStreamExtractor.java related streams
 */

import { HttpClient } from '../../core/http.ts';
import { InnerTubeClient } from '../../core/clients.ts';
import { extractVideoId } from '../../utils/helper.ts';
import type { RelatedVideoItem } from '../../types.ts';

export class RelatedStreamsExtractor {
  /**
   * Fetches related/recommended videos for a given YouTube video ID or URL
   */
  public static async getRelated(videoIdOrUrl: string): Promise<RelatedVideoItem[]> {
    const videoId = extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error(`Invalid YouTube video ID or URL: "${videoIdOrUrl}"`);
    }

    const visitorData = await HttpClient.getVisitorData();
    const webContext = InnerTubeClient.createWebContext(visitorData);

    const data = await HttpClient.postJson<any>(
      `${InnerTubeClient.ENDPOINTS.NEXT}?prettyPrint=false`,
      {
        context: { client: webContext },
        videoId,
      },
      { headers: InnerTubeClient.getWebHeaders() }
    );

    const results =
      data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results || [];

    const items: RelatedVideoItem[] = [];

    for (const raw of results) {
      // 1. Modern lockupViewModel
      if (raw.lockupViewModel) {
        const lvm = raw.lockupViewModel;
        const id = lvm.contentId;
        const meta = lvm.metadata?.lockupMetadataViewModel;
        const title = meta?.title?.content;

        if (id && title) {
          const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
          const uploaderName = rows[0]?.metadataParts?.[0]?.text?.content || 'Unknown';
          const viewCountText = rows[1]?.metadataParts?.[0]?.text?.content
            ? `${rows[1].metadataParts[0].text.content} views`
            : undefined;

          // Overlay duration badge
          const overlays = lvm.contentImage?.thumbnailViewModel?.overlays || [];
          let duration: string | undefined;
          for (const ov of overlays) {
            const badge = ov.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel;
            if (badge && badge.text) {
              duration = badge.text;
              break;
            }
          }

          const sources = lvm.contentImage?.thumbnailViewModel?.image?.sources || [];
          const thumbnails = sources.map((s: any) => ({
            url: s.url,
            width: s.width || 0,
            height: s.height || 0,
          }));

          items.push({
            id,
            title,
            uploaderName,
            duration,
            viewCountText,
            uploaderUrl: undefined,
            thumbnails,
          });
        }
      }

      // 2. Classic compactVideoRenderer
      if (raw.compactVideoRenderer) {
        const cv = raw.compactVideoRenderer;
        const id = cv.videoId;
        const title = cv.title?.simpleText || cv.title?.runs?.[0]?.text;

        if (id && title) {
          const uploaderName = cv.shortBylineText?.runs?.[0]?.text || 'Unknown';
          const duration = cv.lengthText?.simpleText;
          const viewCountText = cv.viewCountText?.simpleText;
          const thumbs = (cv.thumbnail?.thumbnails || []).map((t: any) => ({
            url: t.url,
            width: t.width || 0,
            height: t.height || 0,
          }));

          items.push({
            id,
            title,
            uploaderName,
            duration,
            viewCountText,
            uploaderUrl: cv.shortBylineText?.runs?.[0]?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url,
            thumbnails: thumbs,
          });
        }
      }
    }

    return items;
  }
}
