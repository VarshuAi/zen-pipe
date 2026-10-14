/**
 * ZenTube Universal Platform Router
 * Automatically detects service (YouTube, SoundCloud, Bandcamp, PeerTube, MediaCCC) from input URL
 * and delegates to the appropriate extractor
 */

import { StreamExtractor } from '../extractors/stream.ts';
import { MirrorManager } from './mirrors.ts';
import { SoundCloudExtractor } from '../services/soundcloud/extractor.ts';
import { BandcampExtractor } from '../services/bandcamp/extractor.ts';
import { PeerTubeExtractor } from '../services/peertube/extractor.ts';
import { PeerTubeClient } from '../services/peertube/client.ts';
import { MediaCCCExtractor } from '../services/mediaccc/extractor.ts';
import type { StreamInfo, StreamingPlatform } from '../types.ts';

export class UniversalRouter {
  /**
   * Detects the streaming platform from any URL or ID
   */
  public static detectPlatform(input: string): StreamingPlatform {
    const trimmed = input.trim().toLowerCase();

    if (trimmed.includes('soundcloud.com')) {
      return 'soundcloud';
    }

    if (trimmed.includes('bandcamp.com')) {
      return 'bandcamp';
    }

    if (trimmed.includes('media.ccc.de')) {
      return 'mediaccc';
    }

    if (
      trimmed.includes('peertube') ||
      trimmed.includes('framatube') ||
      trimmed.includes('/videos/watch/') ||
      trimmed.match(/\/w\/[a-zA-Z0-9_-]+/) ||
      Boolean(PeerTubeClient.parseVideoUrl(input))
    ) {
      return 'peertube';
    }

    // Default: YouTube
    return 'youtube';
  }

  /**
   * Automatically routes any URL to its native extractor
   */
  public static async extract(urlOrId: string): Promise<StreamInfo> {
    const platform = this.detectPlatform(urlOrId);

    switch (platform) {
      case 'soundcloud':
        return SoundCloudExtractor.extractTrack(urlOrId);

      case 'bandcamp':
        return BandcampExtractor.extract(urlOrId);

      case 'peertube': {
        const video = await PeerTubeExtractor.getVideo(urlOrId);
        return PeerTubeExtractor.toStreamInfo(video);
      }

      case 'mediaccc': {
        const event = await MediaCCCExtractor.getEvent(urlOrId);
        return MediaCCCExtractor.toStreamInfo(event);
      }

      case 'youtube':
      default: {
        const stream = await MirrorManager.extractWithFallback(urlOrId);
        stream.platform = 'youtube';
        return stream;
      }
    }
  }
}
