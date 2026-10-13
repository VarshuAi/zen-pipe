/**
 * ZenTube Comprehensive Multi-Platform Integration Test Suite
 * Validates YouTube, SoundCloud, Bandcamp, Transcripts, Shorts & Subtitles
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ZenTube, StreamDownloader } from '../src/index.ts';
import { extractVideoId, extractChannelIdOrHandle, parseDurationToSeconds, formatDuration } from '../src/utils/helper.ts';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`\x1b[32m  ✓ PASS:\x1b[0m ${testName}`);
    testsPassed++;
  } else {
    console.error(`\x1b[31m  ✗ FAIL:\x1b[0m ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n\x1b[1m=== RUNNING ZENTUBE MULTI-PLATFORM TEST SUITE ===\x1b[0m\n');

  // Test Suite 1: Helper functions
  console.log('\x1b[34m[Suite 1] Utility & Helper Tests\x1b[0m');
  assert(extractVideoId('https://www.youtube.com/watch?v=jNQXAC9IVRw') === 'jNQXAC9IVRw', 'Extract ID from watch URL');
  assert(extractVideoId('https://youtu.be/jNQXAC9IVRw') === 'jNQXAC9IVRw', 'Extract ID from short URL');
  assert(extractVideoId('https://www.youtube.com/shorts/jNQXAC9IVRw') === 'jNQXAC9IVRw', 'Extract ID from shorts URL');
  assert(extractVideoId('jNQXAC9IVRw') === 'jNQXAC9IVRw', 'Extract ID from raw 11-char ID');

  const channelParsed = extractChannelIdOrHandle('@NoCopyrightSounds');
  assert(channelParsed?.type === 'handle' && channelParsed?.value === '@NoCopyrightSounds', 'Extract channel handle');
  assert(parseDurationToSeconds('0:19') === 19, 'Parse duration 0:19');
  assert(parseDurationToSeconds('1:23:45') === 5025, 'Parse duration 1:23:45');
  assert(formatDuration(5025) === '1:23:45', 'Format duration seconds to text');

  // Test Suite 2: Stream Extraction & Playability Verification
  console.log('\n\x1b[34m[Suite 2] YouTube Stream Extractor Tests (Video: jNQXAC9IVRw)\x1b[0m');
  try {
    const stream = await ZenTube.getStream('jNQXAC9IVRw');
    assert(stream.id === 'jNQXAC9IVRw', 'Stream ID matches');
    assert(stream.title.length > 0, `Video title extracted: "${stream.title}"`);
    assert(stream.viewCount > 0, `View count extracted: ${stream.viewCount.toLocaleString()}`);
    assert(stream.audioStreams.length > 0, `Found ${stream.audioStreams.length} audio streams`);
    assert(stream.videoStreams.length > 0, `Found ${stream.videoStreams.length} video streams`);

    // Verify byte-range playability via HTTP range request
    const firstVideo = stream.videoStreams[0];
    if (firstVideo && firstVideo.url) {
      const pingRes = await fetch(firstVideo.url, {
        headers: {
          'Range': 'bytes=0-511',
          'User-Agent': 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
        },
      });
      assert(pingRes.status === 200 || pingRes.status === 206, `Video stream HTTP Range Playable status: ${pingRes.status}`);
    } else {
      assert(false, 'Video stream URL is present and valid');
    }
  } catch (err) {
    assert(false, `Stream extraction should not throw: ${err}`);
  }

  // Test Suite 3: Search Extractor (General & Filtered)
  console.log('\n\x1b[34m[Suite 3] YouTube Search Extractor Tests\x1b[0m');
  try {
    const searchRes = await ZenTube.search('NoCopyrightSounds');
    assert(searchRes.items.length > 0, `Found ${searchRes.items.length} search items`);
    const firstVideo = searchRes.items.find(i => i.type === 'video');
    assert(Boolean(firstVideo && firstVideo.id && firstVideo.title), `First search video valid: "${firstVideo?.title}"`);

    const playlistSearch = await ZenTube.search('NoCopyrightSounds', { type: 'playlist' });
    const plistItem = playlistSearch.items.find(i => i.type === 'playlist');
    assert(Boolean(plistItem && plistItem.id), `Found filtered playlist: "${plistItem?.title}" (${plistItem?.id})`);
  } catch (err) {
    assert(false, `Search should not throw: ${err}`);
  }

  // Test Suite 4: Search Suggestions
  console.log('\n\x1b[34m[Suite 4] Search Suggestions Tests\x1b[0m');
  try {
    const suggestions = await ZenTube.getSuggestions('javascript');
    assert(Array.isArray(suggestions) && suggestions.length > 0, `Found ${suggestions.length} suggestions for "javascript"`);
  } catch (err) {
    assert(false, `Suggestions should not throw: ${err}`);
  }

  // Test Suite 5: Channel Extractor
  console.log('\n\x1b[34m[Suite 5] YouTube Channel Extractor Tests (Handle: @NoCopyrightSounds)\x1b[0m');
  try {
    const channel = await ZenTube.getChannel('@NoCopyrightSounds');
    assert(channel.name.toLowerCase().includes('nocopyrightsounds'), `Channel name matches: "${channel.name}"`);
    assert(channel.tabs.length > 0, `Found channel tabs: [${channel.tabs.join(', ')}]`);
  } catch (err) {
    assert(false, `Channel extraction should not throw: ${err}`);
  }

  // Test Suite 6: Playlist Extractor
  console.log('\n\x1b[34m[Suite 6] YouTube Playlist Extractor Tests\x1b[0m');
  try {
    const plist = await ZenTube.getPlaylist('PLRBp0Fe2Gpgn8Y9qI-p0aTxVtw8onBSFj');
    assert(plist.title.length > 0, `Playlist title extracted: "${plist.title}"`);
    assert(plist.videos.length > 0, `Found ${plist.videos.length} videos in playlist`);
  } catch (err) {
    assert(false, `Playlist extraction should not throw: ${err}`);
  }

  // Test Suite 7: Comments Extractor
  console.log('\n\x1b[34m[Suite 7] YouTube Comments Extractor Tests\x1b[0m');
  try {
    const commentsData = await ZenTube.getComments('jNQXAC9IVRw');
    assert(commentsData.comments.length > 0, `Found ${commentsData.comments.length} comments`);
    assert(Boolean(commentsData.comments[0]?.authorName && commentsData.comments[0]?.content), `Top comment author: "${commentsData.comments[0]?.authorName}"`);
  } catch (err) {
    assert(false, `Comments extraction should not throw: ${err}`);
  }

  // Test Suite 8: Transcripts & Subtitle Converter
  console.log('\n\x1b[34m[Suite 8] Transcript & Subtitle Converter Tests\x1b[0m');
  try {
    const transcript = await ZenTube.getTranscript('jNQXAC9IVRw');
    assert(transcript.length > 0, `Extracted ${transcript.length} transcript segments`);
    assert(Boolean(transcript[0]?.text && transcript[0]?.timeFormatted), `First segment: [${transcript[0]?.timeFormatted}] "${transcript[0]?.text}"`);

    const stream = await ZenTube.getStream('jNQXAC9IVRw');
    if (stream.subtitles[0]) {
      const srt = await ZenTube.convertSubtitles(stream.subtitles[0].baseUrl, 'srt');
      assert(srt.includes('-->'), 'Subtitles successfully converted to SRT format');
    }
  } catch (err) {
    assert(false, `Transcript extraction should not throw: ${err}`);
  }

  // Test Suite 9: YouTube Shorts Feed Extractor
  console.log('\n\x1b[34m[Suite 9] YouTube Shorts Feed Extractor Tests\x1b[0m');
  try {
    const shorts = await ZenTube.getShorts();
    assert(shorts.items.length > 0, `Extracted ${shorts.items.length} Shorts reels`);
    assert(Boolean(shorts.items[0]?.id && shorts.items[0]?.title), `First short: "${shorts.items[0]?.title}" (${shorts.items[0]?.id})`);
  } catch (err) {
    assert(false, `Shorts feed extraction should not throw: ${err}`);
  }

  // Test Suite 10: SoundCloud Extractor
  console.log('\n\x1b[34m[Suite 10] SoundCloud Extractor Tests\x1b[0m');
  try {
    const scSearch = await ZenTube.soundcloud.search('Chillhop');
    assert(scSearch.items.length > 0, `Found ${scSearch.items.length} SoundCloud search tracks`);
    const sampleTrack = scSearch.items[0];
    assert(Boolean(sampleTrack && sampleTrack.id && sampleTrack.title), `Sample SC track: "${sampleTrack?.title}"`);

    if (sampleTrack?.streamUrl) {
      const track = await ZenTube.soundcloud.getTrack(sampleTrack.streamUrl);
      assert(track.title.length > 0, `Extracted SoundCloud track: "${track.title}"`);
      assert(track.audioStreams.length > 0 && track.audioStreams[0].url.length > 0, 'SoundCloud direct MP3 audio stream resolved');
    }
  } catch (err) {
    assert(false, `SoundCloud extraction should not throw: ${err}`);
  }

  // Test Suite 11: Bandcamp Extractor
  console.log('\n\x1b[34m[Suite 11] Bandcamp Extractor Tests\x1b[0m');
  try {
    const albumUrl = 'https://chillhop.bandcamp.com/album/chillhop-essentials-summer-2024';
    const album = await ZenTube.bandcamp.getAlbum(albumUrl);
    assert(album.title.length > 0, `Bandcamp Album: "${album.title}" by ${album.artist}`);
    assert(album.tracks.length > 0, `Found ${album.tracks.length} tracks in Bandcamp album`);
    assert(Boolean(album.tracks[0]?.streamUrl), `Bandcamp MP3 Stream URL available for: "${album.tracks[0]?.title}"`);
  } catch (err) {
    assert(false, `Bandcamp extraction should not throw: ${err}`);
  }

  // Test Suite 12: Universal Router Tests
  console.log('\n\x1b[34m[Suite 12] Universal Router Tests\x1b[0m');
  try {
    const ytStream = await ZenTube.extract('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    assert(ytStream.platform === 'youtube', 'Universal Router resolved YouTube');

    const bcStream = await ZenTube.extract('https://chillhop.bandcamp.com/album/chillhop-essentials-summer-2024');
    assert(bcStream.platform === 'bandcamp', 'Universal Router resolved Bandcamp');

    const ptStream = await ZenTube.extract('https://peertube.tv/w/52364');
    assert(ptStream.platform === 'peertube', 'Universal Router resolved PeerTube');

    const cccStream = await ZenTube.extract('https://media.ccc.de/v/bob11-2026-swift-ui-chakravarty');
    assert(cccStream.platform === 'mediaccc', 'Universal Router resolved MediaCCC');
  } catch (err) {
    assert(false, `Universal Router should not throw: ${err}`);
  }

  // Test Suite 13: PeerTube Extractor
  console.log('\n\x1b[34m[Suite 13] PeerTube Extractor Tests (Instance: peertube.tv)\x1b[0m');
  try {
    const ptVideo = await ZenTube.peertube.getVideo('52364');
    assert(ptVideo.name.length > 0, `PeerTube Video extracted: "${ptVideo.name}"`);
    assert(ptVideo.files.length > 0, `Found ${ptVideo.files.length} direct MP4 video streams`);
    assert(Boolean(ptVideo.files[0]?.fileUrl), `First MP4 stream URL: ${ptVideo.files[0]?.fileUrl.slice(0, 60)}...`);

    const ptSearch = await ZenTube.peertube.search('linux');
    assert(ptSearch.items.length > 0, `Found ${ptSearch.items.length} PeerTube search results`);
  } catch (err) {
    assert(false, `PeerTube extraction should not throw: ${err}`);
  }

  // Test Suite 14: MediaCCC Extractor
  console.log('\n\x1b[34m[Suite 14] MediaCCC Extractor Tests (media.ccc.de)\x1b[0m');
  try {
    const conferences = await ZenTube.mediaccc.getConferences();
    assert(conferences.length > 0, `Retrieved ${conferences.length} CCC conferences`);

    const cccEvent = await ZenTube.mediaccc.getEvent('bob11-2026-swift-ui-chakravarty');
    assert(cccEvent.title === 'SwiftUI is functional', `Event title verified: "${cccEvent.title}"`);
    assert(cccEvent.recordings.length > 0, `Found ${cccEvent.recordings.length} direct CDN recordings`);
    const mp4Rec = cccEvent.recordings.find(r => r.mimeType === 'video/mp4');
    assert(Boolean(mp4Rec && mp4Rec.streamUrl), `Direct CDN MP4 URL: ${mp4Rec?.streamUrl.slice(0, 60)}...`);

    const cccSearch = await ZenTube.mediaccc.search('python');
    assert(cccSearch.items.length > 0, `Found ${cccSearch.items.length} MediaCCC search results`);
  } catch (err) {
    assert(false, `MediaCCC extraction should not throw: ${err}`);
  }

  // Test Suite 15: YouTube Related Streams Extractor
  console.log('\n\x1b[34m[Suite 15] YouTube Related Streams Extractor Tests\x1b[0m');
  try {
    const related = await ZenTube.getRelated('jNQXAC9IVRw');
    assert(Array.isArray(related) && related.length > 0, `Found ${related.length} recommended videos for jNQXAC9IVRw`);
    const firstRel = related[0];
    assert(Boolean(firstRel && firstRel.id && firstRel.title), `First recommended video: "${firstRel?.title}" (${firstRel?.id})`);
  } catch (err) {
    assert(false, `Related streams extraction should not throw: ${err}`);
  }

  // Test Suite 16: YouTube Channel Atom Feed Extractor
  console.log('\n\x1b[34m[Suite 16] YouTube Channel RSS Feed Extractor Tests\x1b[0m');
  try {
    const feed = await ZenTube.getFeed('@NoCopyrightSounds');
    assert(feed.title.includes('NoCopyrightSounds'), `Feed title matches: "${feed.title}"`);
    assert(feed.items.length > 0, `Feed contains ${feed.items.length} recent uploads`);
    assert(Boolean(feed.items[0]?.id && feed.items[0]?.title), `Latest video in feed: "${feed.items[0]?.title}"`);
  } catch (err) {
    assert(false, `Channel feed extraction should not throw: ${err}`);
  }

  // Test Suite 17: Subscription Manager & OPML Round-Trip
  console.log('\n\x1b[34m[Suite 17] Subscription Manager & OPML Round-Trip Tests\x1b[0m');
  try {
    const sampleSubs = [
      { serviceId: 0, serviceName: 'youtube' as const, url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg', name: 'NoCopyrightSounds' },
      { serviceId: 2, serviceName: 'peertube' as const, url: 'https://peertube.tv/video-channels/framasoft', name: 'Framasoft' },
    ];

    const opmlXml = ZenTube.subscriptions.exportOpml(sampleSubs);
    assert(opmlXml.includes('<opml') && opmlXml.includes('NoCopyrightSounds'), 'Exported valid OPML XML document');

    const importedFromOpml = ZenTube.subscriptions.importOpml(opmlXml);
    assert(importedFromOpml.length === 2, `Imported ${importedFromOpml.length} subscriptions from OPML`);
    assert(importedFromOpml[0].name === 'NoCopyrightSounds', 'OPML subscription round-trip integrity preserved');

    const npJson = ZenTube.subscriptions.exportNewPipeJson(sampleSubs);
    assert(npJson.includes('"app_version"') && npJson.includes('NoCopyrightSounds'), 'Exported valid NewPipe JSON backup');

    const importedFromJson = ZenTube.subscriptions.importNewPipeJson(npJson);
    assert(importedFromJson.length === 2, `Imported ${importedFromJson.length} subscriptions from NewPipe JSON`);
    assert(importedFromJson[0].name === 'NoCopyrightSounds', 'NewPipe JSON round-trip integrity preserved');
  } catch (err) {
    assert(false, `Subscription manager should not throw: ${err}`);
  }

  // Test Suite 18: Return YouTube Dislike (RYD) Tests
  console.log('\n\x1b[34m[Suite 18] Return YouTube Dislike (RYD) Tests\x1b[0m');
  try {
    const dislikes = await ZenTube.getDislikes('jNQXAC9IVRw');
    assert(dislikes.id === 'jNQXAC9IVRw', 'Dislike video ID matches');
    assert(dislikes.likes > 1000000, `Likes counter verified: ${dislikes.likes.toLocaleString()}`);
    assert(dislikes.dislikes > 10000, `Estimated dislikes verified: ${dislikes.dislikes.toLocaleString()}`);
    assert(dislikes.likePercentage > 90, `Like percentage verified: ${dislikes.likePercentage}%`);
  } catch (err) {
    assert(false, `Dislikes retrieval should not throw: ${err}`);
  }

  // Test Suite 19: SponsorBlock Integration Tests
  console.log('\n\x1b[34m[Suite 19] SponsorBlock Integration Tests\x1b[0m');
  try {
    const segments = await ZenTube.getSponsorSegments('fX-g6XNrkiA');
    assert(Array.isArray(segments), 'SponsorBlock returns array of segments');
    assert(segments.length > 0, `Found ${segments.length} community segments in test video`);
    const sponsorSeg = segments.find(s => s.category === 'sponsor');
    assert(Boolean(sponsorSeg && sponsorSeg.startTime > 0 && sponsorSeg.endTime > sponsorSeg.startTime), 'Valid sponsor segment bounds detected');

    // Also test video with 0 segments (should return empty array, not throw)
    const emptySegs = await ZenTube.getSponsorSegments('jNQXAC9IVRw');
    assert(Array.isArray(emptySegs), 'Video without sponsor segments returns safe empty array');
  } catch (err) {
    assert(false, `SponsorBlock retrieval should not throw: ${err}`);
  }

  // Test Suite 20: 24/7 Live Stream & HLS Extractor Tests
  console.log('\n\x1b[34m[Suite 20] 24/7 Live Stream & HLS Extractor Tests\x1b[0m');
  try {
    const liveStream = await ZenTube.getStream('s0LLVQeMmtU');
    assert(liveStream.isLive === true, 'Stream correctly identified as 24/7 Live Stream');
    assert(Boolean(liveStream.hlsManifestUrl && liveStream.hlsManifestUrl.includes('.m3u8')), 'Live HLS m3u8 manifest URL detected');
    
    // Verify HLS Manifest is live and valid M3U8 format
    const hlsRes = await fetch(liveStream.hlsManifestUrl!);
    assert(hlsRes.status === 200, `HLS live manifest responded with HTTP ${hlsRes.status}`);
    const hlsBody = await hlsRes.text();
    assert(hlsBody.includes('#EXTM3U'), 'HLS Manifest contains valid #EXTM3U header');
    assert(hlsBody.includes('#EXT-X-STREAM-INF'), 'HLS Manifest contains multi-bitrate adaptive streams');
  } catch (err) {
    assert(false, `Live stream extraction should not throw: ${err}`);
  }

  // Test Suite 21: Fallback Mirror Engine Tests
  console.log('\n\x1b[34m[Suite 21] Fallback Mirror Engine Tests (Invidious & Piped Failover)\x1b[0m');
  try {
    const defaultMirrors = ZenTube.mirrors.getMirrors();
    assert(Array.isArray(defaultMirrors) && defaultMirrors.length >= 5, `Configured ${defaultMirrors.length} default fallback mirror instances`);

    // Benchmark mirrors with timeout
    const benchmarked = await ZenTube.mirrors.checkAllMirrors(3500);
    assert(benchmarked.length === defaultMirrors.length, 'All mirror instances benchmarked');
    
    const online = benchmarked.filter((m) => m.healthy);
    assert(online.length > 0, `At least 1 active healthy mirror detected (${online.length} online, e.g. ${online[0].name} @ ${online[0].latencyMs}ms)`);

    // Verify extraction with fallback wrapper
    const fallbackStream = await ZenTube.getStreamWithFallback('jNQXAC9IVRw');
    assert(fallbackStream.id === 'jNQXAC9IVRw', 'Stream extracted via fallback wrapper');
    assert(fallbackStream.videoStreams.length > 0, 'Fallback stream has valid video streams');
    assert(fallbackStream.audioStreams.length > 0, 'Fallback stream has valid audio streams');
  } catch (err) {
    assert(false, `Fallback mirror engine should not throw: ${err}`);
  }

  // Test Suite 22: Media Downloader Engine Tests
  console.log('\n\x1b[34m[Suite 22] Media Downloader Engine Tests (Multi-Quality & Chunk Storage)\x1b[0m');
  try {
    // Filename sanitizer
    const cleanName = StreamDownloader.sanitizeFilename('ZenTube: Best 4K Music? *Test* / Video | [New]');
    assert(!cleanName.includes(':') && !cleanName.includes('?') && !cleanName.includes('*') && !cleanName.includes('/'), `Filename sanitized: "${cleanName}"`);

    const stream = await ZenTube.getStream('jNQXAC9IVRw');

    // Format selection
    const audioSelection = ZenTube.selectFormat(stream, 'audio');
    assert(audioSelection.type === 'audio', 'Audio format selection identified as audio');
    assert(Boolean(audioSelection.url && audioSelection.url.startsWith('http')), 'Audio stream URL resolved');
    assert(audioSelection.filename.endsWith('.m4a') || audioSelection.filename.endsWith('.mp3'), `Audio filename has audio extension: ${audioSelection.filename}`);

    // Format selection on real historical video (jNQXAC9IVRw)
    const video720Selection = ZenTube.selectFormat(stream, '720p');
    assert(Boolean(video720Selection.filename && video720Selection.url), `720p selection gracefully resolved best format: ${video720Selection.filename}`);

    const video360Selection = ZenTube.selectFormat(stream, '360p');
    assert(Boolean(video360Selection.filename && video360Selection.url), `360p selection resolved format: ${video360Selection.filename}`);

    // Test multi-quality selection with full HD stream tiers
    const fullTierStream: any = {
      title: 'ZenTube High Quality Test',
      videoStreams: [
        { itag: 22, url: 'https://googlevideo.com/demo720', resolution: '720p', type: 'video_audio' },
        { itag: 137, url: 'https://googlevideo.com/demo1080', resolution: '1080p', type: 'video_only' },
        { itag: 18, url: 'https://googlevideo.com/demo360', resolution: '360p', type: 'video_audio' },
      ],
      audioStreams: [
        { itag: 140, url: 'https://googlevideo.com/demoAudio', bitrate: 128000, container: 'm4a', type: 'audio_only' }
      ]
    };
    const fhd = ZenTube.selectFormat(fullTierStream, '1080p');
    assert(fhd.type === 'adaptive' && fhd.filename.includes('1080p'), '1080p adaptive stream format selected');
    const hd = ZenTube.selectFormat(fullTierStream, '720p');
    assert(hd.type === 'progressive' && hd.filename.includes('720p'), '720p progressive format selected');
    const sd = ZenTube.selectFormat(fullTierStream, '360p');
    assert(sd.type === 'progressive' && sd.filename.includes('360p'), '360p progressive format selected');

    // Test real download of audio file to disk with progress callback
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `zentube_test_${Date.now()}.tmp`);
    let progressCallbackFired = false;

    await StreamDownloader.download(audioSelection.url!, tempFile, (p) => {
      if (p.bytesDownloaded > 0) progressCallbackFired = true;
    });

    assert(fs.existsSync(tempFile), 'Downloaded file exists on local filesystem');
    const stat = fs.statSync(tempFile);
    assert(stat.size > 10000, `Downloaded file verified with size > 10KB (${stat.size.toLocaleString()} bytes)`);
    assert(progressCallbackFired === true, 'Download progress tracking callback fired successfully');

    // Clean up
    fs.unlinkSync(tempFile);
    assert(!fs.existsSync(tempFile), 'Temporary download file cleaned up successfully');
  } catch (err) {
    assert(false, `Downloader test should not throw: ${err}`);
  }

  // Final Summary
  console.log('\n======================================================');
  console.log(`\x1b[1mTEST SUMMARY:\x1b[0m Total Passed: \x1b[32m${testsPassed}\x1b[0m | Failed: \x1b[31m${testsFailed}\x1b[0m`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
