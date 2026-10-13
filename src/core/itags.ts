/**
 * ZenTube ITAG Catalog
 * Maps YouTube format IDs (itags) to resolution, container, codec, and track types
 * Reference: NewPipe ItagItem.java & yt-dlp
 */

export interface ItagInfo {
  itag: number;
  type: 'video' | 'audio' | 'video_audio';
  container: 'mp4' | 'webm' | '3gp' | 'm4a' | 'unknown';
  resolution?: string;
  fps?: number;
  audioBitrate?: number;
  videoCodec?: string;
  audioCodec?: string;
}

export const ITAG_MAP: Record<number, ItagInfo> = {
  // Progressive video + audio
  17: { itag: 17, type: 'video_audio', container: '3gp', resolution: '144p', fps: 12, audioBitrate: 24, videoCodec: 'mp4v', audioCodec: 'aac' },
  18: { itag: 18, type: 'video_audio', container: 'mp4', resolution: '360p', fps: 30, audioBitrate: 96, videoCodec: 'avc1.42001E', audioCodec: 'mp4a.40.2' },
  22: { itag: 22, type: 'video_audio', container: 'mp4', resolution: '720p', fps: 30, audioBitrate: 192, videoCodec: 'avc1.64001F', audioCodec: 'mp4a.40.2' },
  36: { itag: 36, type: 'video_audio', container: '3gp', resolution: '240p', fps: 30, audioBitrate: 32, videoCodec: 'mp4v', audioCodec: 'aac' },
  43: { itag: 43, type: 'video_audio', container: 'webm', resolution: '360p', fps: 30, audioBitrate: 128, videoCodec: 'vp8', audioCodec: 'vorbis' },

  // Dash Video Only - MP4 (H.264 / AVC)
  133: { itag: 133, type: 'video', container: 'mp4', resolution: '240p', fps: 30, videoCodec: 'avc1.4d400d' },
  134: { itag: 134, type: 'video', container: 'mp4', resolution: '360p', fps: 30, videoCodec: 'avc1.4d401e' },
  135: { itag: 135, type: 'video', container: 'mp4', resolution: '480p', fps: 30, videoCodec: 'avc1.4d401f' },
  136: { itag: 136, type: 'video', container: 'mp4', resolution: '720p', fps: 30, videoCodec: 'avc1.4d401f' },
  137: { itag: 137, type: 'video', container: 'mp4', resolution: '1080p', fps: 30, videoCodec: 'avc1.640028' },
  160: { itag: 160, type: 'video', container: 'mp4', resolution: '144p', fps: 30, videoCodec: 'avc1.4d400c' },
  264: { itag: 264, type: 'video', container: 'mp4', resolution: '1440p', fps: 30, videoCodec: 'avc1.640032' },
  266: { itag: 266, type: 'video', container: 'mp4', resolution: '2160p', fps: 30, videoCodec: 'avc1.640033' },
  298: { itag: 298, type: 'video', container: 'mp4', resolution: '720p', fps: 60, videoCodec: 'avc1.4d4020' },
  299: { itag: 299, type: 'video', container: 'mp4', resolution: '1080p', fps: 60, videoCodec: 'avc1.64002a' },

  // Dash Video Only - WebM (VP9)
  167: { itag: 167, type: 'video', container: 'webm', resolution: '360p', fps: 30, videoCodec: 'vp9' },
  168: { itag: 168, type: 'video', container: 'webm', resolution: '480p', fps: 30, videoCodec: 'vp9' },
  242: { itag: 242, type: 'video', container: 'webm', resolution: '240p', fps: 30, videoCodec: 'vp9' },
  243: { itag: 243, type: 'video', container: 'webm', resolution: '360p', fps: 30, videoCodec: 'vp9' },
  244: { itag: 244, type: 'video', container: 'webm', resolution: '480p', fps: 30, videoCodec: 'vp9' },
  247: { itag: 247, type: 'video', container: 'webm', resolution: '720p', fps: 30, videoCodec: 'vp9' },
  248: { itag: 248, type: 'video', container: 'webm', resolution: '1080p', fps: 30, videoCodec: 'vp9' },
  271: { itag: 271, type: 'video', container: 'webm', resolution: '1440p', fps: 30, videoCodec: 'vp9' },
  313: { itag: 313, type: 'video', container: 'webm', resolution: '2160p', fps: 30, videoCodec: 'vp9' },
  302: { itag: 302, type: 'video', container: 'webm', resolution: '720p', fps: 60, videoCodec: 'vp9' },
  303: { itag: 303, type: 'video', container: 'webm', resolution: '1080p', fps: 60, videoCodec: 'vp9' },
  308: { itag: 308, type: 'video', container: 'webm', resolution: '1440p', fps: 60, videoCodec: 'vp9' },
  315: { itag: 315, type: 'video', container: 'webm', resolution: '2160p', fps: 60, videoCodec: 'vp9' },

  // Dash Video Only - MP4 (AV1)
  394: { itag: 394, type: 'video', container: 'mp4', resolution: '144p', fps: 30, videoCodec: 'av01.0.00M.08' },
  395: { itag: 395, type: 'video', container: 'mp4', resolution: '240p', fps: 30, videoCodec: 'av01.0.00M.08' },
  396: { itag: 396, type: 'video', container: 'mp4', resolution: '360p', fps: 30, videoCodec: 'av01.0.01M.08' },
  397: { itag: 397, type: 'video', container: 'mp4', resolution: '480p', fps: 30, videoCodec: 'av01.0.04M.08' },
  398: { itag: 398, type: 'video', container: 'mp4', resolution: '720p', fps: 60, videoCodec: 'av01.0.08M.08' },
  399: { itag: 399, type: 'video', container: 'mp4', resolution: '1080p', fps: 60, videoCodec: 'av01.0.08M.08' },
  400: { itag: 400, type: 'video', container: 'mp4', resolution: '1440p', fps: 60, videoCodec: 'av01.0.12M.08' },
  401: { itag: 401, type: 'video', container: 'mp4', resolution: '2160p', fps: 60, videoCodec: 'av01.0.12M.08' },

  // Dash Audio Only - M4A / AAC
  139: { itag: 139, type: 'audio', container: 'm4a', audioBitrate: 48, audioCodec: 'mp4a.40.5' },
  140: { itag: 140, type: 'audio', container: 'm4a', audioBitrate: 128, audioCodec: 'mp4a.40.2' },
  141: { itag: 141, type: 'audio', container: 'm4a', audioBitrate: 256, audioCodec: 'mp4a.40.2' },

  // Dash Audio Only - WebM / Opus
  249: { itag: 249, type: 'audio', container: 'webm', audioBitrate: 50, audioCodec: 'opus' },
  250: { itag: 250, type: 'audio', container: 'webm', audioBitrate: 70, audioCodec: 'opus' },
  251: { itag: 251, type: 'audio', container: 'webm', audioBitrate: 160, audioCodec: 'opus' },
};

export function getItagInfo(itag: number): ItagInfo | undefined {
  return ITAG_MAP[itag];
}
