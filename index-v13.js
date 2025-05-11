// index.js - Porsuk Ticket Bot - Discord.js v13 + Memory Storage with JSON Persistence
const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Permissions, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Express server (Glitch'i uyanık tutmak için)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Porsuk Support Bot çalışıyor!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Son komut kullanım zamanlarını tutacak Map (komut çift çalışma sorununu önlemek için)
const lastCommandTimes = new Map();

// Discord client - Her sunucuda @everyone etiketlenmesini önlemek için allowedMentions ayarını ekledik
const client = new Client({ 
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  // Tüm botun mesajları için @everyone ve @here etiketlerini devre dışı bırak
  allowedMentions: { 
    parse: ['users', 'roles'], // Yalnızca kullanıcı ve rol etiketlerine izin ver
    everyone: false, // @everyone'u devre dışı bırak 
    repliedUser: true // Yanıtlarda kullanıcıyı etiketle
  }
});

// Bot prefix
const PREFIX = '.';

// Hafıza depolaması (Memory Storage)
const memoryStorage = {
  users: new Collection(),
  tickets: new Collection(),
  categories: new Collection(),
  botSettings: new Collection(),
  ticketResponses: new Collection(),
  lastTicketId: 0,
  lastTicketNumbers: new Map(), // Guild ID => Last ticket number
  staffRoles: new Map() // Guild ID => Staff Role ID
};

// JSON dosya yolları
const DATA_DIR = path.join(__dirname, 'data');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const TICKETS_BACKUP_FILE = path.join(DATA_DIR, 'tickets_backup.json');

// JSON verisini disk'ten yükle
function loadDataFromDisk() {
  try {
    // Eğer data klasörü yoksa oluştur
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('Data klasörü oluşturuldu:', DATA_DIR);
    }
    
    // Eğer tickets.json dosyası yoksa, boş bir veri yapısı oluştur ve kaydet
    if (!fs.existsSync(TICKETS_FILE)) {
      const emptyData = {
        tickets: {},
        settings: {},
        lastTicketNumbers: {},
        ticketResponses: {},
        users: {}
      };
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(emptyData, null, 2));
      console.log('Boş tickets.json dosyası oluşturuldu');
      return emptyData;
    }
    
    // Dosyayı oku ve parse et
    const rawData = fs.readFileSync(TICKETS_FILE, 'utf8');
    const data = JSON.parse(rawData);
    
    // Eskiden kaydedilen verilerde eksik alanları kontrol et ve ekle
    if (!data.ticketResponses) data.ticketResponses = {};
    if (!data.users) data.users = {};
    
    console.log('Ticket verileri diskten yüklendi');
    return data;
  } catch (error) {
    console.error('Veri diskten yüklenirken hata oluştu:', error);
    return {
      tickets: {},
      settings: {},
      lastTicketNumbers: {},
      ticketResponses: {},
      users: {}
    };
  }
}

// Mevcut JSON dosyasını yedekle
function backupDataFile() {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      fs.copyFileSync(TICKETS_FILE, TICKETS_BACKUP_FILE);
      console.log('Ticket verileri yedeklendi');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Veri yedeklenirken hata oluştu:', error);
    return false;
  }
}

// JSON verisini diske kaydet
function saveDataToDisk() {
  try {
    // Eğer data klasörü yoksa oluştur
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Önce mevcut dosyayı yedekle
    backupDataFile();
    
    // Memory'deki verileri JSON formatına dönüştür
    const tickets = {};
    memoryStorage.tickets.forEach((ticket, id) => {
      tickets[id] = ticket;
    });
    
    const settings = {};
    memoryStorage.botSettings.forEach((setting, guildId) => {
      settings[guildId] = setting;
    });
    
    const lastTicketNumbers = {};
    memoryStorage.lastTicketNumbers.forEach((number, guildId) => {
      lastTicketNumbers[guildId] = number;
    });
    
    // Ticket yanıtlarını JSON formatına dönüştür
    const ticketResponses = {};
    memoryStorage.ticketResponses.forEach((response, id) => {
      ticketResponses[id] = response;
    });
    
    // Kullanıcı verilerini JSON formatına dönüştür
    const users = {};
    memoryStorage.users.forEach((user, id) => {
      users[id] = user;
    });
    
    // JSON verisini oluştur
    const data = {
      tickets,
      settings,
      lastTicketNumbers,
      ticketResponses,
      users,
      backup_date: new Date().toISOString() // Yedekleme tarihi ekle
    };
    
    // Dosyaya yaz
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(data, null, 2));
    console.log('Ticket verileri diske kaydedildi');
    return true;
  } catch (error) {
    console.error('Veri diske kaydedilirken hata oluştu:', error);
    return false;
  }
}

// Diskten verileri Memory'ye yükle
function loadDataToMemory() {
  try {
    const data = loadDataFromDisk();
    
    // Kullanıcı verilerini yükle (önce yükle çünkü ticket'lar kullanıcılara referans veriyor)
    if (data.users) {
      Object.entries(data.users).forEach(([id, user]) => {
        memoryStorage.users.set(parseInt(id), user);
      });
      console.log(`${memoryStorage.users.size} kullanıcı hafızaya yüklendi`);
    }
    
    // Ticket verilerini yükle
    if (data.tickets) {
      Object.entries(data.tickets).forEach(([id, ticket]) => {
        memoryStorage.tickets.set(parseInt(id), ticket);
        // En yüksek ticket ID'sini takip et
        if (parseInt(id) > memoryStorage.lastTicketId) {
          memoryStorage.lastTicketId = parseInt(id);
        }
      });
      console.log(`${memoryStorage.tickets.size} ticket hafızaya yüklendi`);
    }
    
    // Ticket yanıtlarını yükle
    if (data.ticketResponses) {
      Object.entries(data.ticketResponses).forEach(([id, response]) => {
        memoryStorage.ticketResponses.set(parseInt(id), response);
      });
      console.log(`${memoryStorage.ticketResponses.size} ticket yanıtı hafızaya yüklendi`);
    }
    
    // Bot ayarlarını yükle
    if (data.settings) {
      Object.entries(data.settings).forEach(([guildId, setting]) => {
        memoryStorage.botSettings.set(guildId, setting);
        // Yetkili rollerini de yükle
        if (setting.staff_role_id) {
          memoryStorage.staffRoles.set(guildId, setting.staff_role_id);
        }
      });
      console.log(`${memoryStorage.botSettings.size} sunucu ayarı hafızaya yüklendi`);
    }
    
    // Son ticket numaralarını yükle
    if (data.lastTicketNumbers) {
      Object.entries(data.lastTicketNumbers).forEach(([guildId, number]) => {
        memoryStorage.lastTicketNumbers.set(guildId, number);
      });
      console.log(`${Object.keys(data.lastTicketNumbers).length} sunucu için son ticket numaraları hafızaya yüklendi`);
    }
    
    return true;
  } catch (error) {
    console.error('Memory\'ye veri yüklenirken hata oluştu:', error);
    return false;
  }
}

// Örnek kategoriler (hafıza)
const defaultCategories = [
  { id: 1, name: 'Transfer Talebi', emoji: '⚽', description: 'Transfer talepleriniz için bu kategoriyi seçin' },
  { id: 2, name: 'Hakem Şikayeti', emoji: '🏠', description: 'Hakem şikayetleriniz için bu kategoriyi seçin' },
  { id: 3, name: 'Basın Toplantısı', emoji: '🎤', description: 'Basın toplantısı düzenlemek için bu kategoriyi seçin' },
  { id: 4, name: 'Sözleşme Uzatma', emoji: '📝', description: 'Sözleşme uzatma talepleri için bu kategoriyi seçin' },
  { id: 5, name: 'Diğer', emoji: '❓', description: 'Diğer talepleriniz için bu kategoriyi seçin' }
];

// Kategorileri hafızaya ekle
defaultCategories.forEach(category => {
  memoryStorage.categories.set(category.id, category);
});

