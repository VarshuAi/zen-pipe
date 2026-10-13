#!/usr/bin/env node

/**
 * ZenTube CLI - Multi-Platform Media Extractor
 * Supports YouTube, SoundCloud, Bandcamp, Transcripts, Shorts & Downloader
 */

import { ZenTube } from '../src/index.ts';
import { formatDuration } from '../src/utils/helper.ts';

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const extra = args.slice(2).join(' ');

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mZenTube Multi-Platform Extractor CLI\x1b[0m (NewPipe Inspired)
=====================================================
Usage:
  node bin/zentube.js <command> [target] [extra]

Universal & YouTube Commands:
  \x1b[32mstream\x1b[0m <url|id>            Universal extract (YouTube, SoundCloud, Bandcamp)
  \x1b[32msearch\x1b[0m <query>             Search YouTube for videos, channels, playlists
  \x1b[32msuggest\x1b[0m <query>            Get search autocomplete suggestions
  \x1b[32mchannel\x1b[0m <handle|id>        Extract channel profile & uploads
  \x1b[32mplaylist\x1b[0m <url|id>         Extract playlist tracks
  \x1b[32mcomments\x1b[0m <url|id>         Extract live comments
  \x1b[32mtranscript\x1b[0m <videoId>       Extract timestamped full-text transcript
  \x1b[32msubtitles\x1b[0m <id> [format]    Convert subtitles to srt | vtt | text
  \x1b[32mshorts\x1b[0m                     Extract YouTube Shorts reel feed

SoundCloud & Bandcamp Commands:
  \x1b[32msoundcloud\x1b[0m <trackUrl>      Extract SoundCloud track & MP3 audio stream
  \x1b[32msc-search\x1b[0m <query>          Search SoundCloud tracks
  \x1b[32mbandcamp\x1b[0m <albumUrl>        Extract Bandcamp album, tracklist & MP3 streams

PeerTube & MediaCCC Commands:
  \x1b[32mpeertube\x1b[0m <url|id>          Extract PeerTube video streams & metadata
  \x1b[32mpt-search\x1b[0m <query>          Search PeerTube videos
  \x1b[32mmediaccc\x1b[0m <slug|url>        Extract media.ccc.de conference event & CDN streams
  \x1b[32mccc-search\x1b[0m <query>        Search media.ccc.de events

Feeds, Related & Subscriptions:
  \x1b[32mrelated\x1b[0m <videoId>           Extract YouTube related stream recommendations
  \x1b[32mfeed\x1b[0m <channel>             Fetch channel Atom/RSS feed without rate limits
  \x1b[32mopml-export\x1b[0m                Export default subscriptions to OPML XML

Downloader & Mirrors:
  \x1b[32mdownload\x1b[0m <url|id> [--quality 1080p|720p|audio] [--out <dir>]
                                     Download video/audio with live progress bar
  \x1b[32mmirrors\x1b[0m                            Benchmark Invidious & Piped fallback mirrors

Examples:
  node bin/zentube.js stream jNQXAC9IVRw
  node bin/zentube.js download jNQXAC9IVRw --quality 720p
  node bin/zentube.js download jNQXAC9IVRw --quality audio
  node bin/zentube.js mirrors
  node bin/zentube.js peertube 52364
  node bin/zentube.js mediaccc bob11-2026-swift-ui-chakravarty
  node bin/zentube.js feed @NoCopyrightSounds
  node bin/zentube.js related jNQXAC9IVRw
`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'stream': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing URL or ID.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Extracting stream: ${target}...`);
        const info = await ZenTube.extract(target);

        console.log('\n\x1b[1m\x1b[32m=== STREAM DETAILS ===\x1b[0m');
        console.log(`Platform:    ${info.platform.toUpperCase()}`);
        console.log(`Title:       ${info.title}`);
        console.log(`Uploader:    ${info.uploader.name} (${info.uploader.url || ''})`);
        console.log(`Duration:    ${formatDuration(info.duration)} (${info.duration}s)`);
        console.log(`Views:       ${info.viewCount.toLocaleString()}`);

        if (info.audioStreams.length > 0) {
          console.log(`\n\x1b[1m\x1b[33m=== AUDIO STREAMS (${info.audioStreams.length}) ===\x1b[0m`);
          info.audioStreams.slice(0, 5).forEach(a => {
            console.log(`  • ${a.container.toUpperCase()} | ${(Math.round(a.bitrate / 1000) + ' kbps').padEnd(9)} | ${a.audioSampleRate}Hz | ${a.audioQuality}`);
            console.log(`    URL: ${a.url.slice(0, 95)}...`);
          });
        }

        if (info.videoStreams.length > 0) {
          console.log(`\n\x1b[1m\x1b[36m=== VIDEO STREAMS (${info.videoStreams.length}) ===\x1b[0m`);
          info.videoStreams.slice(0, 6).forEach(v => {
            console.log(`  • itag ${v.itag} | ${v.resolution} | ${v.fps}fps | ${v.container.toUpperCase()} | ${(Math.round(v.bitrate / 1000) + ' kbps')}`);
            console.log(`    URL: ${v.url.slice(0, 95)}...`);
          });
        }
        break;
      }

      case 'transcript': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing video ID.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Fetching transcript for: ${target}...`);
        const cues = await ZenTube.getTranscript(target);
        console.log(`\n\x1b[1m\x1b[32m=== TRANSCRIPT (${cues.length} segments) ===\x1b[0m`);
        cues.forEach(c => {
          console.log(`  \x1b[36m[${c.timeFormatted}]\x1b[0m ${c.text}`);
        });
        break;
      }

      case 'subtitles': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing video ID.');
          process.exit(1);
        }
        const format = extra || 'vtt';
        console.log(`\x1b[34m[ZenTube]\x1b[0m Exporting subtitles for ${target} in ${format.toUpperCase()} format...`);
        const stream = await ZenTube.getStream(target);
        if (!stream.subtitles || stream.subtitles.length === 0) {
          console.log('No subtitle tracks found for this video.');
          return;
        }
        const converted = await ZenTube.convertSubtitles(stream.subtitles[0].baseUrl, format);
        console.log(`\n\x1b[1m\x1b[32m=== SUBTITLES OUTPUT ===\x1b[0m\n`);
        console.log(converted.slice(0, 500) + '...\n');
        break;
      }

      case 'shorts': {
        console.log(`\x1b[34m[ZenTube]\x1b[0m Fetching YouTube Shorts feed...`);
        const feed = await ZenTube.getShorts();
        console.log(`\n\x1b[1m\x1b[32m=== SHORTS FEED (${feed.items.length} items) ===\x1b[0m`);
        feed.items.slice(0, 10).forEach((item, i) => {
          console.log(`  ${i + 1}. \x1b[1m${item.title}\x1b[0m (${item.id})`);
          console.log(`     Channel: ${item.channelName} | Views: ${item.viewCountText || ''}`);
        });
        break;
      }

      case 'soundcloud': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing SoundCloud URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Extracting SoundCloud track: ${target}...`);
        const track = await ZenTube.soundcloud.getTrack(target);
        console.log(`\n\x1b[1m\x1b[32m=== SOUNDCLOUD TRACK ===\x1b[0m`);
        console.log(`Title:    ${track.title}`);
        console.log(`Artist:   ${track.uploader.name}`);
        console.log(`Duration: ${formatDuration(track.duration)}`);
        console.log(`Plays:    ${track.viewCount.toLocaleString()}`);
        if (track.audioStreams[0]) {
          console.log(`\nMP3 Stream: ${track.audioStreams[0].url}`);
        }
        break;
      }

      case 'sc-search': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing search query.');
          process.exit(1);
        }
        const query = [target, extra].filter(Boolean).join(' ');
        console.log(`\x1b[34m[ZenTube]\x1b[0m Searching SoundCloud for: "${query}"...`);
        const res = await ZenTube.soundcloud.search(query);
        console.log(`\nFound ${res.items.length} SoundCloud tracks:`);
        res.items.slice(0, 10).forEach((t, i) => {
          // @ts-ignore
          console.log(`  ${i + 1}. \x1b[1m${t.title}\x1b[0m by ${t.artist} [${t.durationText || ''}]`);
          // @ts-ignore
          if (t.streamUrl) console.log(`     URL: ${t.streamUrl}`);
        });
        break;
      }

      case 'bandcamp': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing Bandcamp URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Extracting Bandcamp: ${target}...`);
        const album = await ZenTube.bandcamp.getAlbum(target);
        console.log(`\n\x1b[1m\x1b[32m=== BANDCAMP ALBUM ===\x1b[0m`);
        console.log(`Title:    ${album.title}`);
        console.log(`Artist:   ${album.artist}`);
        console.log(`Tracks:   ${album.tracks.length}`);
        console.log(`\nTrack Listing:`);
        album.tracks.slice(0, 15).forEach(t => {
          console.log(`  ${(t.trackNum || '•').toString().padEnd(2)} ${t.title.padEnd(45)} [${formatDuration(t.duration)}]`);
          if (t.streamUrl) console.log(`     Stream: ${t.streamUrl.slice(0, 80)}...`);
        });
        break;
      }

      case 'peertube': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing PeerTube ID or URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Extracting PeerTube video: ${target}...`);
        const vid = await ZenTube.peertube.getVideo(target);
        console.log(`\n\x1b[1m\x1b[32m=== PEERTUBE VIDEO ===\x1b[0m`);
        console.log(`Title:       ${vid.name}`);
        console.log(`Channel:     ${vid.channel.displayName} (${vid.channel.url})`);
        console.log(`Duration:    ${formatDuration(vid.duration)} (${vid.duration}s)`);
        console.log(`Views:       ${vid.views.toLocaleString()}`);
        console.log(`Instance:    ${vid.instanceHost}`);
        console.log(`\nStreams (${vid.files.length}):`);
        vid.files.forEach(f => {
          console.log(`  • ${f.resolution.label.padEnd(6)} | ${(f.size ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : '').padEnd(10)} | ${f.fps}fps | ${f.fileUrl}`);
        });
        break;
      }

      case 'pt-search': {
        const query = [target, extra].filter(Boolean).join(' ');
        console.log(`\x1b[34m[ZenTube]\x1b[0m Searching PeerTube for: "${query}"...`);
        const res = await ZenTube.peertube.search(query);
        console.log(`\nFound ${res.items.length} PeerTube videos:`);
        res.items.slice(0, 10).forEach((v, i) => {
          console.log(`  ${i + 1}. \x1b[1m${v.title}\x1b[0m [${v.durationText || ''}] - ${v.uploader.name}`);
          console.log(`     ID: ${v.id}`);
        });
        break;
      }

      case 'mediaccc': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing media.ccc.de event slug or URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Extracting MediaCCC event: ${target}...`);
        const ev = await ZenTube.mediaccc.getEvent(target);
        console.log(`\n\x1b[1m\x1b[32m=== MEDIACCC EVENT ===\x1b[0m`);
        console.log(`Title:       ${ev.title}`);
        console.log(`Conference:  ${ev.conferenceTitle || ev.conferenceSlug || ''}`);
        console.log(`Duration:    ${formatDuration(ev.duration)} (${ev.duration}s)`);
        console.log(`Speakers:    ${ev.persons.join(', ') || 'N/A'}`);
        console.log(`\nRecordings (${ev.recordings.length}):`);
        ev.recordings.forEach(r => {
          console.log(`  • ${(r.resolution || r.mimeType).padEnd(14)} | ${(r.language || 'und').padEnd(4)} | ${(r.sizeMb ? r.sizeMb + ' MB' : '').padEnd(8)} | ${r.streamUrl}`);
        });
        break;
      }

      case 'ccc-search': {
        const query = [target, extra].filter(Boolean).join(' ');
        console.log(`\x1b[34m[ZenTube]\x1b[0m Searching media.ccc.de for: "${query}"...`);
        const res = await ZenTube.mediaccc.search(query);
        console.log(`\nFound ${res.items.length} MediaCCC events:`);
        res.items.slice(0, 10).forEach((e, i) => {
          console.log(`  ${i + 1}. \x1b[1m${e.title}\x1b[0m [${e.durationText || ''}] - ${e.uploader.name}`);
          console.log(`     Slug: ${e.id}`);
        });
        break;
      }

      case 'related': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing video ID.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Fetching recommendations for: ${target}...`);
        const related = await ZenTube.getRelated(target);
        console.log(`\nFound ${related.length} recommended videos:`);
        related.slice(0, 10).forEach((r, i) => {
          console.log(`  ${i + 1}. \x1b[1m${r.title}\x1b[0m (${r.id})`);
          console.log(`     Channel: ${r.uploaderName} | ${r.duration || ''} | ${r.viewCountText || ''}`);
        });
        break;
      }

      case 'feed': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing channel handle or ID.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Fetching Atom RSS feed for: ${target}...`);
        const feed = await ZenTube.getFeed(target);
        console.log(`\n\x1b[1m\x1b[32m=== CHANNEL FEED: ${feed.title} ===\x1b[0m`);
        console.log(`Channel ID: ${feed.channelId}`);
        console.log(`Latest Videos (${feed.items.length}):`);
        feed.items.forEach((item, i) => {
          console.log(`  ${i + 1}. \x1b[1m${item.title}\x1b[0m (${item.id})`);
          console.log(`     Published: ${item.published} | Views: ${item.views?.toLocaleString() || 'N/A'}`);
        });
        break;
      }

      case 'opml-export': {
        console.log(`\x1b[34m[ZenTube]\x1b[0m Exporting sample subscriptions as OPML XML...`);
        const sampleSubs = [
          { serviceId: 0, serviceName: 'youtube', url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg', name: 'NoCopyrightSounds' },
          { serviceId: 2, serviceName: 'peertube', url: 'https://peertube.tv/video-channels/framasoft', name: 'Framasoft' },
        ];
        const opml = ZenTube.subscriptions.exportOpml(sampleSubs);
        console.log(opml);
        break;
      }

      case 'sponsorblock': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing YouTube video ID or URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Querying SponsorBlock for: ${target}...`);
        const segments = await ZenTube.getSponsorSegments(target);
        console.log(`\n\x1b[1m\x1b[32m=== SPONSORBLOCK SEGMENTS (${segments.length}) ===\x1b[0m`);
        if (segments.length === 0) {
          console.log('No sponsor segments reported for this video.');
        } else {
          segments.forEach((s, idx) => {
            console.log(`  ${idx + 1}. [${s.category.toUpperCase()}] ${s.startTime}s - ${s.endTime}s (${s.duration}s duration) | Votes: ${s.votes}`);
          });
        }
        break;
      }

      case 'dislikes': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Missing YouTube video ID or URL.');
          process.exit(1);
        }
        console.log(`\x1b[34m[ZenTube]\x1b[0m Fetching Return YouTube Dislike (RYD) data for: ${target}...`);
        const d = await ZenTube.getDislikes(target);
        console.log(`\n\x1b[1m\x1b[32m=== RATINGS & DISLIKE METRICS ===\x1b[0m`);
        console.log(`Likes:       ${d.likes.toLocaleString()} (${d.likePercentage}%)`);
        console.log(`Dislikes:    ${d.dislikes.toLocaleString()} (${d.dislikePercentage}%)`);
        console.log(`Rating:      ${d.rating} / 5.0 ⭐`);
        console.log(`Ratio:       [${'='.repeat(Math.round(d.likePercentage / 5))}${' '.repeat(20 - Math.round(d.likePercentage / 5))}]`);
        break;
      }

      case 'download': {
        if (!target) {
          console.error('\x1b[31mError:\x1b[0m Usage: node bin/zentube.js download <url|id> [--quality 1080p|720p|audio] [--out <dir>]');
          process.exit(1);
        }

        // Check if legacy direct streamUrl download: target starts with http AND extra is a file path
        if (target.startsWith('http') && extra && !extra.startsWith('--') && (extra.endsWith('.mp4') || extra.endsWith('.m4a') || extra.endsWith('.mp3'))) {
          console.log(`\x1b[34m[ZenTube]\x1b[0m Downloading stream to: ${extra}...`);
          await ZenTube.download(target, extra, (prog) => {
            const mb = (prog.bytesDownloaded / (1024 * 1024)).toFixed(1);
            const totalMb = (prog.totalBytes / (1024 * 1024)).toFixed(1);
            const speed = (prog.speedBytesPerSec / 1024).toFixed(0);
            process.stdout.write(`\rDownloading: ${prog.percent}% (${mb}/${totalMb} MB) @ ${speed} KB/s`);
          });
          console.log('\n\x1b[32mDownload completed successfully!\x1b[0m');
          break;
        }

        // Parse quality and output directory flags
        let quality = '720p';
        let outDir = process.cwd();
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--quality' && args[i + 1]) {
            quality = args[i + 1];
            i++;
          } else if (args[i] === '--out' && args[i + 1]) {
            outDir = args[i + 1];
            i++;
          } else if (['1080p', '720p', '360p', 'audio', 'mp3', 'm4a'].includes(args[i])) {
            quality = args[i];
          }
        }

        console.log(`\x1b[34m[ZenTube]\x1b[0m Resolving stream for "${target}" (requested: \x1b[36m${quality}\x1b[0m)...`);
        const stream = await ZenTube.getStreamWithFallback(target);
        console.log(`\x1b[32m[ZenTube]\x1b[0m Title: \x1b[1m${stream.title}\x1b[0m`);
        const selection = ZenTube.selectFormat(stream, quality);
        console.log(`\x1b[34m[ZenTube]\x1b[0m Selected format: \x1b[33m${selection.qualityLabel}\x1b[0m (${selection.filename})`);

        await ZenTube.downloadMedia(stream, {
          quality,
          outputDir: outDir,
          onProgress: (prog) => {
            const mb = (prog.bytesDownloaded / (1024 * 1024)).toFixed(1);
            const totalMb = prog.totalBytes > 0 ? (prog.totalBytes / (1024 * 1024)).toFixed(1) : '?';
            const speed = (prog.speedBytesPerSec / 1024).toFixed(0);
            process.stdout.write(`\r[${selection.qualityLabel}] Downloading: ${prog.percent}% (${mb}/${totalMb} MB) @ ${speed} KB/s`);
          },
        });
        console.log(`\n\x1b[32m✓ Download completed successfully!\x1b[0m Saved to: ${selection.filename}`);
        break;
      }

      case 'mirrors': {
        console.log(`\x1b[34m[ZenTube]\x1b[0m Benchmarking Invidious & Piped fallback mirrors...`);
        const mirrors = await ZenTube.mirrors.checkAllMirrors(3500);
        console.log('\n\x1b[1m\x1b[32m=== ZENTUBE FALLBACK MIRROR HEALTH BENCHMARK ===\x1b[0m\n');
        console.log('INSTANCE NAME'.padEnd(28) + 'TYPE'.padEnd(12) + 'LATENCY'.padEnd(12) + 'STATUS');
        console.log('─'.repeat(65));
        mirrors.forEach((m) => {
          const status = m.healthy ? '\x1b[32mONLINE ✓\x1b[0m' : '\x1b[31mOFFLINE ✗\x1b[0m';
          const latency = m.healthy ? `${m.latencyMs} ms` : '--';
          console.log(`${m.name.padEnd(28)}${m.type.padEnd(12)}${latency.padEnd(12)}${status}`);
          console.log(`  \x1b[90m${m.url}\x1b[0m`);
        });
        const onlineCount = mirrors.filter(m => m.healthy).length;
        console.log(`\n\x1b[1mSummary:\x1b[0m ${onlineCount}/${mirrors.length} mirrors active and healthy for automatic failover.\n`);
        break;
      }

      case 'search': {
        const query = [target, extra].filter(Boolean).join(' ');
        const results = await ZenTube.search(query);
        console.log(`\nFound ${results.items.length} results for "${query}":`);
        results.items.slice(0, 10).forEach((item, idx) => {
          if (item.type === 'video') {
            console.log(`  ${idx + 1}. [VIDEO] ${item.title} (${item.id}) - ${item.uploader.name}`);
          } else if (item.type === 'channel') {
            console.log(`  ${idx + 1}. [CHANNEL] ${item.name} (${item.id})`);
          } else if (item.type === 'playlist') {
            console.log(`  ${idx + 1}. [PLAYLIST] ${item.title} (${item.id})`);
          }
        });
        break;
      }

      default:
        console.error(`Unknown command: "${command}". Run with --help.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31mCommand failed:\x1b[0m`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
