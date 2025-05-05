import { GuildMember, User } from 'discord.js';
import fetch from 'node-fetch';
import { log } from '../vite';

/**
 * Futbol temalı özel hoşgeldin kartı oluşturur
 * Bu fonksiyon, kullanıcının adını ve profil resmini kullanarak özel bir kart oluşturur
 */
export async function createWelcomeCard(user: User): Promise<string> {
  try {
    // Kullanıcı bilgilerini alıyoruz
    const username = user.username;
    const avatar = user.displayAvatarURL({ size: 256, extension: 'png' });
    
    // Futbol temalı arka plan görselleri
    const backgrounds = [
      "https://i.imgur.com/uRpEUIb.jpg", // San Siro stadyumu - gece görünümü
      "https://i.imgur.com/eLzpM5g.jpg", // Şampiyonlar Ligi stadyumu yukarıdan bakış
      "https://i.imgur.com/0uKOTK9.jpg", // Dolu stadyum tribünü
      "https://i.imgur.com/Ax8GW2c.jpg", // Camp Nou panoramik görünüm
      "https://i.imgur.com/5RZjOoD.jpg"  // Türk Milli Takım stadyumu
    ];
    
    // Rastgele bir arka plan seçiyoruz
    const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    
    // DisCloud API ile özel hoş geldin kartı oluşturma
    const welcomeCardURL = `https://api.discloudbot.com/v2/welcome-image?background=${encodeURIComponent(background)}&text1=${encodeURIComponent(`HOŞGELDİN ${username.toUpperCase()}!`)}&text2=${encodeURIComponent('Futbol RP Ticket Sistemine')}&text3=${encodeURIComponent('En kısa sürede talebin işleme alınacak')}&avatar=${encodeURIComponent(avatar)}&colors=w,o,g&disableFooter=true`;
    
    return welcomeCardURL;
  } catch (error) {
    log(`Hoşgeldin kartı oluşturulurken hata: ${error}`, 'discord');
    // Hata durumunda yedek olarak stadyum görseli döndür
    return "https://i.imgur.com/JczRb7h.jpg";
  }
}

/**
 * Alternatif olarak özelleştirilmiş bir hoşgeldin kartı - API bağlantısı olmadığında kullanılabilir
 * Daha basit ama yine de kullanıcı adı ve avatarını içerir
 */
export function createSimpleWelcomeCard(user: User): string {
  try {
    const username = user.username;
    // Kullanıcının Avatar URL'ini alıyoruz
    const avatarURL = user.displayAvatarURL({ size: 256, extension: 'png' });
    
    // Hoşgeldin mesajı ile avatar URL'ini birleştiren bir URL, basit bir kart oluşturur
    return `https://api.popcat.xyz/welcomecard?background=https://i.imgur.com/LgmMy0g.jpg&text1=HOSGELDIN&text2=${encodeURIComponent(username.toUpperCase())}&text3=Ticket+Sistemi&avatar=${encodeURIComponent(avatarURL)}`;
  } catch (error) {
    log(`Basit hoşgeldin kartı oluşturulurken hata: ${error}`, 'discord');
    return "https://i.imgur.com/T28Ju5d.jpg";
  }
}

/**
 * Diğer bir alternatif API - bunların hepsi Discord embed'e uygun görsel URL'leri döndürür
 */
export function createBackupWelcomeCard(user: User): string {
  const username = encodeURIComponent(user.username);
  const avatar = encodeURIComponent(user.displayAvatarURL({ size: 256, extension: 'png' }));
  
  // Futbol temalı hoşgeldin kartı
  return `https://api.cool-img-api.ml/welcome-card?username=${username}&avatar=${avatar}&background=https://i.imgur.com/sRJXQif.jpg&text_color=white&key_color=#3498db&title=HOSGELDIN%20FUTBOL%20RP`;
}