// Helper functions
function formatDate(date) {
  if (!date) return 'Bilinmiyor';
  
  // Yerel zamanı kullan ve manuel tarih oluştur
  const now = new Date(date);
  
  // Türkçe aylar
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  // Tarih bileşenlerini oluştur
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  // Saat bileşenlerini oluştur
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  // Formatlanmış tarihi döndür
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

// Storage functions
const storage = {
  async getBotSettings(guildId) {
    let settings = memoryStorage.botSettings.get(guildId);
    if (!settings) {
      settings = { 
        guild_id: guildId, 
        prefix: '.', 
        last_ticket_number: 0,
        staff_role_id: null, // Yetkili rolünü botSettings içinde saklayalım
        ticket_panel_channel_id: null, // Ticket panelinin olduğu kanal ID'si
        ticket_panel_message_id: null // Ticket panel mesajının ID'si
      };
      memoryStorage.botSettings.set(guildId, settings);
      
      // Yeni bir ayar oluşturulduğunda diske kaydet
      saveDataToDisk();
    }
    return settings;
  },
  
  async updateTicketPanel(guildId, channelId, messageId) {
    // Sunucu ayarlarını getir (yoksa oluştur)
    let settings = await this.getBotSettings(guildId);
    
    // Panel bilgilerini güncelle
    settings.ticket_panel_channel_id = channelId;
    settings.ticket_panel_message_id = messageId;
    
    // Ayarları kaydet
    memoryStorage.botSettings.set(guildId, settings);
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    console.log(`Sunucu ${guildId} için ticket panel bilgileri güncellendi: Kanal ${channelId}, Mesaj ${messageId}`);
    return settings;
  },
  
  async getTicketPanelInfo(guildId) {
    const settings = await this.getBotSettings(guildId);
    return {
      channelId: settings.ticket_panel_channel_id,
      messageId: settings.ticket_panel_message_id
    };
  },
  
  async setStaffRole(guildId, roleId) {
    // Hem hafızada hem de botSettings içinde saklayalım
    memoryStorage.staffRoles.set(guildId, roleId);
    
    // BotSettings içindeki staff_role_id'yi güncelle
    let settings = await this.getBotSettings(guildId);
    settings.staff_role_id = roleId;
    memoryStorage.botSettings.set(guildId, settings);
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    console.log(`Yetkili rolü ayarlandı: ${roleId} (Guild: ${guildId})`);
    return roleId;
  },
  
  async getStaffRole(guildId) {
    // Önce hafızadan kontrol et
    let roleId = memoryStorage.staffRoles.get(guildId);
    
    // Eğer yoksa, botSettings'den almayı dene
    if (!roleId) {
      const settings = await this.getBotSettings(guildId);
      roleId = settings.staff_role_id;
      
      // Eğer botSettings'de varsa hafızaya al
      if (roleId) {
        memoryStorage.staffRoles.set(guildId, roleId);
        console.log(`Yetkili rolü botSettings'den yüklendi: ${roleId} (Guild: ${guildId})`);
      }
    }
    
    return roleId;
  },
  
  async getAllCategories() {
    return Array.from(memoryStorage.categories.values());
  },
  
  async getUserByDiscordId(discordId) {
    return Array.from(memoryStorage.users.values()).find(user => user.discord_id === discordId);
  },
  
  async createOrUpdateUser(userData) {
    const { discordId, username, avatarUrl } = userData;
    
    // Check if user exists
    const existingUser = await this.getUserByDiscordId(discordId);
    
    if (existingUser) {
      // Update user
      existingUser.username = username;
      existingUser.avatar_url = avatarUrl;
      existingUser.updated_at = new Date();
      
      // Değişiklikleri diske kaydet
      saveDataToDisk();
      
      return existingUser;
    } else {
      // Create new user
      const newUser = {
        id: memoryStorage.users.size + 1,
        discord_id: discordId,
        username: username,
        avatar_url: avatarUrl,
        is_staff: false,
        last_active: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      memoryStorage.users.set(newUser.id, newUser);
      
      // Değişiklikleri diske kaydet
      saveDataToDisk();
      
      return newUser;
    }
  },
  
  async getCategoryById(id) {
    return memoryStorage.categories.get(parseInt(id));
  },
  
  async createTicket(ticketData) {
    const { userId, categoryId, description, status = 'pending', channelId, guildId } = ticketData;
    
    const ticketId = ++memoryStorage.lastTicketId;
    
    // Sunucu ID varsa, ticket numarası oluştur
    let ticketNumber = null;
    if (guildId) {
      ticketNumber = await this.getNextTicketNumber(guildId);
    }
    
    const newTicket = {
      id: ticketId,
      user_id: userId,
      category_id: categoryId,
      staff_id: null,
      channel_id: channelId,
      guild_id: guildId,
      number: ticketNumber, // Ticket numarası (kanal adı için)
      description: description,
      status: status,
      reject_reason: null,
      created_at: new Date(),
      closed_at: null,
      updated_at: new Date()
    };
    
    // Ticket'ı hafızaya ekle
    memoryStorage.tickets.set(ticketId, newTicket);
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return newTicket;
  },
  
  async getTicketById(id) {
    const ticket = memoryStorage.tickets.get(parseInt(id));
    
    if (!ticket) return null;
    
    const category = memoryStorage.categories.get(ticket.category_id);
    const user = memoryStorage.users.get(ticket.user_id);
    const staff = ticket.staff_id ? memoryStorage.users.get(ticket.staff_id) : null;
    
    return {
      ...ticket,
      category_name: category?.name || 'Bilinmeyen Kategori',
      category_emoji: category?.emoji || '📋',
      user_username: user?.username || 'Bilinmeyen Kullanıcı',
      user_discord_id: user?.discord_id || null,
      staff_username: staff?.username || null,
      staff_discord_id: staff?.discord_id || null
    };
  },
  
  async getTicketByChannelId(channelId) {
    const ticket = Array.from(memoryStorage.tickets.values()).find(t => t.channel_id === channelId);
    
    if (!ticket) return null;
    
    const category = memoryStorage.categories.get(ticket.category_id);
    const user = memoryStorage.users.get(ticket.user_id);
    const staff = ticket.staff_id ? memoryStorage.users.get(ticket.staff_id) : null;
    
    return {
      ...ticket,
      category_name: category?.name || 'Bilinmeyen Kategori',
      category_emoji: category?.emoji || '📋',
      user_username: user?.username || 'Bilinmeyen Kullanıcı',
      user_discord_id: user?.discord_id || null,
      staff_username: staff?.username || null,
      staff_discord_id: staff?.discord_id || null
    };
  },
  
  async getTicketsByUserId(userId) {
    const tickets = Array.from(memoryStorage.tickets.values())
      .filter(t => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return tickets.map(ticket => {
      const category = memoryStorage.categories.get(ticket.category_id);
      return {
        ...ticket,
        category_name: category?.name || 'Bilinmeyen Kategori',
        category_emoji: category?.emoji || '📋'
      };
    });
  },
  
  async acceptTicket(ticketId) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.status = 'accepted';
    ticket.updated_at = new Date();
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return ticket;
  },
  
  async rejectTicket(ticketId, rejectReason) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.status = 'rejected';
    ticket.reject_reason = rejectReason;
    ticket.updated_at = new Date();
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return ticket;
  },
  
  async closeTicket(ticketId, closedByUserId = null) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.status = 'closed';
    ticket.closed_at = new Date();
    ticket.updated_at = new Date();
    
    // Kapatan kullanıcıyı kaydet (eğer belirtilmişse)
    if (closedByUserId) {
      ticket.closed_by_user_id = closedByUserId;
    }
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return ticket;
  },
  
  // Yetkililerin kapatma sayılarını getir
  async getStaffTicketStats() {
    // Ticket verileri üzerinden istatistikleri hesapla
    const closedTickets = Array.from(memoryStorage.tickets.values())
      .filter(ticket => ticket.status === 'closed' && ticket.closed_by_user_id);
    
    // Kullanıcılara göre grupla
    const staffStats = {};
    
    for (const ticket of closedTickets) {
      const staffId = ticket.closed_by_user_id;
      if (!staffStats[staffId]) {
        staffStats[staffId] = 0;
      }
      staffStats[staffId]++;
    }
    
    // Kullanıcı verilerini ekle
    const results = [];
    for (const [staffId, count] of Object.entries(staffStats)) {
      const user = memoryStorage.users.get(parseInt(staffId));
      if (user) {
        results.push({
          user_id: parseInt(staffId),
          username: user.username,
          discord_id: user.discord_id,
          closed_tickets: count
        });
      }
    }
    
    // Kapatılan ticket sayısına göre sırala
    return results.sort((a, b) => b.closed_tickets - a.closed_tickets);
  },
  
  async assignTicket(ticketId, staffId) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.staff_id = staffId;
    ticket.updated_at = new Date();
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return ticket;
  },
  
  async addResponse(responseData) {
    const { ticketId, userId, message } = responseData;
    
    const responseId = memoryStorage.ticketResponses.size + 1;
    
    const newResponse = {
      id: responseId,
      ticket_id: ticketId,
      user_id: userId,
      message: message,
      created_at: new Date()
    };
    
    memoryStorage.ticketResponses.set(responseId, newResponse);
    
    // Değişiklikleri diske kaydet
    saveDataToDisk();
    
    return newResponse;
  },
  
  async getResponsesByTicketId(ticketId) {
    const responses = Array.from(memoryStorage.ticketResponses.values())
      .filter(r => r.ticket_id === parseInt(ticketId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    return responses.map(response => {
      const user = memoryStorage.users.get(response.user_id);
      return {
        ...response,
        username: user?.username || 'Bilinmeyen Kullanıcı',
        discord_id: user?.discord_id || null
      };
    });
  },
  
  async getActiveStaffMembers() {
    return Array.from(memoryStorage.users.values())
      .filter(user => user.is_staff && new Date(user.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000));
  },
  
  async getOpenTickets() {
    // Hafızadaki açık ticketları döndür (kapalı olmayanlar)
    // Ticket statüsleri: pending, accepted, rejected, closed
    const openTickets = Array.from(memoryStorage.tickets.values())
      .filter(ticket => ticket.status !== 'closed')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // En yeniden eskiye sırala
    
    return openTickets;
  },
  
  async getNextTicketNumber(guildId) {
    // Son ticket numarasını al (veya yoksa 0 olarak başla)
    let lastNumber = memoryStorage.lastTicketNumbers.get(guildId) || 0;
    
    // Artır ve güncelle
    lastNumber++;
    
    // Hafızada güncelle
    memoryStorage.lastTicketNumbers.set(guildId, lastNumber);
    
    // Güncellemeyi diske kaydet
    saveDataToDisk();
    
    console.log(`Sunucu ${guildId} için yeni ticket numarası: ${lastNumber}`);
    
    return lastNumber;
  }
};

// Yardımcı fonksiyonlar
function isStaffMember(member) {
  // Kullanıcının server yöneticisi yetkisi varsa
  if (member && member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
    return true;
  }
  
  // Veya rolü moderatör/yetkili rollerinden biriyse (rol adına göre kontrol)
  const staffRoleNames = ['staff', 'yetkili', 'mod', 'moderator', 'moderatör', 'admin', 'yönetici'];
  
  const hasStaffRole = member && member.roles.cache.some(role => 
    staffRoleNames.some(staffRole => role.name.toLowerCase().includes(staffRole))
  );
  
  return hasStaffRole;
}

// Embed functions
async function createTicketPanelEmbed(guildId) {
  // Get guild settings to get the prefix
  const settings = await storage.getBotSettings(guildId);
  const prefix = settings?.prefix || '.';
  
  // Rastgele renk seçimi
  const randomColors = ['#5865F2', '#FF5733', '#33FF57', '#3357FF', '#FFC300', '#C70039', '#4C9141', '#900C3F'];
  const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
  
  // Şu anki tarih
  const currentDate = new Date();
  const formattedDate = `${currentDate.toLocaleDateString('tr-TR')} - ${currentDate.toLocaleTimeString('tr-TR')}`;
  
  // Create the embed
  const embed = new MessageEmbed()
    .setColor(randomColor)
    .setTitle('🎟️ Futbol RP Ticket Sistemi')
    .setDescription(
      '**Yardıma ihtiyacın mı var yoksa yetkililere ulaşman mı gerekiyor?**\n\n' +
      '> 📝 Transferler için bilgi almak mı istiyorsun?\n' +
      '> 🏆 Yönetimle iletişime geçmek mi istiyorsun?\n' +
      '> 📋 Bir konuda şikayetin mi var?\n' +
      '> 🎭 Basın toplantısı düzenlemek mi istiyorsun?\n\n' +
      '**Aşağıdaki düğmeye tıklayarak ticket açabilirsin!**'
    )
    .setThumbnail('https://i.imgur.com/pgTRpDd.png')
    .setImage('https://i.imgur.com/U78xRjt.png')
    .setFooter({ text: `Güncellenme: ${formattedDate} | Prefix: ${prefix} | Powered by Porsuk Support` })
    .setTimestamp();

  // Create buttons
  const createTicketButton = new MessageButton()
    .setCustomId('create_ticket')
    .setLabel('Ticket Oluştur')
    .setEmoji('📬')
    .setStyle('SUCCESS'); // Yeşil renk

  const myTicketsButton = new MessageButton()
    .setCustomId('my_tickets')
    .setLabel('Ticketlarım')
    .setEmoji('📋')
    .setStyle('PRIMARY'); // Mavi renk
    
  const helpButton = new MessageButton()
    .setCustomId('help_button')
    .setLabel('Yardım')
    .setEmoji('❓')
    .setStyle('SECONDARY'); // Gri renk

  // Add buttons to row
  const row = new MessageActionRow().addComponents(createTicketButton, myTicketsButton, helpButton);

  return { embed, row };
}

async function createNewTicketEmbed(ticket) {
  // Get active staff members from database
  const activeStaff = await storage.getActiveStaffMembers();
  
  // Create the embed
  const embed = new MessageEmbed()
    .setColor('#5865F2')
    .setTitle('🎫 Yeni Ticket')
    .setThumbnail('https://i.imgur.com/pgTRpDd.png')
    .addField('👤 Açan:', `<@${ticket.user_discord_id || 'Bilinmeyen Kullanıcı'}>`, false)
    .addField('📂 Kategori:', `${ticket.category_emoji || '📌'} ${ticket.category_name || 'Genel Kategori'}`, false)
    .addField('📆 Açılış:', formatDate(ticket.created_at), false)
    .setImage('https://i.imgur.com/pgTRpDd.png');

  // Add staff section
  if (activeStaff.length > 0) {
    const validStaff = activeStaff.filter(staff => staff.discord_id);
    
    if (validStaff.length > 0) {
      const staffList = validStaff.map(staff => `• <@${staff.discord_id}>`).join('\n');
      const staffCount = validStaff.length;
      
      embed.addField(`👮‍♂️ Yetkili Ekibi (${staffCount} Aktif Yetkili):`, staffList, false);
    } else {
      embed.addField('👮‍♂️ Yetkili Ekibi:', 'Yetkililer yakında size yardımcı olacaklar.', false);
    }
  } else {
    embed.addField('👮‍♂️ Yetkili Ekibi:', 'Yetkililer yakında size yardımcı olacaklar.', false);
  }

  // Create buttons
  const replyButton = new MessageButton()
    .setCustomId('reply_ticket')
    .setLabel('Yanıtla')
    .setEmoji('💬')
    .setStyle('PRIMARY');
  
  const acceptButton = new MessageButton()
    .setCustomId('accept_ticket')
    .setLabel('Kabul Et')
    .setEmoji('✅')
    .setStyle('SUCCESS');
  
  const rejectButton = new MessageButton()
    .setCustomId('reject_ticket')
    .setLabel('Reddet')
    .setEmoji('⛔')
    .setStyle('DANGER');
  
  const closeButton = new MessageButton()
    .setCustomId('close_ticket')
    .setLabel('Kapat')
    .setEmoji('❌')
    .setStyle('SECONDARY');

  // Create rows for buttons
  const row1 = new MessageActionRow().addComponents(acceptButton, rejectButton);
  const row2 = new MessageActionRow().addComponents(replyButton, closeButton);
  
  // Combine the rows
  const rows = [row1, row2];

  return { embed, rows, activeStaff };
}

function createTicketListEmbed(tickets) {
  // Create the embed
  const embed = new MessageEmbed()
    .setColor('#5865F2')
    .setTitle('📋 Ticketlarım');
  
  if (tickets.length === 0) {
    embed.setDescription('Hiç ticket oluşturmamışsın delikanlı.');
  } else {
    let description = '';
    
    tickets.forEach((ticket, index) => {
      let statusEmoji, statusText;
      
      switch (ticket.status) {
        case 'pending':
          statusEmoji = '🟠';
          statusText = 'Beklemede';
          break;
        case 'accepted':
          statusEmoji = '🟢';
          statusText = 'Kabul Edildi';
          break;
        case 'rejected':
          statusEmoji = '🔴';
          statusText = 'Reddedildi';
          break;
        case 'closed':
          statusEmoji = '⚫';
          statusText = 'Kapatıldı';
          break;
        default:
          statusEmoji = '🟠';
          statusText = 'Beklemede';
      }
      
      description += `**${index + 1}.** ${ticket.category_emoji || '📌'} ${ticket.category_name || 'Genel Kategori'} - ${statusEmoji} ${statusText}\n`;
    });
    
    embed.setDescription(description);
  }
  
  embed.setFooter({ text: 'Açık ticketlara tıklayarak gidebilirsiniz' });
  
  return embed;
}

// Command handlers
async function handleTicketKurCommand(message) {
  // Kullanıcının yazdığı komutu sil - chat temiz kalsın
  try {
    await message.delete();
  } catch (deleteError) {
    console.error('Komut mesajı silinemedi:', deleteError);
    // Hata olursa sessizce devam et
  }
  
  // Check if user has staff or admin permissions
  if (!isStaffMember(message.member)) {
    const errorMsg = await message.channel.send({ content: `<@${message.author.id}>, bu komutu kullanabilmek için yetkili olmalısın delikanlı.` });
    
    // 5 saniye sonra hata mesajını sil
    setTimeout(() => {
      errorMsg.delete().catch(e => console.error('Hata mesajı silinemedi:', e));
    }, 5000);
    
    return;
  }
  
  // Komutun kullanıldığı kanal ID'sini kaydet (çift komut çalışmasını engellemek için)
  const channelAndUserKey = `${message.channel.id}_${message.author.id}`;
  
  // Son birkaç saniye içinde aynı komut çalıştırılmış mı kontrol et
  const now = Date.now();
  const lastCommandTime = memoryStorage.lastCommandTimes?.get(channelAndUserKey) || 0;
  
  // Eğer son 10 saniye içinde aynı kullanıcı aynı kanalda bu komutu çalıştırdıysa, engelle
  if (now - lastCommandTime < 10000) {
    console.log(`Command cooldown for ${message.author.tag} in channel ${message.channel.id}`);
    return; // Sessizce engelle
  }
  
  // Komut kullanım zamanını kaydet
  if (!memoryStorage.lastCommandTimes) {
    memoryStorage.lastCommandTimes = new Map();
  }
  memoryStorage.lastCommandTimes.set(channelAndUserKey, now);
  
  try {
    // Bu kontrol kısmını devre dışı bırakıyoruz çünkü sorun yaratabiliyor
    // Her zaman yeni bir panel oluşturması için doğrudan devam edeceğiz
    
    // Sunucudaki roller
    let roles = message.guild.roles.cache.filter(role => 
      !role.managed && role.id !== message.guild.id
    ).map(role => {
      return {
        label: role.name, 
        value: role.id,
        description: `ID: ${role.id}`
      };
    }).slice(0, 25); // Discord 25'ten fazla seçeneğe izin vermiyor
    
    // Eğer hiç rol bulunmadıysa @everyone rolünü ekle
    if (roles.length === 0) {
      roles = [{
        label: '@everyone (Varsayılan)', 
        value: message.guild.id,
        description: 'Sunucudaki herkes'
      }];
    }
    
    // Seçim menüsü
    const selectMenu = new MessageSelectMenu()
      .setCustomId('staff_role_select')
      .setPlaceholder('Yetkili rolünü seçin')
      .addOptions(roles);
      
    const row = new MessageActionRow().addComponents(selectMenu);
    
    // Mesajı gönder ve 5 saniye sonra otomatik sil
    const replyMessage = await message.reply({ 
      content: 'Lütfen ticket sistemi için yetkili rolünü seçin:', 
      components: [row]
    });
    
    // 5 saniye sonra otomatik sil
    setTimeout(() => {
      replyMessage.delete().catch(e => console.error('Rol seçim mesajı silinemedi:', e));
    }, 5000); // 5 saniye sonra
    
    // Rol seçimini bekle
    const filter = i => i.customId === 'staff_role_select' && i.user.id === message.author.id;
    
    try {
      const roleSelection = await message.channel.awaitMessageComponent({ filter, time: 60000 });
      const selectedRoleId = roleSelection.values[0];
      const selectedRole = message.guild.roles.cache.get(selectedRoleId);
      
      if (!selectedRole) {
        return roleSelection.reply({ 
          content: 'Geçersiz rol seçimi. İşlem iptal edildi.'
          // ephemeral özelliğini kaldırdık
        });
      }
      
      // Rolü kaydet
      await storage.setStaffRole(message.guild.id, selectedRoleId);
      
      // Ticket panelini oluştur
      const { embed, row } = await createTicketPanelEmbed(message.guild.id);
      
      // Burada yeni panel oluştur
      const sentPanel = await message.channel.send({ 
        embeds: [embed], 
        components: [row] 
      });
      
      // Panel bilgilerini kaydet (bu sunucuya özel)
      await storage.updateTicketPanel(message.guild.id, message.channel.id, sentPanel.id);
      
      // Ayarladığın rolü ve kurulum başarılı mesajını sadece komutu yazan kişi görsün - daha güzel bir embed mesaj ile
      try {
        // Şık bir embed oluştur
        const successEmbed = new MessageEmbed()
          .setColor('#00FF00') // Yeşil
          .setTitle('✅ Ticket Sistemi Kuruldu!')
          .setDescription(`Ticket sistemi başarıyla kuruldu ve ayarlandı!`)
          .addField('👮‍♂️ Yetkili Rolü', `<@&${selectedRoleId}>`, true)
          .addField('🎟️ Kanal', `<#${message.channel.id}>`, true)
          .addField('🕒 Kurulum Zamanı', `${formatDate(new Date())}`, false)
          .setFooter({ text: `${message.guild.name} | Powered by Porsuk Support Ticket System` })
          .setThumbnail('https://i.imgur.com/pgTRpDd.png')
          .setTimestamp();
        
        // DM'den göndermeyi dene
        try {
          await message.author.send({ embeds: [successEmbed] });
        } catch (dmError) {
          console.log("DM gönderilemedi, kanala göndereceğiz:", dmError);
          
          // DM kapalıysa veya hata alındıysa, kanala gönderip sonra sil
          const tempMsg = await message.channel.send({ 
            content: `<@${message.author.id}>, kurulum bilgileriniz:`,
            embeds: [successEmbed] 
          });
          
          // 5 saniye sonra sil
          setTimeout(() => {
            tempMsg.delete().catch(e => console.error('Başarı mesajı silinemedi:', e));
          }, 5000);
        }
        
        // Discord.js v13'te ephemeral message için deferReply kullan (interaction yanıtı için)
        await roleSelection.deferReply({ ephemeral: true });
        await roleSelection.followUp({ 
          content: "Kurulum tamamlandı! Detaylı bilgi DM'den gönderildi.",
          ephemeral: true
        });
        
        // İşlem tamamlandıktan sonra return ile fonksiyondan çıkıyoruz - böylece tekrar çalışması önleniyor
        return;
      } catch (replyError) {
        console.error('Panel confirmation error:', replyError);
        // Hata olursa sessizce devam et
      }
    } catch (error) {
      console.error('Role selection error:', error);
      // Rol seçimi için süre doldu mesajı kaldırıldı (kullanıcı isteği)
    }
  } catch (error) {
    console.error('Error creating ticket panel:', error);
    message.reply({ 
      content: 'Ticket paneli oluşturulurken bir hata oluştu.'
      // ephemeral özelliği kaldırıldı
    });
  }
}

async function handleTicketCommand(message) {
  // Kullanıcının yazdığı komutu sil - chat temiz kalsın
  try {
    await message.delete();
  } catch (deleteError) {
    console.error('Ticket komutu silinemedi:', deleteError);
    // Hata olursa sessizce devam et
  }
  
  try {
    // Kategori seçim menüsü oluştur
    const categories = await storage.getAllCategories();
    
    if (categories.length === 0) {
      // Kategori yoksa, default bir tane oluştur
      const defaultCategory = {
        id: 1,
        name: "Destek", 
        emoji: "🎫", 
        description: "Genel destek talebi"
      };
      memoryStorage.categories.set(defaultCategory.id, defaultCategory);
      categories.push(defaultCategory);
    }
    
    // SelectMenu oluştur
    const selectMenu = new MessageSelectMenu()
      .setCustomId('ticket_category')
      .setPlaceholder('Bir kategori seçin...');
    
    // Kategori seçeneklerini ekle
    const options = categories.map(category => ({
      label: category.name,
      value: category.id.toString(),
      description: category.description || 'Açıklama yok',
      emoji: category.emoji
    }));
    
    // Discord options seçenekleri 1-25 arasında olmalı
    if (options.length > 0) {
      selectMenu.addOptions(options);
    } else {
      // Hiç kategori yoksa varsayılan bir seçenek ekle
      selectMenu.addOptions([{
        label: "Genel Destek",
        value: "1",
        description: "Destek talebi oluştur",
        emoji: "🎫"
      }]);
    }
    
    const row = new MessageActionRow().addComponents(selectMenu);
    
    const response = await message.reply({
      content: 'Lütfen ticket için bir kategori seçin:',
      components: [row]
    });
    
    // Kategori seçimi için filtre
    const filter = i => {
      return i.customId === 'ticket_category' && i.user.id === message.author.id;
    };
    
    try {
      const categorySelection = await response.awaitMessageComponent({ filter, time: 60000 });
      
      // Kategori seçildiğinde
      await categorySelection.deferUpdate();
      
      const categoryId = parseInt(categorySelection.values[0]);
      
      // Açıklama kısmı kaldırıldı (kullanıcı isteği)
      const description = "";
      
      // Kullanıcıya bildirim gönder - işlemin devam ettiğini bildirmek için
      try {
        await categorySelection.followUp({ 
          content: "⏳ Ticket oluşturuluyor, lütfen bekleyin...", 
          ephemeral: true 
        });
      } catch (followupError) {
        console.error('Follow-up notification error:', followupError);
      }
      
      // Ticket oluştur
      await handleTicketCreation(message, categoryId, description);
    } catch (error) {
      console.error('Error awaiting category selection:', error);
      // Kategori seçimi için süre doldu mesajı kaldırıldı (kullanıcı isteği)
    }
  } catch (error) {
    console.error('Error creating ticket command:', error);
    message.reply({ content: 'Ticket oluşturulurken bir hata oluştu.' });
  }
}

async function handleTicketCreation(message, categoryId, description) {
  try {
    const user = message.author;
    const guild = message.guild;
    
    // Kullanıcıyı veritabanında oluştur veya güncelle
    const userData = {
      discordId: user.id,
      username: user.username,
      avatarUrl: user.displayAvatarURL()
    };
    
    const dbUser = await storage.createOrUpdateUser(userData);
    
    if (!dbUser) {
      return message.reply({ content: 'Kullanıcı bilgileri kaydedilemedi.' });
    }
    
    // Kategoriyi kontrol et
    const category = await storage.getCategoryById(categoryId);
    
    if (!category) {
      return message.reply({ content: 'Seçilen kategori bulunamadı.' });
    }
    
    // Ticket numarasını al
    const ticketNumber = await storage.getNextTicketNumber(guild.id);
    
    // Ticket kanalı oluştur
    const channelName = `ticket-${ticketNumber}`;
    
    try {
      // Ayarlanmış yetkili rolünü al veya varsayılan bir rol bul
      let staffRoleId = await storage.getStaffRole(guild.id);
      
      if (!staffRoleId) {
        // Yetkili rolü ayarlanmamışsa, otomatik bul
        const staffRole = guild.roles.cache.find(role => 
          role.name.toLowerCase().includes('staff') || 
          role.name.toLowerCase().includes('yetkili') || 
          role.name.toLowerCase().includes('mod') ||
          role.name.toLowerCase().includes('admin') ||
          role.name.toLowerCase().includes('yönetici')
        );
        
        staffRoleId = staffRole ? staffRole.id : guild.id;
      }
      
      // Kanal oluştur
      const ticketChannel = await guild.channels.create(channelName, {
        type: 'GUILD_TEXT',
        permissionOverwrites: [
          {
            id: guild.id, // @everyone - Kanalı KESİNLİKLE kimsenin görmemesini sağla
            deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES]
          },
          {
            id: user.id, // Ticket oluşturan kullanıcı
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.READ_MESSAGE_HISTORY]
          },
          {
            id: staffRoleId, // Staff rolü
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.READ_MESSAGE_HISTORY]
          },
          {
            id: client.user.id, // Bot kendisi
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.READ_MESSAGE_HISTORY, Permissions.FLAGS.MANAGE_CHANNELS]
          }
        ]
      });
      
      // Kanal oluşturulduktan sonra izinleri doğrula (kesinlikle @everyone izinlerini kapat)
      try {
        // @everyone rolüne izinleri kesinlikle kapattığımızdan emin olalım
        const everyonePerms = ticketChannel.permissionOverwrites.cache.get(guild.id);
        
        if (!everyonePerms || !everyonePerms.deny.has(Permissions.FLAGS.VIEW_CHANNEL)) {
          console.log(`${channelName} için @everyone izinleri tekrar düzeltiliyor...`);
          
          // İzinleri açıkça reddet
          await ticketChannel.permissionOverwrites.edit(guild.id, {
            VIEW_CHANNEL: false,
            SEND_MESSAGES: false
          });
        }
      } catch (permError) {
        console.error("İzinleri doğrulama hatası:", permError);
        // Hata olsa bile devam et
      }
      
      // Ticket'ı veritabanına kaydet
      const ticketData = {
        userId: dbUser.id,
        categoryId: category.id,
        description: description,
        channelId: ticketChannel.id
      };
      
      const ticket = await storage.createTicket(ticketData);
      
      if (!ticket) {
        return message.reply({ content: 'Ticket kaydedilemedi.' });
      }
      
      // Ticket bilgisi oluştur
      const ticketInfo = {
        id: ticket.id,
        category_name: category.name,
        category_emoji: category.emoji,
        user_username: dbUser.username,
        user_discord_id: dbUser.discord_id,
        description: description,
        created_at: ticket.created_at
      };
      
      // Ticket embed ve butonlarını oluştur
      const { embed, rows } = await createNewTicketEmbed(ticketInfo);
      
      // Yetkili rolünü etiketle (everyone etiketlemeden) ve mesajı gönder
      await ticketChannel.send({ 
        content: `<@&${staffRoleId}> Yeni bir ticket oluşturuldu! <@${user.id}> tarafından.`, 
        embeds: [embed], 
        components: rows,
        // Kesinlikle sadece belirtilen rol ve kullanıcıyı etiketle, everyone veya here olmasın
        allowedMentions: { 
          parse: [], // Hiçbir metni otomatik parse etme  
          roles: [staffRoleId], // Sadece bu rol ID'sini etiketle
          users: [user.id], // Sadece bu kullanıcı ID'sini etiketle
          everyone: false // @everyone kesinlikle devre dışı
        }
      });
      
      // Kullanıcıya kanal bilgisini SADECE kanal içinde bildir, DM ile bildirim yok
      try {
        // SelectMenu kullanılmışsa, original mesajı güncelle ve kanal bilgisini ekle
        if (message._interaction) {
          try {
            await message._interaction.followUp({ 
              content: `Ticket oluşturuldu: <#${ticketChannel.id}>`, 
              ephemeral: true 
            });
          } catch (interactionError) {
            console.error('Interaction update error:', interactionError);
          }
        } else {
          // Normal mesaj ile oluşturulduysa, cevap ver
          await message.reply({ 
            content: `Ticket oluşturuldu: <#${ticketChannel.id}>`,
            allowedMentions: { parse: ['users'], everyone: false }
          });
        }
      } catch (notifyError) {
        console.error('Kullanıcı bildirim hatası:', notifyError);
      }
      
    } catch (error) {
      console.error('Error creating ticket channel:', error);
      await message.reply({ content: 'Ticket kanalı oluşturulurken bir hata oluştu.' });
    }
  } catch (error) {
    console.error('Error in ticket creation:', error);
    await message.reply({ content: 'Ticket oluşturulurken bir hata oluştu.' });
  }
}

