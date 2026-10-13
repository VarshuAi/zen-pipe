/**
 * ZenTube Subscription & OPML Manager
 * Supports importing and exporting subscriptions in standard OPML and NewPipe JSON formats
 * Inspired by NewPipe's OpmlParser.java and SubscriptionManager
 */

import type { SubscriptionItem, NewPipeSubscriptionBackup, StreamingPlatform } from '../types.ts';

export class SubscriptionManager {
  private static readonly SERVICE_MAP: Record<number, StreamingPlatform> = {
    0: 'youtube',
    1: 'soundcloud',
    2: 'peertube',
    3: 'bandcamp',
    4: 'mediaccc',
  };

  private static readonly PLATFORM_ID_MAP: Record<StreamingPlatform, number> = {
    youtube: 0,
    soundcloud: 1,
    peertube: 2,
    bandcamp: 3,
    mediaccc: 4,
  };

  /**
   * Parses an OPML string into subscription items
   */
  public static importOpml(opmlXml: string): SubscriptionItem[] {
    const items: SubscriptionItem[] = [];
    const outlineRegex = /<outline\b([^>]+?)\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = outlineRegex.exec(opmlXml)) !== null) {
      const attrsStr = match[1];

      const getAttr = (name: string): string => {
        const m = attrsStr.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return m ? m[1] : '';
      };

      const title = getAttr('title') || getAttr('text');
      const xmlUrl = getAttr('xmlUrl');
      const htmlUrl = getAttr('htmlUrl');

      // Check if it's a leaf node with feed/link
      if (xmlUrl || htmlUrl) {
        let url = htmlUrl || xmlUrl;
        let serviceName: StreamingPlatform = 'youtube';

        if (url.includes('soundcloud.com')) serviceName = 'soundcloud';
        else if (url.includes('bandcamp.com')) serviceName = 'bandcamp';
        else if (url.includes('media.ccc.de')) serviceName = 'mediaccc';
        else if (url.includes('peertube') || url.includes('/video-channels/')) serviceName = 'peertube';

        items.push({
          serviceId: this.PLATFORM_ID_MAP[serviceName],
          serviceName,
          url,
          name: title || 'Unnamed Subscription',
        });
      }
    }

    return items;
  }

  /**
   * Generates a standard OPML XML string from subscription items
   */
  public static exportOpml(subscriptions: SubscriptionItem[], title = 'ZenTube Subscriptions'): string {
    const outlines = subscriptions
      .map((sub) => {
        const escapedName = this.escapeXml(sub.name);
        const escapedUrl = this.escapeXml(sub.url);
        let xmlUrl = '';
        if (sub.serviceName === 'youtube') {
          const match = sub.url.match(/channel\/(UC[a-zA-Z0-9_-]+)/);
          if (match) {
            xmlUrl = ` xmlUrl="https://www.youtube.com/feeds/videos.xml?channel_id=${match[1]}"`;
          }
        }
        return `      <outline text="${escapedName}" title="${escapedName}" type="rss"${xmlUrl} htmlUrl="${escapedUrl}"/>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.1">
  <head>
    <title>${this.escapeXml(title)}</title>
  </head>
  <body>
    <outline text="${this.escapeXml(title)}" title="${this.escapeXml(title)}">
${outlines}
    </outline>
  </body>
</opml>`;
  }

  /**
   * Imports a NewPipe JSON subscription backup
   */
  public static importNewPipeJson(jsonString: string): SubscriptionItem[] {
    const data = JSON.parse(jsonString) as NewPipeSubscriptionBackup;
    if (!Array.isArray(data.subscriptions)) {
      throw new Error('Invalid NewPipe backup format: missing subscriptions array');
    }

    return data.subscriptions.map((sub) => {
      const serviceName = this.SERVICE_MAP[sub.service_id] || 'youtube';
      return {
        serviceId: sub.service_id,
        serviceName,
        url: sub.url,
        name: sub.name,
      };
    });
  }

  /**
   * Exports subscriptions in NewPipe compatible JSON backup format
   */
  public static exportNewPipeJson(subscriptions: SubscriptionItem[]): string {
    const backup: NewPipeSubscriptionBackup = {
      app_version: '0.27.0',
      app_version_int: 2700,
      subscriptions: subscriptions.map((sub) => ({
        service_id: sub.serviceId ?? this.PLATFORM_ID_MAP[sub.serviceName] ?? 0,
        url: sub.url,
        name: sub.name,
      })),
    };

    return JSON.stringify(backup, null, 2);
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
