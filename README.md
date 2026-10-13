# ZenPipe (ZenTube) ⚡

A high-performance multi-platform streaming media and metadata extraction engine and 1:1 desktop YouTube client with full **NewPipe Extractor** feature and service parity.

ZenPipe enables programmatic extraction of media streams, progressive MP4 files, audio tracks, searchable transcripts, subtitles, playlists, channels, comments, live Atom RSS feeds, SponsorBlock, Return YouTube Dislike (RYD), A-B loopers, Web Audio DSP vocal removers, and OPML subscription management across 5 platforms:
1. **YouTube**
2. **SoundCloud**
3. **Bandcamp**
4. **PeerTube** (Federated instances & video networks)
5. **media.ccc.de** (Chaos Computer Club conference archives & CDN streams)

All extractors run directly on native Node.js 24 without third-party npm dependencies, official API keys, Google Play Services, or user credentials.

---

## 🌟 Platforms & Feature Matrix

| Feature | YouTube | SoundCloud | Bandcamp | PeerTube | media.ccc.de |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Stream Extraction** | Audio (M4A/Opus), Video (144p-4K), DASH & HLS | Direct 128k MP3 streams | Direct 128k MP3 streams | Direct 360p-1080p MP4 & HLS | Direct 576p-1440p MP4, WebM, MP3 & Opus |
| **Bypass Restrictions** | VisionOS InnerTube + `base.js` CipherEngine | Dynamic `client_id` scraper | Direct `data-tralbum` parser | Federated REST API | Public Media API |
| **Search** | Videos, Channels, Playlists + Autocomplete | Tracks, Sets, Artists | Discography & Tracks | Instance & Global search | Event & Conference search |
| **Transcripts & Subtitles** | Timestamped cues + SRT/VTT/Text exporter | — | Track Lyrics | Subtitle tracks | Slides & Timelines |
| **Shorts / Reels** | Vertical 9:16 Shorts reel player with navigation | — | — | — | — |
| **Related / Recommendations** | `/next` secondary results extractor | Related tracks | Related releases | — | Related events |
| **Channel / Artist Feeds** | Canonical handles + Atom RSS Feed | Artist profile & tracks | Artist releases | Video channels & uploads | Conferences & events |
| **Playlists / Sets** | Full tracklists & pagination | Sets & playlists | Full album tracks & art | Channel playlists | Conference playlists |
| **Comments** | Modern ViewModel entity mutations | Track comments | — | Threaded comments | — |
| **Subscription Backups** | OPML XML + NewPipe JSON format | OPML export | OPML export | OPML export | OPML export |
| **Vocal Remover DSP** | Real-time differential phase cancellation karaoke | — | — | — | — |
| **Universal Router** | `ZenTube.extract(url)` automatically routes any supported URL to its native extractor! |
| **FFmpeg Stream Muxer** | `ZenTube.downloadAndMux(videoUrl, audioUrl, outputPath)` merges adaptive video + audio |

---

## 🚀 Quick Start

### Run Live Integration Test Suite (98 / 98 Tests Passing)
```bash
node --experimental-strip-types test/zentube.test.ts
node --experimental-strip-types test/features.test.ts
```

### Start Web Client (1:1 YouTube Desktop Dark Theme)
```bash
node --experimental-strip-types server.ts
```
Open **`http://localhost:3333`** in your browser!

---

## 💻 CLI Usage

```bash
# 1. Universal stream extraction (YouTube, SoundCloud, Bandcamp, PeerTube, MediaCCC)
node bin/zentube.js stream jNQXAC9IVRw
node bin/zentube.js stream "https://peertube.tv/w/52364"
node bin/zentube.js stream "https://media.ccc.de/v/bob11-2026-swift-ui-chakravarty"
node bin/zentube.js stream "https://soundcloud.com/chillhopdotcom/..."
node bin/zentube.js stream "https://chillhop.bandcamp.com/album/..."

# 2. PeerTube & MediaCCC
node bin/zentube.js peertube 52364
node bin/zentube.js pt-search "linux"
node bin/zentube.js mediaccc bob11-2026-swift-ui-chakravarty
node bin/zentube.js ccc-search "python"

# 3. Channel Atom RSS Feed (Zero rate limits, zero auth)
node bin/zentube.js feed "@NoCopyrightSounds"

# 4. Related / Recommended Videos
node bin/zentube.js related jNQXAC9IVRw

# 5. Export Subscriptions to OPML XML
node bin/zentube.js opml-export

# 6. Extract timestamped transcript & convert to SRT
node bin/zentube.js transcript jNQXAC9IVRw
node bin/zentube.js subtitles jNQXAC9IVRw srt

# 7. Extract YouTube Shorts feed
node bin/zentube.js shorts

# 8. Download stream to disk with progress bar
node bin/zentube.js download <streamUrl> ./output.mp4
```

---

## 📦 Programmatic Library API Usage

```typescript
import { ZenTube } from './src/index.ts';

// 1. Universal Extraction (Auto-detects all 5 platforms)
const stream = await ZenTube.extract('https://peertube.tv/w/52364');
console.log(stream.platform, stream.title, stream.videoStreams[0].url);

// 2. PeerTube Service
const ptVideo = await ZenTube.peertube.getVideo('52364');
const ptResults = await ZenTube.peertube.search('linux');

// 3. media.ccc.de Service
const cccEvent = await ZenTube.mediaccc.getEvent('bob11-2026-swift-ui-chakravarty');
const conferences = await ZenTube.mediaccc.getConferences();

// 4. Fast Channel Atom Feed
const feed = await ZenTube.getFeed('@NoCopyrightSounds');
console.log(`Channel ${feed.title} has ${feed.items.length} recent uploads`);

// 5. YouTube Related Recommendations
const related = await ZenTube.getRelated('jNQXAC9IVRw');

// 6. Subscriptions Management (OPML & NewPipe JSON)
const opmlXml = ZenTube.subscriptions.exportOpml(subscriptions);
const importedSubs = ZenTube.subscriptions.importOpml(opmlXml);
const newpipeJson = ZenTube.subscriptions.exportNewPipeJson(subscriptions);

// 7. FFmpeg Stream Muxer (Combine adaptive video + audio)
await ZenTube.downloadAndMux(videoUrl, audioUrl, './video_1080p.mp4');
```

---

## ⚖️ Architectural Comparison to NewPipe Extractor

| Feature | NewPipe Extractor (Java) | ZenPipe (TypeScript / Node.js) |
| :--- | :--- | :--- |
| **Runtime & Language** | Java / JVM (Gradle build) | Native Node.js 24 TypeScript (Zero external npm deps) |
| **Service Coverage** | YouTube, SoundCloud, Bandcamp, PeerTube, media.ccc.de | **All 5 Services Fully Supported** |
| **YouTube Protocol** | Android InnerTube client | VisionOS + Web InnerTube client (anti-throttling bypass) |
| **Cipher Engine** | Rhino JS interpreter executing `base.js` | Native V8 extraction of decipher functions (`swap`, `reverse`, `splice`) |
| **Feeds & Subscriptions**| XML PullParser + OPML parser | Zero-dependency Regex XML stream parser + OPML & NewPipe JSON serializer |
| **Stream Muxing** | External Android MediaMuxer / FFmpeg | Built-in `StreamMuxer` interfacing system FFmpeg |
| **Testing** | JUnit unit tests | Native Node test runner against live endpoints (**98/98 tests passing**) |
| **Frontend Demo** | Android APK | 1:1 Desktop YouTube Clone with Web Audio DSP, RYD, SponsorBlock |