async function handleTicketlarimCommand(message) {
  // Kullanıcının yazdığı komutu sil - chat temiz kalsın
  try {
    await message.delete();
  } catch (deleteError) {
    console.error('Ticketlarim komutu silinemedi:', deleteError);
    // Hata olursa sessizce devam et
  }
  
  try {
    // Kullanıcıyı veritabanında bul
    const user = await storage.getUserByDiscordId(message.author.id);
    
    if (!user) {
      // Otomatik kullanıcı oluşturma
      const userData = {
        discordId: message.author.id,
        username: message.author.username,
        avatarUrl: message.author.displayAvatarURL()
      };
      const newUser = await storage.createOrUpdateUser(userData);
      
      // Mesaj gönder ama 5 saniye sonra sil
      const noTicketsMsg = await message.channel.send({ 
        content: `<@${message.author.id}>, henüz bir ticket oluşturmamışsınız. Ticket panelinden ticket oluşturabilirsiniz.` 
      });
      
      // 5 saniye sonra mesajı sil
      setTimeout(() => {
        noTicketsMsg.delete().catch(e => console.error('Bilgi mesajı silinemedi:', e));
      }, 5000);
      
      return;
    }
    
    // Kullanıcının ticketlarını al
    const tickets = await storage.getTicketsByUserId(user.id);
    
    // Embed oluştur
    const embed = createTicketListEmbed(tickets);
    
    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error listing tickets:', error);
    message.reply({ content: 'Ticketlar listelenirken bir hata oluştu.' });
  }
}

