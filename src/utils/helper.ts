/**
 * ZenTube Helper Utilities
 */

/**
 * Extracts YouTube video ID from various URL formats or returns the ID if already clean
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/(?:v=|\/watch\?v=|\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/shorts/ID or /embed/ID or /v/ID
  const embedMatch = trimmed.match(/\/(?:shorts|embed|v|live)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Extracts Channel ID or Handle from URL or input
 */
export function extractChannelIdOrHandle(input: string): { type: 'id' | 'handle' | 'user'; value: string } | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Handle: @channel
  if (trimmed.startsWith('@')) {
    return { type: 'handle', value: trimmed };
  }
  const handleMatch = trimmed.match(/(?:youtube\.com\/)(@[a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return { type: 'handle', value: handleMatch[1] };
  }

  // Channel ID: UCxxxxxxxx
  const channelMatch = trimmed.match(/(?:channel\/|browse\/)?(UC[a-zA-Z0-9_-]{22})/);
  if (channelMatch) {
    return { type: 'id', value: channelMatch[1] };
  }

  return null;
}

/**
 * Extracts Playlist ID from URL or input
 */
export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return listMatch[1];

  if (/^(?:PL|UU|LL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Parse time string (e.g., "1:23", "12:34:56") into total seconds
 */
export function parseDurationToSeconds(durationText?: string): number {
  if (!durationText) return 0;
  const parts = durationText.split(':').map(p => parseInt(p.trim(), 10));
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Formats seconds into human readable duration string (e.g., "3:45", "1:02:10")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates a random 16-character Content Playback Nonce (CPN)
 * Just like NewPipe generateContentPlaybackNonce()
 */
export function generateCpn(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let cpn = '';
  for (let i = 0; i < 16; i++) {
    cpn += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return cpn;
}
