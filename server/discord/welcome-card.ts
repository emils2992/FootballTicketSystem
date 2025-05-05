import { User } from 'discord.js';
import { log } from '../vite';

/**
 * Rastgele futbol stadyumu fotoğrafı döndürür
 * Sadece yüksek kaliteli görsel, metin yok
 */
export function getWelcomeImage(): string {
  // Futbol temalı, yüksek çözünürlüklü stadyum görselleri
  const welcomeImages = [
    "https://i.imgur.com/3C4Fmx0.jpg", // Allianz Arena - Bayern Münih Stadyumu - Gece mavi/kırmızı
    "https://i.imgur.com/PQPbztN.jpg", // Camp Nou - Barcelona Stadyumu - Geniş açı
    "https://i.imgur.com/P3qIls6.jpg", // Santiago Bernabéu - Real Madrid Stadyumu - Panoramik
    "https://i.imgur.com/Xmq3G9i.jpg", // Old Trafford - Manchester United Stadyumu - İç görünüm
    "https://i.imgur.com/Z9UQTsq.jpg", // Wembley Stadyumu - Finaller için büyük stadyum panorama
    "https://i.imgur.com/2hXvyI3.jpg", // Şampiyonlar Ligi Finali - Konfeti ve kupa seremonisi
    "https://i.imgur.com/iI3OWyk.jpg", // Anfield - Liverpool stadyumu gece görünümü 
    "https://i.imgur.com/6IOOY0n.jpg", // Türk Milli Takımı - Stadyum ve Türk bayrağı
    "https://i.imgur.com/S3syhTq.jpg", // Olimpiyat Stadyumu - Kalabalık tribünler ve yeşil saha
    "https://i.imgur.com/s7GCHBD.jpg"  // San Siro - Milan Stadyumu - Gece görünümü
  ];
  
  // Rastgele stadyum görseli seç
  const randomIndex = Math.floor(Math.random() * welcomeImages.length);
  return welcomeImages[randomIndex];
}