// Ticket istatistiklerini gösteren fonksiyon
async function handleTicketStatsCommand(message) {
  try {
    // Sadece yetkililerin kullanabilmesi için kontrol
    if (!isStaffMember(message.member)) {
      return message.reply({ content: 'Bu komutu kullanabilmek için yetkili olmalısın.' });
    }
    
    // Yetkililerin ticket istatistiklerini al
    const stats = await storage.getStaffTicketStats();
    
    if (stats.length === 0) {
      return message.reply({ content: 'Henüz hiç ticket kapatılmamış veya istatistik bulunamadı.' });
    }
    
    // Embed oluştur
    const embed = new MessageEmbed()
      .setColor('#5865F2')
      .setTitle('📊 Ticket Kapama İstatistikleri')
      .setDescription('Yetkililerin kapatmış olduğu ticket sayıları:')
      .setTimestamp();
    
    // İstatistikleri ekle
    stats.forEach((stat, index) => {
      embed.addField(
        `${index + 1}. ${stat.username}`, 
        `👮‍♂️ <@${stat.discord_id}>\n🎫 ${stat.closed_tickets} ticket kapatmış`,
        true
      );
    });
    
    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error displaying ticket stats:', error);
    message.reply({ content: 'Ticket istatistikleri gösterilirken bir hata oluştu.' });
  }
}

