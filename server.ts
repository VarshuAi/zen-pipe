/**
 * ZenTube Demo Web Server
 * Serves the interactive frontend UI and provides REST API proxying
 * Zero external dependencies - runs directly on Node.js
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { ZenTube, StreamMuxer } from './src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = parseInt(process.env.PORT || '3333', 10);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, pathname: string, searchParams: URLSearchParams) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/health' || pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'zen-pipe',
        version: '1.0.0',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (pathname === '/api/stream') {
      const id = searchParams.get('id');
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing "id" query parameter' }));
        return;
      }
      const data = await ZenTube.getStreamWithFallback(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/search') {
      const q = searchParams.get('q') || '';
      const type = (searchParams.get('type') || 'all') as any;
      const continuation = searchParams.get('continuation') || undefined;

      const data = await ZenTube.search(q, { type }, continuation);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/suggest') {
      const q = searchParams.get('q') || '';
      const data = await ZenTube.getSuggestions(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/channel') {
      const id = searchParams.get('id') || '';
      const data = await ZenTube.getChannel(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/playlist') {
      const id = searchParams.get('id') || '';
      const continuation = searchParams.get('continuation') || undefined;
      const data = await ZenTube.getPlaylist(id, continuation);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/comments') {
      const id = searchParams.get('id') || '';
      const continuation = searchParams.get('continuation') || undefined;
      const data = await ZenTube.getComments(id, continuation);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/transcript') {
      const id = searchParams.get('id') || '';
      const lang = searchParams.get('lang') || 'en';
      const data = await ZenTube.getTranscript(id, lang);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/subtitles') {
      const id = searchParams.get('id') || '';
      const format = (searchParams.get('format') || 'srt') as any;
      const stream = await ZenTube.getStream(id);
      if (!stream.subtitles || stream.subtitles.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No subtitles available' }));
        return;
      }
      const data = await ZenTube.convertSubtitles(stream.subtitles[0].baseUrl, format);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(data);
      return;
    }

    if (pathname === '/api/shorts') {
      const continuation = searchParams.get('continuation') || undefined;
      const query = searchParams.get('q') || searchParams.get('channel') || undefined;
      const data = await ZenTube.getShorts(query, continuation);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/universal') {
      const url = searchParams.get('url') || '';
      const data = await ZenTube.extract(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/soundcloud') {
      const url = searchParams.get('url') || '';
      const data = await ZenTube.soundcloud.getTrack(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/sc-search') {
      const q = searchParams.get('q') || '';
      const data = await ZenTube.soundcloud.search(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/bandcamp') {
      const url = searchParams.get('url') || '';
      const data = await ZenTube.bandcamp.getAlbum(url);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/peertube') {
      const id = searchParams.get('id') || searchParams.get('url') || '';
      const instance = searchParams.get('instance') || undefined;
      const video = await ZenTube.peertube.getVideo(id, instance);
      const streamInfo = ZenTube.peertube.toStreamInfo(video);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ video, streamInfo }));
      return;
    }

    if (pathname === '/api/peertube-search') {
      const q = searchParams.get('q') || '';
      const instance = searchParams.get('instance') || undefined;
      const data = await ZenTube.peertube.search(q, { instance });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/peertube-trending') {
      const instance = searchParams.get('instance') || undefined;
      const data = await ZenTube.peertube.getTrending({ instance });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/mediaccc') {
      const id = searchParams.get('id') || searchParams.get('url') || '';
      const event = await ZenTube.mediaccc.getEvent(id);
      const streamInfo = ZenTube.mediaccc.toStreamInfo(event);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ event, streamInfo }));
      return;
    }

    if (pathname === '/api/mediaccc-conferences') {
      const data = await ZenTube.mediaccc.getConferences();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/mediaccc-search') {
      const q = searchParams.get('q') || '';
      const data = await ZenTube.mediaccc.search(q);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/related') {
      const id = searchParams.get('id') || '';
      const data = await ZenTube.getRelated(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/feed') {
      const channel = searchParams.get('channel') || searchParams.get('id') || '';
      const data = await ZenTube.getFeed(channel);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/trending') {
      const category = (searchParams.get('category') || 'all') as any;
      const region = searchParams.get('region') || 'US';
      const data = await ZenTube.getTrending(category, region);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/feed/aggregated') {
      let channels: string[] = [];
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const parsed = JSON.parse(body);
          channels = Array.isArray(parsed.channels) ? parsed.channels : [];
        } catch {}
      } else {
        const raw = searchParams.get('channels') || '';
        channels = raw ? raw.split(',').map((c) => c.trim()).filter(Boolean) : [];
      }

      if (channels.length === 0) {
        channels = ['@NoCopyrightSounds'];
      }

      const data = await ZenTube.getAggregatedFeed(channels, 40);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/subscriptions/opml') {
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const items = ZenTube.subscriptions.importOpml(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(items));
      } else {
        const defaultSubs = [
          { serviceId: 0, serviceName: 'youtube' as const, url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg', name: 'NoCopyrightSounds' },
          { serviceId: 2, serviceName: 'peertube' as const, url: 'https://peertube.tv/video-channels/framasoft', name: 'Framasoft' },
        ];
        const opml = ZenTube.subscriptions.exportOpml(defaultSubs);
        res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
        res.end(opml);
      }
      return;
    }

    if (pathname === '/api/subscriptions/newpipe') {
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const items = ZenTube.subscriptions.importNewPipeJson(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(items));
      } else {
        const defaultSubs = [
          { serviceId: 0, serviceName: 'youtube' as const, url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg', name: 'NoCopyrightSounds' },
        ];
        const json = ZenTube.subscriptions.exportNewPipeJson(defaultSubs);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(json);
      }
      return;
    }

    if (pathname === '/api/sponsorblock') {
      const id = searchParams.get('id') || '';
      const segments = await ZenTube.getSponsorSegments(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(segments));
      return;
    }

    if (pathname === '/api/dislikes') {
      const id = searchParams.get('id') || '';
      const dislikes = await ZenTube.getDislikes(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dislikes));
      return;
    }

    if (pathname === '/api/mirrors') {
      const fast = searchParams.get('fast') === 'true';
      const mirrors = fast
        ? ZenTube.mirrors.getMirrors()
        : await ZenTube.mirrors.checkAllMirrors(2500);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mirrors }));
      return;
    }

    if (pathname === '/api/mirrors/refresh') {
      const mirrors = await ZenTube.mirrors.checkAllMirrors(3000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mirrors }));
      return;
    }

    if (pathname === '/api/download') {
      const id = searchParams.get('id') || searchParams.get('url');
      const quality = searchParams.get('quality') || '720p';
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing "id" query parameter' }));
        return;
      }

      const stream = await ZenTube.getStreamWithFallback(id);
      let selection = ZenTube.selectFormat(stream, quality);

      if (selection.type === 'adaptive' && selection.videoStream && selection.audioStream) {
        const canMux = await StreamMuxer.isAvailable();
        if (canMux) {
          const tempOut = path.join(os.tmpdir(), `zentube_dl_${Math.random().toString(36).slice(2, 9)}.mp4`);
          try {
            await StreamMuxer.downloadAndMux(selection.videoStream.url, selection.audioStream.url, tempOut);
            const stat = fs.statSync(tempOut);
            res.writeHead(200, {
              'Content-Type': 'video/mp4',
              'Content-Length': stat.size,
              'Content-Disposition': `attachment; filename="${encodeURIComponent(selection.filename)}"`,
              'Access-Control-Allow-Origin': '*',
            });
            const fileStream = fs.createReadStream(tempOut);
            fileStream.pipe(res);
            fileStream.on('close', () => {
              try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
            });
            return;
          } catch {
            try { if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut); } catch {}
          }
        }
        // Fallback to progressive 720p if FFmpeg is unavailable or muxing failed
        selection = ZenTube.selectFormat(stream, '720p');
      }

      if (!selection.url) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Download stream not found' }));
        return;
      }

      const clientHeaders: Record<string, string> = {
        'User-Agent': 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
      };

      const upstreamRes = await fetch(selection.url, { headers: clientHeaders });
      if (!upstreamRes.ok) {
        res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Upstream media server returned ${upstreamRes.status}` }));
        return;
      }

      const forwardHeaders: Record<string, string> = {
        'Content-Type': selection.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(selection.filename)}"`,
        'Access-Control-Allow-Origin': '*',
      };
      const len = upstreamRes.headers.get('content-length');
      if (len) forwardHeaders['Content-Length'] = len;

      res.writeHead(200, forwardHeaders);
      if (upstreamRes.body) {
        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
      return;
    }

    // Media Stream Proxy with Range request support for HTML5 <video> and <audio>
    if (pathname === '/api/proxy') {
      const streamUrl = searchParams.get('url');
      if (!streamUrl) {
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing "url" parameter' }));
        }
        return;
      }

      const clientHeaders: Record<string, string> = {
        'User-Agent': 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
      };

      if (req.headers.range) {
        clientHeaders['Range'] = req.headers.range;
      }

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      try {
        const streamRes = await fetch(streamUrl, {
          headers: clientHeaders,
          signal: controller.signal,
        });

        const forwardHeaders: Record<string, string> = {
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
        };

        const contentType = streamRes.headers.get('content-type') || '';
        if (contentType) forwardHeaders['Content-Type'] = contentType;

        const isSegment = streamUrl.includes('/file/seg') || streamUrl.includes('.ts') || streamUrl.endsWith('.m4s') || streamUrl.endsWith('.mp4');
        const isM3u8 = !isSegment && (
          contentType.includes('mpegurl') || contentType.includes('m3u8') ||
          streamUrl.includes('hls_variant') || streamUrl.includes('playlist/index.m3u8') || streamUrl.endsWith('.m3u8')
        );

        if (isSegment && (!contentType || contentType === 'application/octet-stream')) {
          forwardHeaders['Content-Type'] = streamUrl.includes('.ts') ? 'video/MP2T' : 'video/mp4';
        }

        if (isM3u8) {
          const rawM3u8 = await streamRes.text();
          // Rewrite internal manifest URLs and segment chunk URLs to pass through /api/proxy
          const rewritten = rawM3u8
            .replace(/URI="(https?:\/\/[^"]+)"/g, (_, u) => `URI="/api/proxy?url=${encodeURIComponent(u)}"`)
            .split('\n')
            .map((line) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
              }
              return line;
            })
            .join('\n');

          const buf = Buffer.from(rewritten, 'utf-8');
          forwardHeaders['Content-Type'] = 'application/vnd.apple.mpegurl; charset=utf-8';
          forwardHeaders['Content-Length'] = buf.length.toString();
          if (!res.headersSent) {
            res.writeHead(streamRes.status, forwardHeaders);
          }
          res.end(buf);
          return;
        }

        const contentLength = streamRes.headers.get('content-length');
        if (contentLength) forwardHeaders['Content-Length'] = contentLength;

        const contentRange = streamRes.headers.get('content-range');
        if (contentRange) forwardHeaders['Content-Range'] = contentRange;

        if (!res.headersSent) {
          res.writeHead(streamRes.status, forwardHeaders);
        }

        if (streamRes.body) {
          const nodeStream = Readable.fromWeb(streamRes.body as any);
          nodeStream.on('error', () => {
            res.destroy();
          });
          nodeStream.pipe(res);
        } else {
          res.end();
        }
      } catch {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Stream fetch aborted or failed' }));
        } else {
          res.destroy();
        }
      }
      return;
    }

    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    } else {
      res.destroy();
    }
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/') || pathname === '/health') {
    await handleApi(req, res, pathname, parsedUrl.searchParams);
    return;
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\x1b[1m\x1b[32m[ZenTube Server]\x1b[0m Running on \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`\x1b[34m[ZenTube]\x1b[0m Ready to stream live YouTube media without mock data!`);
});
