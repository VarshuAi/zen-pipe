import { ChatMessage, ChatEmote, ChatBadge } from '../types';

export const EMOTES: ChatEmote[] = [
  {
    code: ':cyan:',
    url: 'https://api.iconify.design/lucide:gem.svg?color=%2300f0ff',
    description: 'Fluxa Cyan Gem',
  },
  {
    code: ':hype:',
    url: 'https://api.iconify.design/lucide:zap.svg?color=%23ffb703',
    description: 'Hype Lightning',
  },
  {
    code: ':fire:',
    url: 'https://api.iconify.design/lucide:flame.svg?color=%23ff4b4b',
    description: 'Lit Fire',
  },
  {
    code: ':gg:',
    url: 'https://api.iconify.design/lucide:trophy.svg?color=%2300ff88',
    description: 'Good Game Trophy',
  },
  {
    code: ':pog:',
    url: 'https://api.iconify.design/lucide:sparkles.svg?color=%23ff007f',
    description: 'Pog Sparks',
  },
  {
    code: ':zen:',
    url: 'https://api.iconify.design/lucide:compass.svg?color=%2338bdf8',
    description: 'Zen Balance',
  },
  {
    code: ':cyber:',
    url: 'https://api.iconify.design/lucide:cpu.svg?color=%23a855f7',
    description: 'Cyber Neural Core',
  },
];

export const BADGE_DEFINITIONS: Record<string, ChatBadge> = {
  mod: { type: 'mod', label: 'MOD', color: '#00ff88' },
  vip: { type: 'vip', label: 'VIP', color: '#ff007f' },
  sub: { type: 'sub', label: 'SUB', color: '#00f0ff' },
  verified: { type: 'verified', label: 'VERIFIED', color: '#38bdf8' },
  creator: { type: 'creator', label: 'HOST', color: '#ffb703' },
};

const USER_COLORS = [
  '#00f0ff', // cyan
  '#ff007f', // neon pink
  '#00ff88', // neon green
  '#ffb703', // neon amber
  '#a855f7', // purple
  '#38bdf8', // sky blue
  '#f43f5e', // rose
  '#4ade80', // mint
  '#e879f9', // violet
  '#2dd4bf', // teal
];

interface ChatterProfile {
  username: string;
  avatar: string;
  color: string;
  badges?: ChatBadge[];
}

const CHATTERS: ChatterProfile[] = [
  {
    username: 'NeonRider99',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    color: '#00f0ff',
    badges: [BADGE_DEFINITIONS.sub, BADGE_DEFINITIONS.vip],
  },
  {
    username: 'KitsuneCode',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    color: '#ff007f',
    badges: [BADGE_DEFINITIONS.mod],
  },
  {
    username: 'QuantumByte',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    color: '#00ff88',
    badges: [BADGE_DEFINITIONS.verified],
  },
  {
    username: 'DriftMaster_X',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80',
    color: '#ffb703',
    badges: [BADGE_DEFINITIONS.sub],
  },
  {
    username: 'AcidBurn_01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    color: '#a855f7',
    badges: [BADGE_DEFINITIONS.vip],
  },
  {
    username: 'ZeroCool',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    color: '#38bdf8',
    badges: [],
  },
  {
    username: 'VaporVibe',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&auto=format&fit=crop&q=80',
    color: '#f43f5e',
    badges: [BADGE_DEFINITIONS.sub],
  },
  {
    username: 'GlitchGoddess',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    color: '#4ade80',
    badges: [BADGE_DEFINITIONS.mod, BADGE_DEFINITIONS.sub],
  },
  {
    username: 'Rustacean_Pro',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80',
    color: '#e879f9',
    badges: [BADGE_DEFINITIONS.sub],
  },
  {
    username: 'CyberSamurai',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=80',
    color: '#2dd4bf',
    badges: [BADGE_DEFINITIONS.vip],
  },
];