async function handleHelpCommand(message) {
  // Kullanıcının yazdığı komutu sil - chat temiz kalsın
  try {
    await message.delete();
  } catch (deleteError) {
    console.error('Yardım komutu silinemedi:', deleteError);
    // Hata olursa sessizce devam et
  }

  try {
    // Prefix'i al (bot ayarlarından veya varsayılan)
    const settings = await storage.getBotSettings(message.guild.id);
    const prefix = settings?.prefix || '.';
    
    // Bu sunucunun yetkili rolünü kontrol et
    const staffRoleId = settings?.staff_role_id;
    const isUserStaff = message.member && (
      message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR) ||
      (staffRoleId && message.member.roles.cache.has(staffRoleId))
    );
    
    const embed = new MessageEmbed()
      .setColor('#5865F2')
      .setTitle('Futbol Bot Komutları')
      .setDescription(`Aşağıdaki komutları **${prefix}** önekiyle kullanabilirsiniz.`)
      .setThumbnail('https://i.imgur.com/pgTRpDd.png');
    
    // Kullanıcı komutları
    embed.addField('📝 Kullanıcı Komutları', `
      \`${prefix}ticketlarım\` - Oluşturduğunuz ticketları listeler
      \`${prefix}help\` - Bu yardım mesajını gösterir
      \`${prefix}ping\` - Botun gecikme süresini gösterir
    `, false);
    
    // Yetkili ise yetkili komutlarını da göster
    if (isUserStaff) {
      embed.addField('🛡️ Yetkili Komutları', `
        \`${prefix}ticketkur\` - Ticket sistemini kurar ve panel gönderir
        \`${prefix}yt\` - Yetkililerin kaç ticket kapattığını gösterir
      `, false);
    }
    
    embed.setFooter({ text: 'Porsuk Support Ticket Sistemi' });
    
    // Mesajı gönder ve 15 saniye sonra otomatik sil (yardım mesajı için daha uzun süre)
    const helpReply = await message.channel.send({ 
      content: `<@${message.author.id}>, yardım bilgileri:`,
      embeds: [embed] 
    });
    
    // 15 saniye sonra sil (yardım mesajını okumak için daha uzun süre)
    setTimeout(() => {
      helpReply.delete().catch(e => console.error('Yardım mesajı silinemedi:', e));
    }, 15000); // 15 saniye sonra
  } catch (error) {
    console.error('Error showing help:', error);
    
    // Hata mesajını gönder ve 5 saniye sonra sil
    const errorMsg = await message.channel.send({ 
      content: `<@${message.author.id}>, yardım mesajı gösterilirken bir hata oluştu.` 
    });
    
    // 5 saniye sonra sil
    setTimeout(() => {
      errorMsg.delete().catch(e => console.error('Hata mesajı silinemedi:', e));
    }, 5000);
  }
}

// Button interaction handlers
async function acceptTicket(interaction) {
  try {
    await interaction.deferReply();
    
    // Ticket'ı bul
    const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
    
    if (!ticketInfo) {
      return interaction.followUp({ content: 'Ticket bilgisi bulunamadı.' });
    }
    
    // Yetkilinin kendisini güncelle
    const staffData = {
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL()
    };
    
    const staffUser = await storage.createOrUpdateUser(staffData);
    
    if (!staffUser) {
      return interaction.followUp({ content: 'Yetkili bilgisi güncellenemedi.' });
    }
    
    // Ticket'ı kabul et ve yetkiliyi ata
    await storage.acceptTicket(ticketInfo.id);
    await storage.assignTicket(ticketInfo.id, staffUser.id);
    
    // Kullanıcıya DM gönder
    try {
      const ticketUser = await client.users.fetch(ticketInfo.user_discord_id);
      
      if (ticketUser) {
        const dmEmbed = new MessageEmbed()
          .setColor('#57F287') // Discord green
          .setTitle('✅ Ticketınız Kabul Edildi')
          .setDescription(`Ticketınız yetkili tarafından kabul edildi.`)
          .addField('📂 Kategori:', `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`, false)
          .addField('👮‍♂️ İlgilenen Yetkili:', `${interaction.user.username}`, false)
          .setFooter({ text: `Ticket ID: ${ticketInfo.id}` })
          .setTimestamp();
        
        await ticketUser.send({ embeds: [dmEmbed] }).catch(error => {
          console.error('Could not send DM:', error);
        });
      }
    } catch (dmError) {
      console.error('DM send error:', dmError);
      // DM gönderilmezse kanalda devam et
    }
    
    // Sadece işlemi gerçekleştiren yetkiliye özel bildirim
    await interaction.followUp({ content: `✅ Ticket kabul edildi.`, ephemeral: true });
  } catch (error) {
    console.error('Error accepting ticket:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Ticket kabul edilirken bir hata oluştu.' });
    } else {
      await interaction.followUp({ content: 'Ticket kabul edilirken bir hata oluştu.' });
    }
  }
}

