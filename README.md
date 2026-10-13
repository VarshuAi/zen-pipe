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
