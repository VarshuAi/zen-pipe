/**
 * ZenTube InnerTube Client Definitions & Request Factory
 * Provides client configurations (VisionOS, Web, Android, iOS)
 * Inspired by NewPipe ClientsConstants.java and InnertubeClientRequestInfo.java
 */

import { generateCpn } from '../utils/helper.ts';

export interface InnerTubeClientContext {
  clientName: string;
  clientVersion: string;
  clientId?: string;
  clientScreen?: string;
  visitorData?: string;
  platform?: string;
  deviceMake?: string;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
  hl?: string;
  gl?: string;
}

export const CLIENT_CONSTANTS = {
  // VisionOS Client (Apple Vision Pro) - Cleanest stream formats without throttling
  VISIONOS: {
    NAME: 'VISIONOS',
    VERSION: '1.04',
    ID: '101',
    DEVICE_MODEL: 'RealityDevice17,1',
    OS_VERSION: '26.6.0.23O770',
    USER_AGENT: 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
  },

  // Web Client (YouTube Desktop) - Richest metadata, transcripts, chapters
  WEB: {
    NAME: 'WEB',
    VERSION: '2.20260805.01.00',
    ID: '1',
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  },

  // Android Client
  ANDROID: {
    NAME: 'ANDROID',
    VERSION: '19.45.38',
    ID: '3',
    USER_AGENT: 'com.google.android.youtube/19.45.38 (Linux; U; Android 14; en_US; Pixel 8 Pro)',
  },

  // iOS Client
  IOS: {
    NAME: 'IOS',
    VERSION: '19.45.4',
    ID: '5',
    USER_AGENT: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X; en_US)',
  },

  // TV / Cobalt Client
  TV_EMBEDDED: {
    NAME: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    VERSION: '2.0',
    ID: '85',
    USER_AGENT: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.93 TV Safari/537.36',
  },
};

export class InnerTubeClient {
  public static readonly ENDPOINTS = {
    PLAYER: 'https://youtubei.googleapis.com/youtubei/v1/player',
    WEB_PLAYER: 'https://www.youtube.com/youtubei/v1/player',
    BROWSE: 'https://www.youtube.com/youtubei/v1/browse',
    SEARCH: 'https://www.youtube.com/youtubei/v1/search',
    NEXT: 'https://www.youtube.com/youtubei/v1/next',
    RESOLVE_URL: 'https://www.youtube.com/youtubei/v1/navigation/resolve_url',
  };

  /**
   * Builds the VisionOS client context for stream playback extraction
   */
  public static createVisionOsContext(visitorData: string): InnerTubeClientContext {
    return {
      clientName: CLIENT_CONSTANTS.VISIONOS.NAME,
      clientVersion: CLIENT_CONSTANTS.VISIONOS.VERSION,
      clientId: CLIENT_CONSTANTS.VISIONOS.ID,
      clientScreen: 'WATCH',
      visitorData,
      platform: 'MOBILE',
      deviceMake: 'Apple',
      deviceModel: CLIENT_CONSTANTS.VISIONOS.DEVICE_MODEL,
      osName: 'visionOS',
      osVersion: CLIENT_CONSTANTS.VISIONOS.OS_VERSION,
      hl: 'en',
      gl: 'US',
    };
  }

  /**
   * Builds the Web client context for metadata, search, and browse
   */
  public static createWebContext(visitorData: string): InnerTubeClientContext {
    return {
      clientName: CLIENT_CONSTANTS.WEB.NAME,
      clientVersion: CLIENT_CONSTANTS.WEB.VERSION,
      clientId: CLIENT_CONSTANTS.WEB.ID,
      clientScreen: 'WATCH',
      visitorData,
      hl: 'en',
      gl: 'US',
    };
  }

  /**
   * Headers for VisionOS player requests
   */
  public static getVisionOsHeaders(): Record<string, string> {
    return {
      'User-Agent': CLIENT_CONSTANTS.VISIONOS.USER_AGENT,
      'X-Goog-Api-Format-Version': '2',
    };
  }

  /**
   * Headers for Web client requests
   */
  public static getWebHeaders(): Record<string, string> {
    return {
      'User-Agent': CLIENT_CONSTANTS.WEB.USER_AGENT,
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com',
      'X-YouTube-Client-Name': CLIENT_CONSTANTS.WEB.ID,
      'X-YouTube-Client-Version': CLIENT_CONSTANTS.WEB.VERSION,
    };
  }

  /**
   * Prepares the body for video player requests
   */
  public static preparePlayerBody(videoId: string, clientContext: InnerTubeClientContext) {
    return {
      context: { client: clientContext },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: 'HTML5_PREF_WANTS',
          signatureTimestamp: 19999,
        },
      },
    };
  }

  /**
   * Prepares the body for video metadata / next endpoint
   */
  public static prepareNextBody(videoId: string, clientContext: InnerTubeClientContext) {
    return {
      context: { client: clientContext },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    };
  }

  /**
   * Prepares the body for search requests
   */
  public static prepareSearchBody(
    query: string,
    clientContext: InnerTubeClientContext,
    params?: string,
    continuation?: string
  ) {
    const body: any = {
      context: { client: clientContext },
    };
    if (continuation) {
      body.continuation = continuation;
    } else {
      body.query = query;
      if (params) body.params = params;
    }
    return body;
  }

  /**
   * Prepares the body for browse requests (channels, playlists)
   */
  public static prepareBrowseBody(
    browseId: string,
    clientContext: InnerTubeClientContext,
    params?: string,
    continuation?: string
  ) {
    const body: any = {
      context: { client: clientContext },
    };
    if (continuation) {
      body.continuation = continuation;
    } else {
      body.browseId = browseId;
      if (params) body.params = params;
    }
    return body;
  }
}