async function rejectTicket(interaction) {
  try {
    // Kanal kontrolü yapın
    if (!interaction.channel) {
      console.log("Reject ticket attempted on a non-existent channel");
      return; // Kanal yoksa hiçbir şey yapma
    }
    
    // Ticket'ı bul (erken dönem kontrolü)
    const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id).catch(err => {
      console.error("Error fetching ticket info:", err);
      return null;
    });
    
    if (!ticketInfo) {
      try {
        await interaction.reply({ 
          content: 'Ticket bilgisi bulunamadı veya bu kanal bir ticket kanalı değil.', 
          ephemeral: true 
        });
      } catch (replyError) {
        console.error('Reply error on non-existent ticket:', replyError);
      }
      return;
    }
    
    try {
      // v13'te kullanıcıdan red nedeni isteyeceğiz
      await interaction.reply({ 
        content: 'Lütfen reddetme nedeninizi yazın:', 
        ephemeral: true 
      });
      
      const filter = m => m.author.id === interaction.user.id && m.channelId === interaction.channel.id;
      
      try {
        const collected = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time']
        });
        
        // Mesaj alındıysa devam et
        if (collected.first()) {
          const rejectReason = collected.first().content;
          
          // Ticket'ı reddet
          await storage.rejectTicket(ticketInfo.id, rejectReason).catch(err => {
            console.error("Error rejecting ticket in DB:", err);
            throw new Error("Ticket veritabanında reddedilemedi");
          });
          
          // Kullanıcıya DM gönder
          try {
            const ticketUser = await client.users.fetch(ticketInfo.user_discord_id).catch(err => {
              console.error("Error fetching user:", err);
              return null;
            });
            
            if (ticketUser) {
              const dmEmbed = new MessageEmbed()
                .setColor('#ED4245') // Discord red
                .setTitle('❌ Ticketınız Reddedildi')
                .setDescription(`Ticketınız yetkili tarafından reddedildi.`)
                .addField('📂 Kategori:', `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`, false)
                .addField('⛔ Red Nedeni:', rejectReason, false)
                .addField('👮‍♂️ Reddeden Yetkili:', `${interaction.user.username}`, false)
                .setFooter({ text: `Ticket ID: ${ticketInfo.id}` })
                .setTimestamp();
              
              // DM gönderme hatası kapatılmasın
              ticketUser.send({ embeds: [dmEmbed] }).catch(error => {
                console.error('Could not send DM:', error);
              });
            }
          } catch (dmError) {
            console.error('DM send error:', dmError);
            // DM gönderilmezse kanalda devam et
          }
          
          // Sadece işlemi gerçekleştiren yetkiliye özel bildirim - güvenli bir şekilde deneyin
          try {
            await interaction.followUp({ content: `❌ Ticket reddedildi.`, ephemeral: true });
          } catch (followUpError) {
            console.error('Could not follow up:', followUpError);
          }
          
          // Temizlik
          if (collected.first() && collected.first().deletable) {
            try {
              await collected.first().delete().catch(e => {
                console.error('Could not delete message:', e);
              });
            } catch (deleteError) {
              console.error('Delete error:', deleteError);
            }
          }
        } else {
          try {
            await interaction.followUp({ content: 'Red nedeni alınamadı. İşlem iptal edildi.', ephemeral: true });
          } catch (followUpError) {
            console.error('Could not follow up on missing reason:', followUpError);
          }
        }
      } catch (awaitError) {
        console.error('Error awaiting reject reason:', awaitError);
        try {
          await interaction.followUp({ content: 'Red nedeni için süre doldu. İşlem iptal edildi.', ephemeral: true });
        } catch (followUpError) {
          console.error('Could not follow up after timeout:', followUpError);
        }
      }
    } catch (initialError) {
      console.error('Initial reply error:', initialError);
      try {
        // Eğer daha önce cevap verilmediyse, hata mesajı gönder
        if (!interaction.replied) {
          await interaction.reply({ content: 'Ticket reddedilirken bir hata oluştu.', ephemeral: true });
        }
      } catch (replyError) {
        console.error('Error during error handling:', replyError);
      }
    }
  } catch (error) {
    console.error('Error rejecting ticket:', error);
    try {
      if (!interaction.replied) {
        await interaction.reply({ content: 'Ticket reddedilirken bir hata oluştu.', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'Ticket reddedilirken bir hata oluştu.', ephemeral: true });
      }
    } catch (finalError) {
      console.error('Final error handler failed:', finalError);
    }
  }
}

async function closeTicket(interaction) {
  try {
    // Kanal kontrolü yapın
    if (!interaction.channel) {
      console.log("Close ticket attempted on a non-existent channel");
      return; // Kanal yoksa hiçbir şey yapma
    }
    
    try {
      await interaction.deferReply({ ephemeral: true }).catch(err => {
        console.error('Could not defer reply:', err);
      });
      
      // Ticket'ı bul
      const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id).catch(err => {
        console.error("Error fetching ticket info:", err);
        return null;
      });
      
      if (!ticketInfo) {
        return interaction.followUp({ 
          content: 'Ticket bilgisi bulunamadı veya bu kanal bir ticket kanalı değil.', 
          ephemeral: true 
        }).catch(err => console.error('Could not follow up:', err));
      }
      
      // Yetkilinin kendisini güncelle/kaydet
      const staffData = {
        discordId: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL()
      };
      
      const staffUser = await storage.createOrUpdateUser(staffData).catch(err => {
        console.error("Error creating/updating staff user:", err);
        return null;
      });
      
      if (!staffUser) {
        return interaction.followUp({ 
          content: 'Yetkili bilgisi güncellenemedi.', 
          ephemeral: true 
        }).catch(err => console.error('Could not follow up:', err));
      }
      
      // Ticket'ı kapat - kapatanın ID'sini de kaydet
      await storage.closeTicket(ticketInfo.id, staffUser.id).catch(err => {
        console.error("Error closing ticket in DB:", err);
        throw new Error("Ticket veritabanında kapatılamadı");
      });
      
      // Kapatma bildirimi - sadece yetkili görecek şekilde
      try {
        await interaction.followUp({ 
          content: `✅ Kanal kapanıyor...`, 
          ephemeral: true 
        });
      } catch (followUpError) {
        console.error('Could not follow up after ticket closed:', followUpError);
      }
      
      // Geçerli bir kanal referansı için kontrol
      const channelToDelete = interaction.channel;
      
      // Direkt olarak kanalı sil (10 saniye bekle)
      setTimeout(async () => {
        try {
          if (channelToDelete && !channelToDelete.deleted) {
            await channelToDelete.delete().catch(e => {
              console.error('Channel delete error:', e);
            });
          }
        } catch (deleteError) {
          console.error('Error deleting channel:', deleteError);
        }
      }, 10000);
      
    } catch (innerError) {
      console.error('Inner error in closeTicket:', innerError);
      try {
        if (interaction.deferred) {
          await interaction.followUp({ 
            content: 'Ticket kapatılırken bir hata oluştu.', 
            ephemeral: true 
          }).catch(e => console.error('Final error handler failed:', e));
        } else if (!interaction.replied) {
          await interaction.reply({ 
            content: 'Ticket kapatılırken bir hata oluştu.', 
            ephemeral: true 
          }).catch(e => console.error('Final error handler failed:', e));
        }
      } catch (finalError) {
        console.error('Final error handler in closeTicket failed:', finalError);
      }
    }
  } catch (error) {
    console.error('Error closing ticket:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'Ticket kapatılırken bir hata oluştu.', 
          ephemeral: true 
        }).catch(e => console.error('Final error handler failed:', e));
      } else {
        await interaction.followUp({ 
          content: 'Ticket kapatılırken bir hata oluştu.', 
          ephemeral: true 
        }).catch(e => console.error('Final error handler failed:', e));
      }
    } catch (finalError) {
      console.error('Final error handler failed:', finalError);
    }
  }
}

async function replyToTicket(interaction) {
  try {
    // Kanal kontrolü yapın
    if (!interaction.channel) {
      console.log("Reply ticket attempted on a non-existent channel");
      return; // Kanal yoksa hiçbir şey yapma
    }
    
    try {
      await interaction.reply({ 
        content: 'Lütfen yanıtınızı yazın:', 
        ephemeral: true 
      }).catch(err => {
        console.error('Could not reply:', err);
        throw new Error("Initial reply failed");
      });
      
      const filter = m => m.author.id === interaction.user.id && m.channelId === interaction.channel.id;
      
      try {
        const collected = await interaction.channel.awaitMessages({
          filter,
          max: 1,
          time: 60000,
          errors: ['time']
        }).catch(err => {
          console.error('awaitMessages error:', err);
          return null;
        });
        
        // Mesaj toplama başarısız olduysa
        if (!collected || !collected.first()) {
          return interaction.followUp({ 
            content: 'Yanıt alınamadı. İşlem iptal edildi.', 
            ephemeral: true 
          }).catch(err => console.error('Could not follow up after no collection:', err));
        }
        
        const replyText = collected.first().content;
        
        // Ticket'ı bul
        const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id).catch(err => {
          console.error("Error fetching ticket info:", err);
          return null;
        });
        
        if (!ticketInfo) {
          try {
            await interaction.followUp({ 
              content: 'Ticket bilgisi bulunamadı veya bu kanal bir ticket kanalı değil.', 
              ephemeral: true 
            });
          } catch (followUpError) {
            console.error('Could not follow up after ticket not found:', followUpError);
          }
          
          // Kullanıcının mesajını silmeye çalış
          if (collected.first() && collected.first().deletable) {
            try {
              await collected.first().delete().catch(e => {
                console.error('Could not delete message:', e);
              });
            } catch (deleteError) {
              console.error('Delete error:', deleteError);
            }
          }
          
          return;
        }
        
        // Kullanıcıyı veritabanında oluştur veya güncelle
        const userData = {
          discordId: interaction.user.id,
          username: interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL()
        };
        
        const dbUser = await storage.createOrUpdateUser(userData).catch(err => {
          console.error("Error creating/updating user:", err);
          return null;
        });
        
        if (!dbUser) {
          try {
            await interaction.followUp({ 
              content: 'Kullanıcı bilgileri kaydedilemedi.', 
              ephemeral: true 
            });
          } catch (followUpError) {
            console.error('Could not follow up after user save failed:', followUpError);
          }
          
          // Kullanıcının mesajını silmeye çalış
          if (collected.first() && collected.first().deletable) {
            try {
              await collected.first().delete().catch(e => {
                console.error('Could not delete message:', e);
              });
            } catch (deleteError) {
              console.error('Delete error:', deleteError);
            }
          }
          
          return;
        }
        
        // Yanıtı kaydet
        const responseData = {
          ticketId: ticketInfo.id,
          userId: dbUser.id,
          message: replyText
        };
        
        await storage.addResponse(responseData).catch(err => {
          console.error("Error adding response:", err);
          throw new Error("Response could not be added to database");
        });
        
        // Yanıt embed'i oluştur
        const embed = new MessageEmbed()
          .setColor('#5865F2')
          .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(replyText)
          .setTimestamp();
        
        // Kanala bildirimde bulun - kanal hala mevcut mu kontrol et
        if (interaction.channel && !interaction.channel.deleted) {
          await interaction.channel.send({ 
            embeds: [embed],
            allowedMentions: { parse: ['users'], everyone: false }
          }).catch(err => {
            console.error('Could not send reply to channel:', err);
            throw new Error("Could not send message to channel");
          });
        } else {
          console.error('Channel no longer exists, cannot send reply');
          return;
        }
        
        // Temizlik - bildirim
        try {
          await interaction.followUp({ 
            content: 'Yanıtınız başarıyla gönderildi!', 
            ephemeral: true 
          });
        } catch (followUpError) {
          console.error('Could not follow up with success message:', followUpError);
        }
        
        // Kullanıcının mesajını silmeye çalış
        if (collected.first() && collected.first().deletable) {
          try {
            await collected.first().delete().catch(e => {
              console.error('Could not delete message:', e);
            });
          } catch (deleteError) {
            console.error('Delete error:', deleteError);
          }
        }
        
      } catch (awaitError) {
        console.error('Error awaiting reply:', awaitError);
        try {
          await interaction.followUp({ 
            content: 'Yanıt için süre doldu. İşlem iptal edildi.', 
            ephemeral: true 
          });
        } catch (followUpError) {
          console.error('Could not follow up after timeout:', followUpError);
        }
      }
    } catch (initialError) {
      console.error('Initial error in replyToTicket:', initialError);
      try {
        if (!interaction.replied) {
          await interaction.reply({ 
            content: 'Yanıt gönderilirken bir hata oluştu.', 
            ephemeral: true 
          }).catch(e => console.error('Final reply error:', e));
        }
      } catch (replyError) {
        console.error('Error during error handling:', replyError);
      }
    }
  } catch (error) {
    console.error('Error replying to ticket:', error);
    try {
      if (!interaction.replied) {
        await interaction.reply({ 
          content: 'Yanıt gönderilirken bir hata oluştu.', 
          ephemeral: true 
        }).catch(e => console.error('Final error handler failed:', e));
      } else {
        await interaction.followUp({ 
          content: 'Yanıt gönderilirken bir hata oluştu.', 
          ephemeral: true 
        }).catch(e => console.error('Final error handler failed:', e));
      }
    } catch (finalError) {
      console.error('Final error handler failed:', finalError);
    }
  }
}

