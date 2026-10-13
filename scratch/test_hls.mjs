function rewriteM3u8(text, proxyBase = '/api/proxy?url=') {
  let r = text.replace(/URI="(https?:\/\/[^"]+)"/g, (_, u) => `URI="${proxyBase}${encodeURIComponent(u)}"`);
  return r
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return `${proxyBase}${encodeURIComponent(trimmed)}`;
      }
      return line;
    })
    .join('\n');
}

const sample = `#EXTM3U
#EXT-X-MEDIA:URI="https://manifest.googlevideo.com/api/manifest/hls_playlist/foo"
#EXTINF:2.0,
https://rr2---sn-gwpa-cagee.googlevideo.com/videoplayback/chunk1.ts
`;

const rewritten = rewriteM3u8(sample);
console.log('--- REWRITTEN M3U8 ---');
console.log(rewritten);
