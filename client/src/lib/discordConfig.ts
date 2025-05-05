// Discord bot configuration
export const BOT_PREFIX = "."; // Default prefix
export const DEFAULT_EMBED_COLOR = "#5865F2"; // Discord blue
export const DEFAULT_ERROR_COLOR = "#ED4245"; // Discord red
export const DEFAULT_SUCCESS_COLOR = "#57F287"; // Discord green

// Discord avatar URLs with fallbacks
export const getAvatarUrl = (discordId: string, avatarHash: string | null) => {
  if (!avatarHash) {
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`;
};

// Ticket categories
export const TICKET_CATEGORIES = [
  { emoji: "⚽", name: "Transfer Talebi", value: "transfer" },
  { emoji: "❗", name: "Hakem Şikayeti", value: "referee" },
  { emoji: "🗣️", name: "Basın Toplantısı", value: "press" },
  { emoji: "⚙️", name: "Lisans Sorunu", value: "license" },
  { emoji: "💥", name: "Acil Durum", value: "emergency" },
];

// Funny responses
export const FUNNY_RESPONSES = [
  "Yetkili şu an çiğ köfte yiyor, azıcık sabır kral.",
  "Bu taleple FIFA'ya bile başvurabilirdin aq.",
  "Scoutlar seni izliyor, düzgün yaz da rezil olmayalım.",
  "Messi olsan bile sıranı beklemen lazım gardaş.",
  "Ronaldo musun olm sen, niye bu kadar acelen var?",
  "Hakem kararına itiraz ediyorsun da VAR'ı mı duymadın?",
  "Transfer piyasası kapalı kardeşim, sezon başını bekle.",
  "Kulübün borçlarını sen mi ödeyeceksin bu maaşla?",
  "Fantezi futbol mu oynuyorsun gerçek hayatmı belli değil.",
  "İmza atmadan önce kontratı okusaydın keşke..."
];

// Mock staff members for demonstration
export const STAFF_MEMBERS = [
  { 
    username: "Yusuf", 
    discordId: "123456789012345678", 
    avatarUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
    isOnline: true,
    role: "Admin"
  },
  { 
    username: "Caner", 
    discordId: "234567890123456789", 
    avatarUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
    isOnline: true,
    role: "Moderator"
  },
  { 
    username: "Ali", 
    discordId: "345678901234567890", 
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
    isOnline: false,
    role: "Moderator"
  }
];
