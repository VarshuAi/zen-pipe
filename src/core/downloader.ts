/**
 * ZenTube Stream Downloader
 * Multi-quality media downloader for offline playback with progress tracking
 * Supports progressive direct streaming, audio isolation, and adaptive muxing
 */

import fs from 'node:fs';
import path from 'node:path';
import type { DownloadProgress, StreamInfo, VideoStream, AudioStream } from '../types.ts';
import { StreamMuxer } from './muxer.ts';

export interface DownloadSelection {
  type: 'progressive' | 'adaptive' | 'audio';
  url?: string;
  videoStream?: VideoStream;
  audioStream?: AudioStream;
  filename: string;
  mimeType: string;
  qualityLabel: string;
}

export class StreamDownloader {
  /**
   * Sanitizes titles into filesystem-safe file names across Windows, Linux, and macOS
   */
  public static sanitizeFilename(title: string): string {
    return title
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'media';
  }

  /**
   * Selects the optimal video or audio stream for the requested quality
   */
  public static selectFormat(stream: StreamInfo, quality = '720p'): DownloadSelection {
    const q = quality.toLowerCase().trim();
    const safeTitle = this.sanitizeFilename(stream.title);

    // Audio-only selection
    if (q === 'audio' || q === 'mp3' || q === 'm4a' || q.includes('audio')) {
      const sortedAudio = [...stream.audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const bestAudio = sortedAudio[0];
      if (!bestAudio) {
        throw new Error('No audio streams available for this media item');
      }
      const ext = bestAudio.container === 'm4a' ? 'm4a' : (bestAudio.container || 'mp3');
      return {
        type: 'audio',
        url: bestAudio.url,
        audioStream: bestAudio,
        filename: `${safeTitle}.${ext}`,
        mimeType: bestAudio.mimeType || 'audio/mp4',
        qualityLabel: `${Math.round((bestAudio.bitrate || 128000) / 1000)}kbps Audio`,
      };
    }

    // 1080p selection (Adaptive muxing required on YouTube)
    if (q === '1080p' || q === '1080' || q === 'best' || q === 'fhd') {
      const progressive1080 = stream.videoStreams.find(
        (v) => v.type === 'video_audio' && (v.resolution === '1080p' || v.height >= 1080)
      );
      if (progressive1080) {
        return {
          type: 'progressive',
          url: progressive1080.url,
          videoStream: progressive1080,
          filename: `${safeTitle} [1080p].mp4`,
          mimeType: progressive1080.mimeType || 'video/mp4',
          qualityLabel: '1080p Progressive',
        };
      }

      const adaptive1080 = stream.videoStreams.find(
        (v) => (v.resolution === '1080p' || v.height >= 1080)
      );
      const sortedAudio = [...stream.audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const bestAudio = sortedAudio[0];

      if (adaptive1080 && bestAudio) {
        return {
          type: 'adaptive',
          url: adaptive1080.url,
          videoStream: adaptive1080,
          audioStream: bestAudio,
          filename: `${safeTitle} [1080p].mp4`,
          mimeType: 'video/mp4',
          qualityLabel: '1080p HD (Muxed)',
        };
      }
    }

    // 720p selection (Preferred standard progressive itag 22)
    if (q === '720p' || q === '720' || q === 'hd') {
      const prog720 = stream.videoStreams.find(
        (v) => v.type === 'video_audio' && (v.resolution === '720p' || v.height === 720 || v.itag === 22)
      );
      if (prog720) {
        return {
          type: 'progressive',
          url: prog720.url,
          videoStream: prog720,
          filename: `${safeTitle} [720p].mp4`,
          mimeType: prog720.mimeType || 'video/mp4',
          qualityLabel: '720p HD Progressive',
        };
      }

      const adaptive720 = stream.videoStreams.find(
        (v) => (v.resolution === '720p' || v.height === 720)
      );
      const sortedAudio = [...stream.audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      if (adaptive720 && sortedAudio[0]) {
        return {
          type: 'adaptive',
          url: adaptive720.url,
          videoStream: adaptive720,
          audioStream: sortedAudio[0],
          filename: `${safeTitle} [720p].mp4`,
          mimeType: 'video/mp4',
          qualityLabel: '720p HD',
        };
      }
    }

    // 360p selection (Low bandwidth progressive itag 18)
    if (q === '360p' || q === '360' || q === 'sd') {
      const prog360 = stream.videoStreams.find(
        (v) => v.type === 'video_audio' && (v.resolution === '360p' || v.height === 360 || v.itag === 18)
      );
      if (prog360) {
        return {
          type: 'progressive',
          url: prog360.url,
          videoStream: prog360,
          filename: `${safeTitle} [360p].mp4`,
          mimeType: prog360.mimeType || 'video/mp4',
          qualityLabel: '360p SD Progressive',
        };
      }
    }

    // Fallback 1: Any progressive video_audio stream
    const anyProgressive = stream.videoStreams.find((v) => v.type === 'video_audio');
    if (anyProgressive) {
      return {
        type: 'progressive',
        url: anyProgressive.url,
        videoStream: anyProgressive,
        filename: `${safeTitle} [${anyProgressive.resolution}].mp4`,
        mimeType: anyProgressive.mimeType || 'video/mp4',
        qualityLabel: `${anyProgressive.resolution} Progressive`,
      };
    }

    // Fallback 2: Any video stream with audio fallback
    if (stream.videoStreams[0]) {
      const v = stream.videoStreams[0];
      const a = stream.audioStreams[0];
      if (a) {
        return {
          type: 'adaptive',
          url: v.url,
          videoStream: v,
          audioStream: a,
          filename: `${safeTitle} [${v.resolution}].mp4`,
          mimeType: 'video/mp4',
          qualityLabel: `${v.resolution} Adaptive`,
        };
      }
      return {
        type: 'progressive',
        url: v.url,
        videoStream: v,
        filename: `${safeTitle} [${v.resolution}].mp4`,
        mimeType: v.mimeType || 'video/mp4',
        qualityLabel: v.resolution,
      };
    }

    // Fallback 3: Audio stream if no video formats exist
    if (stream.audioStreams[0]) {
      const a = stream.audioStreams[0];
      return {
        type: 'audio',
        url: a.url,
        audioStream: a,
        filename: `${safeTitle}.${a.container || 'mp3'}`,
        mimeType: a.mimeType || 'audio/mp4',
        qualityLabel: 'Audio Track',
      };
    }

    throw new Error('No downloadable formats found for this media item');
  }

  /**
   * Downloads a media stream URL to a local destination file
   */
  public static async download(
    streamUrl: string,
    outputPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'com.google.visionos.youtube/1.04(RealityDevice17,1; U; CPU visionOS 26_6_0 like Mac OS X; US)',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download stream: HTTP ${res.status}`);
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    let bytesDownloaded = 0;
    const startTime = Date.now();

    const fileStream = fs.createWriteStream(outputPath);

    if (!res.body) {
      throw new Error('Response body is null');
    }

    // @ts-ignore Node 24 WebStream to NodeStream
    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileStream.write(value);
      bytesDownloaded += value.length;

      if (onProgress) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBytesPerSec = elapsedSec > 0 ? Math.round(bytesDownloaded / elapsedSec) : 0;
        const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percent,
          speedBytesPerSec,
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      fileStream.end();
      fileStream.on('finish', () => resolve());
      fileStream.on('error', reject);
    });

    return outputPath;
  }

  /**
   * Alias for download matching muxer usage
   */
  public static async downloadFile(
    streamUrl: string,
    outputPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    return this.download(streamUrl, outputPath, onProgress);
  }

  /**
   * High-level media downloader: automatically selects optimal streams,
   * muxes adaptive streams when FFmpeg is available (or gracefully falls back),
   * and saves to output directory.
   */
  public static async downloadMedia(
    stream: StreamInfo,
    options: {
      quality?: string;
      outputDir?: string;
      onProgress?: (progress: DownloadProgress) => void;
    } = {}
  ): Promise<{ filePath: string; filename: string; qualityLabel: string }> {
    const quality = options.quality || '720p';
    const outputDir = options.outputDir || process.cwd();
    let selection = this.selectFormat(stream, quality);

    const targetPath = path.join(outputDir, selection.filename);

    if (selection.type === 'adaptive' && selection.videoStream && selection.audioStream) {
      const ffmpegAvailable = await StreamMuxer.isAvailable();
      if (ffmpegAvailable) {
        await StreamMuxer.downloadAndMux(
          selection.videoStream.url,
          selection.audioStream.url,
          targetPath,
          (_step, p) => {
            if (p && options.onProgress) options.onProgress(p);
          }
        );
        return { filePath: targetPath, filename: selection.filename, qualityLabel: selection.qualityLabel };
      } else {
        // Graceful degradation: Fall back to best progressive format
        console.warn('[ZenTube Downloader] FFmpeg not found on PATH. Falling back to progressive format...');
        selection = this.selectFormat(stream, '720p');
      }
    }

    if (!selection.url) {
      throw new Error('Could not resolve direct streaming URL for download');
    }

    await this.download(selection.url, targetPath, options.onProgress);
    return { filePath: targetPath, filename: selection.filename, qualityLabel: selection.qualityLabel };
  }
}
