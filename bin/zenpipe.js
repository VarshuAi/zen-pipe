#!/usr/bin/env node

/**
 * ZenPipe CLI - Flagship Multi-Platform Media Extractor & Streaming Engine
 * 100% Native Node.js 24 TypeScript - Zero external npm dependencies
 */

import { ZenTube } from '../src/index.ts';
import { formatDuration } from '../src/utils/helper.ts';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const extra = args.slice(2).join(' ');

function printHelp() {
  console.log(`
\x1b[1m\x1b[36m⚡ ZenPipe Universal Media Extractor & Streaming Engine\x1b[0m
=============================================================
Usage:
  zenpipe <command> [target] [options]

Core Commands:
  \x1b[32mstream\x1b[0m <url|id>               Extract media streams & playable URLs
  \x1b[32mdownload\x1b[0m <url|id> [options]    Download stream (e.g. -q 1080p | 720p | audio)
  \x1b[32msearch\x1b[0m <query>                Universal search (videos, playlists, channels)
  \x1b[32mtrending\x1b[0m [region] [category]  Fetch trending feed (e.g. US music)
  \x1b[32mshorts\x1b[0m [channel]              Extract YouTube Shorts reel feed
  \x1b[32mserver\x1b[0m [--port 3333]           Launch the ZenPipe 1:1 Desktop Web Client
  \x1b[32msuggest\x1b[0m <query>               Search autocomplete suggestions

Platform & Channel Tools:
  \x1b[32mchannel\x1b[0m <handle|id>           Extract creator profile & recent uploads
  \x1b[32mplaylist\x1b[0m <url|id>            Extract playlist metadata & tracklist
  \x1b[32mcomments\x1b[0m <url|id>            Extract video comments
  \x1b[32mtranscript\x1b[0m <id>              Extract timestamped captions / transcript
  \x1b[32msubtitles\x1b[0m <id> [srt|vtt]      Convert subtitles to SRT or VTT format
  \x1b[32msoundcloud\x1b[0m <url>              Extract SoundCloud track & MP3 audio stream
  \x1b[32mbandcamp\x1b[0m <url>                Extract Bandcamp album & MP3 streams
  \x1b[32mpeertube\x1b[0m <url|id>             Extract federated PeerTube streams
  \x1b[32mmediaccc\x1b[0m <slug|url>           Extract media.ccc.de conference streams
  \x1b[32mmirrors\x1b[0m                       Benchmark fallback Invidious/Piped mirrors

Examples:
  zenpipe stream jNQXAC9IVRw
  zenpipe download jNQXAC9IVRw -q 720p
  zenpipe download jNQXAC9IVRw -q audio
  zenpipe trending US music
  zenpipe server --port 3333
`);
}