// Event handlers
client.on('messageCreate', async (message) => {
  try {
    // Botun mesajlarını ve önek olmayan mesajları yoksay
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    
    // Komutu ve argümanları ayır
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // Kullanıcı + kanal + komut kombinasyonu için cooldown kontrolü yap
    const commandKey = `${message.author.id}-${message.channel.id}-${command}`;
    const now = Date.now();
    const cooldownTime = 10000; // 10 saniye
    
    // Son kullanım zamanını kontrol et
    if (lastCommandTimes.has(commandKey)) {
      const lastUsage = lastCommandTimes.get(commandKey);
      const timeElapsed = now - lastUsage;
      
      // Kullanıcı bu komutu bu kanalda son 10 saniye içinde kullandıysa, sessizce yoksay
      if (timeElapsed < cooldownTime) {
        console.log(`Command ${command} ignored: cooldown (${timeElapsed}ms < ${cooldownTime}ms)`);
        return;
      }
    }
    
    // Komut kullanım zamanını güncelle
    lastCommandTimes.set(commandKey, now);
    
    console.log(`Command received: ${command} by ${message.author.tag}`);
    
    // Komutları işle
    if (command === 'ping') {
      message.reply({ 
        content: `Pong! Bot gecikmesi: ${client.ws.ping}ms`,
        allowedMentions: { parse: ['users'], everyone: false }
      });
    } else if (command === 'ticketkur') {
      await handleTicketKurCommand(message);
    // 'ticket' ve 'ticketkurpaneli' komutlarını kaldırdık
    } else if (command === 'ticketlarım' || command === 'ticketlarim') {
      await handleTicketlarimCommand(message);
    } else if (command === 'yt' || command === 'ticketstats') {
      await handleTicketStatsCommand(message);
    } else if (command === 'help' || command === 'yardım' || command === 'yardim') {
      await handleHelpCommand(message);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      message.reply({ 
        content: 'Komut işlenirken bir hata oluştu.',
        allowedMentions: { parse: ['users'], everyone: false }
      });
    } catch (replyError) {
      console.error('Error replying to message:', replyError);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      console.log(`Button interaction received: ${interaction.customId} by ${interaction.user.tag}`);
      
      if (interaction.customId === 'create_ticket') {
        // Kategori seçim menüsünü göster
        const categories = await storage.getAllCategories();
        
        // Kategori yoksa, default bir tane oluştur
        if (categories.length === 0) {
          const defaultCategory = {
            id: 1,
            name: "Destek", 
            emoji: "🎫", 
            description: "Genel destek talebi"
          };
          memoryStorage.categories.set(defaultCategory.id, defaultCategory);
          categories.push(defaultCategory);
        }
        
        const selectMenu = new MessageSelectMenu()
          .setCustomId('ticket_category')
          .setPlaceholder('Bir kategori seçin...');
        
        // Kategori seçeneklerini ekle  
        const options = categories.map(category => ({
          label: category.name,
          value: category.id.toString(),
          description: category.description || 'Açıklama yok',
          emoji: category.emoji
        }));
        
        // Discord options seçenekleri 1-25 arasında olmalı
        if (options.length > 0) {
          selectMenu.addOptions(options);
        } else {
          // Hiç kategori yoksa varsayılan bir seçenek ekle
          selectMenu.addOptions([{
            label: "Genel Destek",
            value: "1",
            description: "Destek talebi oluştur",
            emoji: "🎫"
          }]);
        }
        
        const row = new MessageActionRow().addComponents(selectMenu);
        
        await interaction.reply({
          content: 'Lütfen ticket için bir kategori seçin:',
          components: [row],
          ephemeral: true
        });
      } else if (interaction.customId === 'my_tickets') {
        // Kullanıcının ticketlarını göster
        const user = await storage.getUserByDiscordId(interaction.user.id);
        
        if (!user) {
          // Otomatik kullanıcı oluşturma
          const userData = {
            discordId: interaction.user.id,
            username: interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL()
          };
          await storage.createOrUpdateUser(userData);
          
          return interaction.reply({ 
            content: 'Henüz bir ticket oluşturmamışsınız. Ticket oluşturarak başlayabilirsiniz.', 
            ephemeral: true 
          });
        }
        
        const tickets = await storage.getTicketsByUserId(user.id);
        const embed = createTicketListEmbed(tickets);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (interaction.customId === 'help_button') {
        // Yardım mesajını göster
        try {
          // Prefix'i al (bot ayarlarından veya varsayılan)
          const settings = await storage.getBotSettings(interaction.guild.id);
          const prefix = settings?.prefix || '.';
          
          // Şık bir yardım embed'i oluştur
          const helpEmbed = new MessageEmbed()
            .setColor('#5865F2')
            .setTitle('📚 Ticket Sistemi Yardım')
            .setDescription(`Ticket sistemi hakkında bilmeniz gerekenler:`)
            .addField('🎟️ Ticket Nasıl Açılır?', 
              `Ticket oluşturmak için **Ticket Oluştur** butonuna tıklayın ve ilgili kategoriyi seçin.`, false)
            .addField('🔍 Ticketlarıma Nasıl Bakarım?', 
              `Daha önce açtığınız ticketları görmek için **Ticketlarım** butonuna tıklayın.`, false)
            .addField('⏱️ Ticket İşlem Süreleri', 
              `Ticketlarınız genellikle en geç 24 saat içinde yanıtlanır. Acil durumlarda lütfen bunu belirtin.`, false)
            .addField('🔐 Ticket Nasıl Kapatılır?', 
              `Ticket kapatmak için ticket kanalındaki kapatma butonunu kullanabilirsiniz.`, false)
            .addField('⌨️ Kullanılabilir Komutlar', `
              \`${prefix}ticketlarım\` - Oluşturduğunuz ticketları listeler
              \`${prefix}help\` - Bu yardım mesajını gösterir
            `, false)
            .setThumbnail('https://i.imgur.com/pgTRpDd.png')
            .setFooter({ text: `${interaction.guild.name} | Ticket Sistemi Yardım` })
            .setTimestamp();
            
          // Ephemeral mesaj olarak gönder (sadece komutu kullanan kişi görür)
          return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        } catch (error) {
          console.error('Error showing help from button:', error);
          return interaction.reply({ content: 'Yardım bilgisi gösterilirken bir hata oluştu.', ephemeral: true });
        }
      } else if (interaction.customId === 'accept_ticket') {
        await acceptTicket(interaction);
      } else if (interaction.customId === 'reject_ticket') {
        await rejectTicket(interaction);
      } else if (interaction.customId === 'close_ticket') {
        await closeTicket(interaction);
      } else if (interaction.customId === 'reply_ticket') {
        await replyToTicket(interaction);
      }
    } else if (interaction.isSelectMenu()) {
      console.log(`Select menu interaction received: ${interaction.customId} by ${interaction.user.tag}`);
      
      if (interaction.customId === 'ticket_category') {
        try {
          const categoryId = parseInt(interaction.values[0]);
          
          // Açıklama beklemeden direkt ticket oluştur
          await interaction.update({ 
            content: 'Ticket oluşturuluyor...',
            components: [],
            ephemeral: true 
          });
          
          // Boş açıklama ile ticket oluştur
          const description = "";
          
          // Ticket oluştur
          const msg = {
            author: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            _interaction: interaction, // Interaction referansını ekleyelim
            reply: async (options) => {
              return await interaction.channel.send({
                content: options.content || null,
                embeds: options.embeds || null,
                allowedMentions: { parse: ['users'], everyone: false }
              });
            }
          };
          
          await handleTicketCreation(msg, categoryId, description);
        } catch (error) {
          console.error('Error creating ticket:', error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
              content: 'Ticket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
              ephemeral: true
            });
          } else {
            await interaction.reply({ 
              content: 'Ticket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
              ephemeral: true
            });
          }
        }
      } else if (interaction.customId === 'staff_role_select') {
        // Yetkili rol seçimi
        const selectedRoleId = interaction.values[0];
        const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
        
        if (!selectedRole) {
          return interaction.update({ content: 'Geçersiz rol seçimi. İşlem iptal edildi.', components: [] });
        }
        
        // Rolü kaydet
        await storage.setStaffRole(interaction.guild.id, selectedRoleId);
        
        // Ticket panelini oluştur
        const { embed, row } = await createTicketPanelEmbed(interaction.guild.id);
        
        // Panel var mı diye kontrol et
        try {
          // Son 25 mesajı ara
          const messages = await interaction.channel.messages.fetch({ limit: 25 });
          
          // Filtrele: bot tarafından gönderilen + embed içeren + ticket sistemine ait başlıklı
          const existingPanels = messages.filter(m => 
            m.author.id === client.user.id && 
            m.embeds.length > 0 && 
            (m.embeds[0].title === '🎟️ Futbol RP Ticket Paneli' || 
             m.embeds[0].title === '🎟️ Porsuk Support Ticket Sistemi' ||
             m.embeds[0].title.includes('Ticket') ||
             m.embeds[0].title.includes('ticket'))
          );
          
          if (existingPanels.size > 0) {
            // Tüm eski panelleri sil (ilk bulduğumuz dışında)
            if (existingPanels.size > 1) {
              const panelsToDelete = Array.from(existingPanels.values()).slice(1);
              for (const oldPanel of panelsToDelete) {
                await oldPanel.delete().catch(e => console.error('Panel silinirken hata:', e));
              }
            }
            
            // Kalan paneli güncelle
            const lastPanel = existingPanels.first();
            await lastPanel.edit({
              embeds: [embed],
              components: [row]
            });
          } else {
            // Yoksa yeni panel oluştur
            await interaction.channel.send({ 
              embeds: [embed], 
              components: [row],
              allowedMentions: { parse: [], everyone: false }
            });
          }
        } catch (fetchError) {
          console.error('Existing panels check error:', fetchError);
          // Hata durumunda yeni panel oluştur
          await interaction.channel.send({ 
            embeds: [embed], 
            components: [row],
            allowedMentions: { parse: [], everyone: false }
          });
        }
        
        // İşlem tamamlandı, eğer halihazırda güncellenmişse hata almamak için
        // silently continue - belki önceki interaction ile yapılmıştır
        try {
          await interaction.update({ content: `İşlem tamamlandı.`, components: [], ephemeral: true });
        } catch (error) {
          console.log('Update skipped - interaction may already be replied');
        }
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    try {
      const reply = { content: 'İşlem sırasında bir hata oluştu.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch (replyError) {
      console.error('Error replying to interaction:', replyError);
    }
  }
});

// Bot hazır olduğunda
client.once('ready', async () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log('Bot is fully initialized and ready to handle interactions');
  
  // Önce diskten kaydedilmiş verileri yükle
  console.log('Kaydedilmiş verileri diskten yükleniyor...');
  loadDataToMemory();
  
  // Default kategori yoksa ekleyelim
  if (memoryStorage.categories.size === 0) {
    defaultCategories.forEach(category => {
      memoryStorage.categories.set(category.id, category);
    });
    console.log('Default kategoriler hafızaya eklendi');
  }
  
  // Sunucular için ayarları hafızaya al (yetkili roller ve ticket numaraları)
  try {
    const guilds = client.guilds.cache.map(g => g.id);
    
    // Her bir sunucu için ayarları yükle
    for (const guildId of guilds) {
      const settings = await storage.getBotSettings(guildId);
      
      // Eğer yetkili rolü ayarlandıysa, hafızaya al
      if (settings.staff_role_id) {
        memoryStorage.staffRoles.set(guildId, settings.staff_role_id);
        console.log(`Sunucu ${guildId} için yetkili rolü hafızaya yüklendi: ${settings.staff_role_id}`);
      } else {
        console.log(`Sunucu ${guildId} için yetkili rolü ayarlanmamış.`);
      }
      
      // Ticket numaralarını hafızaya al (eğer diskten yüklenmemişse)
      if (settings.last_ticket_number && !memoryStorage.lastTicketNumbers.has(guildId)) {
        memoryStorage.lastTicketNumbers.set(guildId, settings.last_ticket_number);
        console.log(`Sunucu ${guildId} için son ticket numarası hafızaya yüklendi: ${settings.last_ticket_number}`);
      } else if (!memoryStorage.lastTicketNumbers.has(guildId)) {
        console.log(`Sunucu ${guildId} için henüz ticket oluşturulmamış.`);
      }
    }
    
    console.log('Bot ayarları başarıyla yüklendi.');
    
    // Diskten yüklenen verileri kullanarak tüm ticketları konsola yaz
    console.log(`Toplam ${memoryStorage.tickets.size} ticket hafızada bulunuyor.`);
    
    // Açık ticket kanallarını kontrol et ve izinleri düzelt
    await checkAndFixTicketPermissions();
    
    // 1 saat aralıklarla tüm ticket kanalların izinlerini yeniden kontrol etmek için interval ayarla
    setInterval(async () => {
      console.log('Periyodik ticket izinleri kontrol ediliyor...');
      await checkAndFixTicketPermissions();
    }, 60 * 60 * 1000); // 1 saatte bir kontrol et
    
    // 5 dakika aralıklarla verileri diske otomatik kaydet
    setInterval(() => {
      console.log('Ticket verileri diske otomatik kaydediliyor...');
      saveDataToDisk();
    }, 5 * 60 * 1000); // 5 dakikada bir otomatik kaydet
  } catch (error) {
    console.error('Bot ayarları yüklenirken hata oluştu:', error);
  }
  
  // Bot durumunu ayarla
  client.user.setActivity('Ticket Sistemi | .help', { type: 'WATCHING' });
});

// Bot error event
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// Bot warning event
client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

// Aktif ticket kanallarını kontrol edip izinleri düzelt
async function checkAndFixTicketPermissions() {
  console.log('Tüm açık ticket kanallarının izinleri kontrol ediliyor...');
  
  try {
    // Tüm sunucuları ve ticket kanallarını kontrol et
    const guilds = client.guilds.cache.values();
    
    // Her sunucu için ticket kanallarını bul
    for (const guild of guilds) {
      console.log(`Sunucu ID ${guild.id} (${guild.name}) kontrol ediliyor...`);
      
      // Ticket kanallarını bul ("ticket-" ile başlayan kanallar)
      const ticketChannels = guild.channels.cache.filter(channel => 
        channel.type === 'GUILD_TEXT' && 
        channel.name.startsWith('ticket-')
      );
      
      if (ticketChannels.size === 0) {
        console.log(`${guild.name} sunucusunda ticket kanalı bulunamadı.`);
        continue;
      }
      
      console.log(`${guild.name} sunucusunda ${ticketChannels.size} ticket kanalı bulundu. İzinler kontrol ediliyor...`);
      
      // Yetkili rolünü bul
      const staffRoleId = memoryStorage.staffRoles.get(guild.id) || 
                        (await storage.getBotSettings(guild.id)).staff_role_id;
      
      if (!staffRoleId) {
        console.log(`${guild.name} sunucusu için yetkili rolü bulunamadı! İzinler tam düzeltilemeyebilir.`);
      } else {
        console.log(`${guild.name} sunucusu için yetkili rolü ID: ${staffRoleId}`);
      }
      
      // Her ticket kanalı için izinleri düzelt
      let fixedCount = 0;
      let errorCount = 0;
      
      for (const [channelId, channel] of ticketChannels) {
        try {
          console.log(`Kanal "${channel.name}" için izinler kontrol ediliyor...`);
          
          // @everyone rolüne VIEW_CHANNEL iznini reddet (kesinlikle!)
          const everyoneRole = guild.roles.everyone;
          
          // Mevcut izinleri kontrol et
          const everyonePerms = channel.permissionOverwrites.cache.get(everyoneRole.id);
          
          if (!everyonePerms || !everyonePerms.deny.has(Permissions.FLAGS.VIEW_CHANNEL)) {
            console.log(`Kanal "${channel.name}" için @everyone için VIEW_CHANNEL izni kısıtlanmamış! Düzeltiliyor...`);
            
            // @everyone için VIEW_CHANNEL iznini açıkça reddet
            await channel.permissionOverwrites.edit(everyoneRole, {
              VIEW_CHANNEL: false,
              SEND_MESSAGES: false
            });
            
            // Bota tüm izinleri ver
            await channel.permissionOverwrites.edit(client.user.id, {
              VIEW_CHANNEL: true,
              SEND_MESSAGES: true,
              READ_MESSAGE_HISTORY: true,
              MANAGE_CHANNELS: true
            });
            
            // Yetkili rolüne izin ver (eğer varsa)
            if (staffRoleId) {
              await channel.permissionOverwrites.edit(staffRoleId, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                READ_MESSAGE_HISTORY: true,
                MANAGE_MESSAGES: true
              });
            }
            
            // İlgili kullanıcıyı bul - isimden ticket numarasını çıkar
            const ticketMatch = channel.name.match(/ticket-(\d+)/);
            if (ticketMatch && ticketMatch[1]) {
              // Ticket numarasından ticketı bul - önce channel_id ile ara
              const tickets = Array.from(memoryStorage.tickets.values());
              let ticket = tickets.find(t => t.channel_id === channel.id);
              
              // Kanal ID ile bulunamadıysa, numaraya göre dene
              if (!ticket) {
                const ticketNumber = parseInt(ticketMatch[1]);
                ticket = tickets.find(t => t.number === ticketNumber);
              }
              
              if (ticket) {
                // Kullanıcı ID'sini bul
                const user = ticket.user_id ? memoryStorage.users.get(ticket.user_id) : null;
                const userDiscordId = user ? user.discord_id : ticket.user_discord_id;
                
                if (userDiscordId) {
                  // Kullanıcı bulunduysa, kanala erişim izni ver
                  await channel.permissionOverwrites.edit(userDiscordId, {
                    VIEW_CHANNEL: true,
                    SEND_MESSAGES: true,
                    READ_MESSAGE_HISTORY: true
                  });
                  console.log(`Kanal "${channel.name}" için ticket açan kullanıcıya izinler verildi.`);
                  
                  // Hafızadaki ticket verisinde channel_id eksikse güncelle
                  if (!ticket.channel_id) {
                    ticket.channel_id = channel.id;
                    saveDataToDisk();
                    console.log(`Ticket ID ${ticket.id} için eksik channel_id güncellendi: ${channel.id}`);
                  }
                }
              }
            }
            
            fixedCount++;
            console.log(`Kanal "${channel.name}" izinleri düzeltildi.`);
          } else {
            console.log(`Kanal "${channel.name}" izinleri zaten doğru ayarlanmış.`);
          }
        } catch (channelError) {
          errorCount++;
          console.error(`Kanal "${channel.name}" izinleri düzeltilirken hata oluştu:`, channelError);
        }
      }
      
      console.log(`${guild.name} sunucusunda izin kontrolü tamamlandı: ${fixedCount} kanal düzeltildi, ${errorCount} kanalda hata oluştu.`);
    }
    
    console.log('Tüm sunucularda izin kontrolü tamamlandı.');
  } catch (error) {
    console.error('Ticket izinleri kontrol edilirken genel hata oluştu:', error);
  }
}

// Discord botunu başlat
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Bot login error:', err);
});