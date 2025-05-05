/**
 * Utility functions for Discord formatting and interactions
 */

// Format Discord-style timestamps
export function formatDiscordTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// Format relative time (e.g. "5 minutes ago")
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Şimdi';
  if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
  if (diffInHours < 24) return `${diffInHours} saat önce`;
  return `${diffInDays} gün önce`;
}

// Get Discord status color based on status string
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
      return '#57F287';
    case 'idle':
      return '#FEE75C';
    case 'dnd':
      return '#ED4245';
    default:
      return '#747F8D';
  }
}

// Generate Discord-like snowflake ID
export function generateSnowflake(): string {
  const timestamp = BigInt(Date.now() - 1420070400000) << 22n;
  const randomBits = BigInt(Math.floor(Math.random() * 0x400000));
  return (timestamp | randomBits).toString();
}

// Parse Discord mention to get user ID
export function parseUserMention(mention: string): string | null {
  const matches = mention.match(/<@!?(\d+)>/);
  return matches ? matches[1] : null;
}

// Format code block
export function formatCodeBlock(content: string, language: string = ''): string {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

// Escape Discord markdown characters
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`');
}

// Mock Discord status data
export const MOCK_STAFF = [
  {
    id: 1,
    username: 'Yusuf',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5',
    status: 'online'
  },
  {
    id: 2,
    username: 'Caner',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36',
    status: 'online'
  },
  {
    id: 3,
    username: 'Ali',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956',
    status: 'offline'
  }
];

// Mock ticket categories
export const MOCK_CATEGORIES = [
  { id: 1, name: 'Transfer Talebi', emoji: '⚽' },
  { id: 2, name: 'Hakem Şikayeti', emoji: '❗' },
  { id: 3, name: 'Basın Toplantısı', emoji: '🗣️' },
  { id: 4, name: 'Lisans Sorunu', emoji: '⚙️' },
  { id: 5, name: 'Acil Durum', emoji: '💥' }
];

// Mock tickets
export const MOCK_TICKETS = [
  {
    id: 1,
    category: { name: 'Transfer Talebi', emoji: '⚽' },
    status: 'open'
  },
  {
    id: 2,
    category: { name: 'Hakem Şikayeti', emoji: '❗' },
    status: 'closed'
  }
];