async function run() {
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'server': {
        let port = 3333;
        const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
        if (portIdx !== -1 && args[portIdx + 1]) {
          port = parseInt(args[portIdx + 1], 10) || 3333;
        }
        console.log(`\x1b[36m⚡ Starting ZenPipe Server on http://localhost:${port}...\x1b[0m`);
        process.env.PORT = String(port);
        const serverPath = path.join(ROOT_DIR, 'server.ts');
        const child = spawn(process.execPath, ['--experimental-strip-types', serverPath], {
          stdio: 'inherit',
          cwd: ROOT_DIR,
          env: process.env,
        });
        child.on('exit', (code) => process.exit(code || 0));
        break;
      }

      case 'stream': {
        if (!target) return console.error('\x1b[31mError: Missing video ID or URL\x1b[0m');
        console.log(`\x1b[36mFetching stream for "${target}"...\x1b[0m`);
        const stream = await ZenTube.extract(target);
        console.log(`\n\x1b[1m${stream.title}\x1b[0m`);
        console.log(`Platform: ${stream.platform} | Author: ${stream.uploader} | Views: ${stream.viewCount?.toLocaleString() || 'N/A'}`);
        console.log(`Duration: ${formatDuration(stream.duration || 0)}`);
        if (stream.videoStreams?.length) {
          console.log(`\n\x1b[32mVideo Streams (${stream.videoStreams.length}):\x1b[0m`);
          for (const v of stream.videoStreams.slice(0, 5)) {
            console.log(` - ${v.resolution || v.quality} [${v.mimeType || 'video/mp4'}] -> ${v.url.slice(0, 80)}...`);
          }
        }
        if (stream.audioStreams?.length) {
          console.log(`\n\x1b[32mAudio Streams (${stream.audioStreams.length}):\x1b[0m`);
          for (const a of stream.audioStreams.slice(0, 3)) {
            console.log(` - ${a.format || 'audio'} (${a.bitrate ? Math.round(a.bitrate / 1000) + 'kbps' : 'HQ'}) -> ${a.url.slice(0, 80)}...`);
          }
        }
        break;
      }

      case 'download': {
        if (!target) return console.error('\x1b[31mError: Missing video ID or URL\x1b[0m');
        let quality = '720p';
        if (args.includes('--quality')) quality = args[args.indexOf('--quality') + 1] || '720p';
        if (args.includes('-q')) quality = args[args.indexOf('-q') + 1] || '720p';
        let outDir = process.cwd();
        if (args.includes('--out')) outDir = args[args.indexOf('--out') + 1] || process.cwd();
        if (args.includes('-o')) outDir = args[args.indexOf('-o') + 1] || process.cwd();

        console.log(`\x1b[36mResolving download streams for ${target} (${quality})...\x1b[0m`);
        const stream = await ZenTube.getStreamWithFallback(target);
        console.log(`Downloading: \x1b[1m${stream.title}\x1b[0m`);

        const filePath = await ZenTube.downloader.downloadStream(stream, {
          quality: quality,
          outputDir: outDir,
          onProgress: (p) => {
            const bar = '█'.repeat(Math.round(p.percent / 5)) + '░'.repeat(20 - Math.round(p.percent / 5));
            const mb = (p.downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = p.totalBytes ? (p.totalBytes / (1024 * 1024)).toFixed(1) + 'MB' : '???';
            process.stdout.write(`\r  [${bar}] ${p.percent}% (${mb}/${totalMb})`);
          },
        });
        console.log(`\n\x1b[32m✓ Download completed successfully!\x1b[0m`);
        console.log(`Saved to: ${filePath}`);
        break;
      }

      case 'search': {
        if (!target) return console.error('\x1b[31mError: Missing search query\x1b[0m');
        const query = [target, extra].filter(Boolean).join(' ');
        console.log(`\x1b[36mSearching for "${query}"...\x1b[0m`);
        const results = await ZenTube.search(query);
        console.log(`Found ${results.items.length} items:\n`);
        results.items.slice(0, 10).forEach((item, idx) => {
          console.log(`[${idx + 1}] \x1b[1m${item.title}\x1b[0m`);
          console.log(`    Channel: ${item.channelName} | ${item.viewCountText || ''} | ${item.durationText || ''}`);
          console.log(`    URL: https://youtube.com/watch?v=${item.id}\n`);
        });
        break;
      }

      case 'trending': {
        const region = target || 'US';
        const category = extra || 'all';
        console.log(`\x1b[36mFetching Trending [${region} - ${category}]...\x1b[0m`);
        const feed = await ZenTube.getTrending(category, region);
        console.log(`Found ${feed.items.length} trending items:\n`);
        feed.items.slice(0, 10).forEach((item, idx) => {
          console.log(`[#${idx + 1}] \x1b[1m${item.title}\x1b[0m`);
          console.log(`     ${item.channelName} • ${item.viewCountText || ''} • ${item.durationText || ''}`);
          console.log(`     https://youtube.com/watch?v=${item.id}\n`);
        });
        break;
      }

      case 'shorts': {
        const channel = target || '@NoCopyrightSounds';
        console.log(`\x1b[36mExtracting Shorts feed for ${channel}...\x1b[0m`);
        const shorts = await ZenTube.getShorts(channel);
        console.log(`Extracted ${shorts.items.length} shorts:\n`);
        shorts.items.slice(0, 10).forEach((s, idx) => {
          console.log(`[${idx + 1}] \x1b[1m${s.title}\x1b[0m (${s.viewCountText || ''})`);
          console.log(`    https://youtube.com/shorts/${s.id}\n`);
        });
        break;
      }

      case 'suggest': {
        if (!target) return console.error('\x1b[31mError: Missing query\x1b[0m');
        const q = [target, extra].filter(Boolean).join(' ');
        const suggestions = await ZenTube.getSuggestions(q);
        console.log(`\x1b[32mSuggestions for "${q}":\x1b[0m`);
        suggestions.forEach((s) => console.log(`  • ${s}`));
        break;
      }

      case 'transcript': {
        if (!target) return console.error('\x1b[31mError: Missing video ID\x1b[0m');
        const trans = await ZenTube.getTranscript(target);
        console.log(`\x1b[32mTranscript (${trans.length} segments):\x1b[0m\n`);
        trans.slice(0, 15).forEach((t) => {
          console.log(`[${t.start}] ${t.text}`);
        });
        if (trans.length > 15) console.log(`... and ${trans.length - 15} more cues.`);
        break;
      }

      case 'subtitles': {
        if (!target) return console.error('\x1b[31mError: Missing video ID\x1b[0m');
        const fmt = extra || 'srt';
        const stream = await ZenTube.getStream(target);
        if (!stream.subtitles?.length) return console.log('No subtitles available for this video.');
        const subContent = await ZenTube.convertSubtitles(stream.subtitles[0].baseUrl, fmt);
        console.log(subContent);
        break;
      }

      case 'mirrors': {
        console.log(`\x1b[36mBenchmarking federated Invidious & Piped mirrors...\x1b[0m`);
        const results = await ZenTube.mirrors.benchmarkAll();
        console.table(
          results.map((r) => ({
            Instance: r.name,
            Type: r.type,
            Status: r.healthy ? '✓ Online' : '✗ Offline',
            Latency: r.latencyMs !== null ? `${r.latencyMs}ms` : 'TIMEOUT',
          }))
        );
        break;
      }

      default:
        console.log(`\x1b[31mUnknown command: "${command}"\x1b[0m\n`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n\x1b[31m[ZenPipe Error]: ${err.message || err}\x1b[0m`);
    process.exit(1);
  }
}

run();
