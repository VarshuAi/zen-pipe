/**
 * ZenTube Cipher & Throttling Deobfuscator
 * Parses YouTube's web player base.js to unscramble signatureCipher and deobfuscate n-parameter
 * Inspired by NewPipe's YoutubeSignatureUtils & YoutubeThrottlingParameterUtils
 */

import { HttpClient } from './http.ts';

export interface DecipherOperations {
  reverse: () => void;
  splice: (count: number) => void;
  swap: (index: number) => void;
}

export class CipherEngine {
  private static cachedBaseJsUrl: string | null = null;
  private static cachedPlayerTokens: {
    operations: Array<{ type: 'reverse' | 'splice' | 'swap'; arg?: number }>;
  } | null = null;

  /**
   * Fetches the current base.js player URL from YouTube's watch or embed page
   */
  public static async fetchPlayerUrl(): Promise<string> {
    if (this.cachedBaseJsUrl) return this.cachedBaseJsUrl;

    const html = await HttpClient.get('https://www.youtube.com/iframe_api');
    // Look for player url in iframe_api or fallback to main watch page
    let match = html.match(/player\\\/([a-zA-Z0-9_-]+)\\\/player_ias\.vflset\\\/[a-zA-Z0-9_-]+\\\/base\.js/);
    if (match) {
      const url = `https://www.youtube.com/s/player/${match[1]}/player_ias.vflset/en_US/base.js`;
      this.cachedBaseJsUrl = url;
      return url;
    }

    const embedHtml = await HttpClient.get('https://www.youtube.com/embed/jNQXAC9IVRw');
    const embedMatch = embedHtml.match(/"jsUrl":"([^"]+base\.js)"/);
    if (embedMatch) {
      const url = embedMatch[1].startsWith('http') ? embedMatch[1] : `https://www.youtube.com${embedMatch[1]}`;
      this.cachedBaseJsUrl = url;
      return url;
    }

    return 'https://www.youtube.com/s/player/default/player_ias.vflset/en_US/base.js';
  }

  /**
   * Deobfuscates a signature given the raw signature string and operations
   */
  public static decipherSignature(signature: string, operations: Array<{ type: 'reverse' | 'splice' | 'swap'; arg?: number }>): string {
    const chars = signature.split('');

    for (const op of operations) {
      switch (op.type) {
        case 'reverse':
          chars.reverse();
          break;
        case 'splice':
          if (op.arg !== undefined) {
            chars.splice(0, op.arg);
          }
          break;
        case 'swap':
          if (op.arg !== undefined) {
            const index = op.arg % chars.length;
            const temp = chars[0];
            chars[0] = chars[index];
            chars[index] = temp;
          }
          break;
      }
    }

    return chars.join('');
  }

  /**
   * Extracts player decipher tokens from base.js content
   */
  public static extractDecipherTokens(playerJs: string): Array<{ type: 'reverse' | 'splice' | 'swap'; arg?: number }> {
    const tokens: Array<{ type: 'reverse' | 'splice' | 'swap'; arg?: number }> = [];

    // Find main signature function
    // Pattern: funcName = function(a) { a = a.split(""); objName.op1(a, 2); objName.op2(a); ... return a.join("") }
    const sigFuncMatch = playerJs.match(
      /(?:[a-zA-Z0-9_$]+)=function\(([a-zA-Z0-9_$]+)\)\{\s*\1=\1\.split\(""\);\s*([^;]+;)+\s*return \1\.join\(""\)\}/
    );

    if (!sigFuncMatch) {
      return tokens;
    }

    const funcBody = sigFuncMatch[0];
    const objMatch = funcBody.match(/([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]+)\(/);
    if (!objMatch) return tokens;

    const objName = objMatch[1];

    // Find object definition: var objName = { method1: function(a) { a.reverse() }, ... }
    const objDefRegex = new RegExp(`var ${objName}=\\{([\\s\\S]*?)\\};`);
    const objDefMatch = playerJs.match(objDefRegex);
    if (!objDefMatch) return tokens;

    const objBody = objDefMatch[1];
    const methods: Record<string, 'reverse' | 'splice' | 'swap'> = {};

    // Analyze methods inside objBody
    const methodDeclarations = objBody.split(',\n');
    for (const decl of methodDeclarations) {
      const nameMatch = decl.match(/([a-zA-Z0-9_$]+):function/);
      if (!nameMatch) continue;
      const methodName = nameMatch[1];

      if (decl.includes('reverse')) {
        methods[methodName] = 'reverse';
      } else if (decl.includes('splice')) {
        methods[methodName] = 'splice';
      } else if (decl.includes('c=a[0]') || decl.includes('var c=a[0]')) {
        methods[methodName] = 'swap';
      }
    }

    // Now parse operations called in funcBody
    const opRegex = new RegExp(`${objName}\\.([a-zA-Z0-9_$]+)\\([a-zA-Z0-9_$]+(?:,(\\d+))?\\)`, 'g');
    let match: RegExpExecArray | null;
    while ((match = opRegex.exec(funcBody)) !== null) {
      const methodName = match[1];
      const arg = match[2] ? parseInt(match[2], 10) : undefined;
      const type = methods[methodName];
      if (type) {
        tokens.push({ type, arg });
      }
    }

    return tokens;
  }

  /**
   * Deciphers a streaming URL from signatureCipher parameters
   */
  public static async resolveSignatureCipher(cipherString: string): Promise<string> {
    const params = new URLSearchParams(cipherString);
    const url = params.get('url');
    const signature = params.get('s');
    const sp = params.get('sp') || 'sig';

    if (!url) return '';
    if (!signature) return url;

    try {
      if (!this.cachedPlayerTokens) {
        const playerUrl = await this.fetchPlayerUrl();
        const playerJs = await HttpClient.get(playerUrl);
        const tokens = this.extractDecipherTokens(playerJs);
        this.cachedPlayerTokens = { operations: tokens };
      }

      const decipheredSig = this.decipherSignature(signature, this.cachedPlayerTokens.operations);
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set(sp, decipheredSig);
      return parsedUrl.toString();
    } catch {
      // Fallback: return original url with raw signature
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set(sp, signature);
      return parsedUrl.toString();
    }
  }
}
