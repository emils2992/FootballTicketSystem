import { User } from 'discord.js';
import { log } from '../vite';

/**
 * Rastgele futbol stadyumu fotoğrafı döndürür
 * Sadece yüksek kaliteli görsel, metin yok
 */
export function getWelcomeImage(): string {
  // Futbol temalı, yüksek çözünürlüklü stadyum görselleri - Discord CDN kullanarak
  const welcomeImages = [
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612736045764688/bayernstadium.jpg", // Allianz Arena
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612736309968998/campnou.jpg", // Camp Nou
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612736557256705/santiagobernabeu.jpg", // Santiago Bernabéu
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612736842244176/oldtrafford.jpg", // Old Trafford
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612737081139330/wembley.jpg", // Wembley
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612737336823935/championsleague.jpg", // Şampiyonlar Ligi
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612737600995428/anfield.jpg", // Anfield
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612737865142292/turkishfootball.jpg", // Türk Milli Takımı
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612738154332190/olympicstadium.jpg", // Olimpiyat Stadyumu
    "https://cdn.discordapp.com/attachments/1107887798536056946/1239612738427117661/sansiro.jpg"  // San Siro
  ];
  
  // Rastgele stadyum görseli seç
  const randomIndex = Math.floor(Math.random() * welcomeImages.length);
  return welcomeImages[randomIndex];
}