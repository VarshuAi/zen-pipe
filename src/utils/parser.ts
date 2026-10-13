/**
 * ZenTube Parser Utilities
 * Extracts text, thumbnails, and runs from polymorphic YouTube InnerTube JSON objects
 */

import type { Thumbnail } from '../types.ts';

export function getText(obj: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.simpleText) return obj.simpleText;
  if (Array.isArray(obj.runs)) {
    return obj.runs.map((r: any) => r.text || '').join('');
  }
  return '';
}

export function parseThumbnails(arr: any): Thumbnail[] {
  if (!arr) return [];
  const list = Array.isArray(arr) ? arr : arr.thumbnails;
  if (!Array.isArray(list)) return [];

  return list
    .filter((t: any) => t && t.url)
    .map((t: any) => {
      let url = t.url;
      if (url.startsWith('//')) {
        url = 'https:' + url;
      }
      return {
        url,
        width: t.width || 0,
        height: t.height || 0,
      };
    })
    .sort((a, b) => b.width - a.width);
}

export function parseInteger(val: any, fallback = 0): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? fallback : num;
  }
  return fallback;
}

export function parseViewCount(viewCountText?: string): number {
  if (!viewCountText) return 0;
  return parseInteger(viewCountText, 0);
}