const PRESET_MESSAGES = [
  'THIS RUN IS ACTUALLY INSANE :hype: :hype:',
  'CLIP THAT RIGHT NOW OMG :pog:',
  'The reaction time on that flick... absolute machine :fire:',
  'wazzup chat :cyber: how we doing today?',
  'Drop rate buff is real, just got the legendary prismatic skin! :cyan:',
  'GG WP what a tournament match! :gg: :gg:',
  'Can we get some :zen: in the chat for focus',
  'Subbed for 14 months straight, best stream on Fluxa :sub:',
  'Look at that frame timing, rock solid 240 FPS! :fire:',
  'Wait did anyone see that wallbang angle?! :pog: :pog:',
  'WebGL + WebGPU shader compiling in 2ms is wizardry :cyber:',
  'pepega early game but insane clutch in overtime :gg:',
  'That background synth melody is pure serotonin :zen:',
  'MODS can we get a poll for the next loadout? :mod:',
  'Fluxa video player is so clean, zero buffer latency :cyan:',
  'LETS GOOOOO! That is world record pace! :hype:',
  'I was here when the record broke! :pog:',
  'Ranked lobbies cannot handle this playstyle :fire:',
  'Drop the playlist link please!! :zen:',
  'Cheering 250 Sparks! Keep shredding! ✨',
  'Absolute perfection on that curve drift :gg:',
  'The cyber HUD layout is top tier :cyber:',
  'NEO TOKYO CHAMPIONSHIP IS OURS :hype:',
  'Best community in streaming hands down :cyan:',
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    username: 'KitsuneCode',
    avatar: CHATTERS[1].avatar,
    color: CHATTERS[1].color,
    badges: CHATTERS[1].badges,
    message: 'Welcome everyone to the Fluxa live broadcast! Keep it friendly and hype :cyan:',
    timestamp: '19:30',
  },
  {
    id: 'msg-init-2',
    username: 'NeonRider99',
    avatar: CHATTERS[0].avatar,
    color: CHATTERS[0].color,
    badges: CHATTERS[0].badges,
    message: 'Ready for the championship finals! Let us go! :hype: :hype:',
    timestamp: '19:31',
  },
  {
    id: 'msg-init-3',
    username: 'GlitchGoddess',
    avatar: CHATTERS[7].avatar,
    color: CHATTERS[7].color,
    badges: CHATTERS[7].badges,
    message: 'Drops are active! Make sure your Fluxa account is linked! :pog:',
    timestamp: '19:32',
  },
  {
    id: 'msg-init-4',
    username: 'DriftMaster_X',
    avatar: CHATTERS[3].avatar,
    color: CHATTERS[3].color,
    badges: CHATTERS[3].badges,
    message: 'Cheered 500 Sparks! Good luck tonight! ✨',
    timestamp: '19:33',
    isCheer: true,
    sparksAmount: 500,
  },
];

let messageCounter = 100;

export function generateRandomChatMessage(): ChatMessage {
  messageCounter++;
  const chatter = CHATTERS[Math.floor(Math.random() * CHATTERS.length)];
  const messageText = PRESET_MESSAGES[Math.floor(Math.random() * PRESET_MESSAGES.length)];
  const isCheer = Math.random() < 0.12;
  const sparksAmounts = [50, 100, 250, 500, 1000];
  const sparksAmount = isCheer ? sparksAmounts[Math.floor(Math.random() * sparksAmounts.length)] : undefined;

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    id: `msg-sim-${messageCounter}-${Date.now()}`,
    username: chatter.username,
    avatar: chatter.avatar,
    color: chatter.color || USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    badges: chatter.badges,
    message: isCheer ? `Cheered ${sparksAmount} Sparks! ${messageText} ✨` : messageText,
    timestamp,
    isCheer,
    sparksAmount,
  };
}

/**
 * Starts realistic live chat simulation.
 * Emits new messages every 1.5 - 4.0 seconds.
 * Returns a cleanup function to stop simulation.
 */
export function startChatSimulation(onMessage: (msg: ChatMessage) => void): () => void {
  let isRunning = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = () => {
    if (!isRunning) return;
    const delay = Math.floor(Math.random() * 2500) + 1500; // 1.5s to 4.0s
    timerId = setTimeout(() => {
      if (!isRunning) return;
      onMessage(generateRandomChatMessage());
      scheduleNext();
    }, delay);
  };

  scheduleNext();

  return () => {
    isRunning = false;
    if (timerId) clearTimeout(timerId);
  };
}
