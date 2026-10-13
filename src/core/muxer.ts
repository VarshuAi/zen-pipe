/**
 * ZenTube Stream Muxer & Audio/Video Merger
 * Merges separate adaptive video and audio streams using system FFmpeg
 * Inspired by NewPipe's StreamMuxer.java
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StreamDownloader } from './downloader.ts';
import type { DownloadProgress } from '../types.ts';

const execFileAsync = promisify(execFile);

export class StreamMuxer {
  private static ffmpegChecked: boolean | null = null;

  /**
   * Checks if FFmpeg is installed and accessible on PATH
   */
  public static async isAvailable(): Promise<boolean> {
    if (this.ffmpegChecked !== null) return this.ffmpegChecked;
    try {
      await execFileAsync('ffmpeg', ['-version']);
      this.ffmpegChecked = true;
      return true;
    } catch {
      this.ffmpegChecked = false;
      return false;
    }
  }

  /**
   * Muxes local video and audio files into a single destination file
   */
  public static async mux(
    videoFilePath: string,
    audioFilePath: string,
    outputFilePath: string
  ): Promise<void> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        'FFmpeg is not installed or not found on system PATH. Please install FFmpeg to mux separate adaptive video and audio streams.'
      );
    }

    // -c:v copy copies video stream without re-encoding
    // -c:a aac re-encodes audio to standard AAC or copies if compatible
    const args = [
      '-y',
      '-i', videoFilePath,
      '-i', audioFilePath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputFilePath,
    ];

    await execFileAsync('ffmpeg', args);
  }

  /**
   * Downloads video and audio streams concurrently and muxes them into a single output file
   */
  public static async downloadAndMux(
    videoUrl: string,
    audioUrl: string,
    outputFilePath: string,
    onProgress?: (step: string, progress?: DownloadProgress) => void
  ): Promise<string> {
    const tempDir = os.tmpdir();
    const randId = Math.random().toString(36).slice(2, 9);
    const tempVideo = path.join(tempDir, `zentube_v_${randId}.tmp`);
    const tempAudio = path.join(tempDir, `zentube_a_${randId}.tmp`);

    try {
      onProgress?.('Downloading video stream...');
      await StreamDownloader.downloadFile(videoUrl, tempVideo, (p) => {
        onProgress?.('Downloading video stream...', p);
      });

      onProgress?.('Downloading audio stream...');
      await StreamDownloader.downloadFile(audioUrl, tempAudio, (p) => {
        onProgress?.('Downloading audio stream...', p);
      });

      onProgress?.('Muxing audio and video containers with FFmpeg...');
      await this.mux(tempVideo, tempAudio, outputFilePath);

      onProgress?.('Muxing complete!');
      return outputFilePath;
    } finally {
      // Clean up temporary chunks
      if (fs.existsSync(tempVideo)) fs.unlinkSync(tempVideo);
      if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
    }
  }
}
