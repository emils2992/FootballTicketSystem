// index.js - Porsuk Ticket Bot - Discord.js v14 + Memory Storage
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
        ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, 
        TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, 
        Collection, ComponentType } = require('discord.js');
const express = require('express');

// Express server (Glitch'i uyanık tutmak için)
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Porsuk Support Bot çalışıyor!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Discord client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
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
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(date).toLocaleDateString('tr-TR', options);
}

// Storage functions
const storage = {
  async getBotSettings(guildId) {
    let settings = memoryStorage.botSettings.get(guildId);
    if (!settings) {
      settings = { guild_id: guildId, prefix: '.', last_ticket_number: 0 };
      memoryStorage.botSettings.set(guildId, settings);
    }
    return settings;
  },
  
  async setStaffRole(guildId, roleId) {
    memoryStorage.staffRoles.set(guildId, roleId);
    return roleId;
  },
  
  async getStaffRole(guildId) {
    return memoryStorage.staffRoles.get(guildId);
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
      return newUser;
    }
  },
  
  async getCategoryById(id) {
    return memoryStorage.categories.get(parseInt(id));
  },
  
  async createTicket(ticketData) {
    const { userId, categoryId, description, status = 'pending', channelId } = ticketData;
    
    const ticketId = ++memoryStorage.lastTicketId;
    
    const newTicket = {
      id: ticketId,
      user_id: userId,
      category_id: categoryId,
      staff_id: null,
      channel_id: channelId,
      description: description,
      status: status,
      reject_reason: null,
      created_at: new Date(),
      closed_at: null,
      updated_at: new Date()
    };
    
    memoryStorage.tickets.set(ticketId, newTicket);
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
    
    return ticket;
  },
  
  async rejectTicket(ticketId, rejectReason) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.status = 'rejected';
    ticket.reject_reason = rejectReason;
    ticket.updated_at = new Date();
    
    return ticket;
  },
  
  async closeTicket(ticketId) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.status = 'closed';
    ticket.closed_at = new Date();
    ticket.updated_at = new Date();
    
    return ticket;
  },
  
  async assignTicket(ticketId, staffId) {
    const ticket = memoryStorage.tickets.get(parseInt(ticketId));
    if (!ticket) return null;
    
    ticket.staff_id = staffId;
    ticket.updated_at = new Date();
    
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
  
  async getNextTicketNumber(guildId) {
    // Get or create ticket number for guild
    let ticketNumber = memoryStorage.lastTicketNumbers.get(guildId) || 0;
    
    // Increment
    ticketNumber++;
    
    // Save back
    memoryStorage.lastTicketNumbers.set(guildId, ticketNumber);
    
    // Update bot settings
    const settings = await this.getBotSettings(guildId);
    settings.last_ticket_number = ticketNumber;
    
    return ticketNumber;
  }
};

// Yardımcı fonksiyonlar
function isStaffMember(member) {
  // Kullanıcının server yöneticisi yetkisi varsa
  if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
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
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2) // Discord blurple color
    .setTitle('🎟️ Futbol RP Ticket Paneli')
    .setDescription(
      'Bir sorun, talep veya delikanlı gibi açıklaman mı var?\n\n' +
      '👇 Aşağıdaki seçeneklerle bir ticket oluşturabilirsin.'
    )
    .setImage('https://i.imgur.com/U78xRjt.png')
    .setFooter({ text: `Görkemli Ticket Sistemi | Prefix: ${prefix} | by Porsuk Support` });

  // Create buttons
  const createTicketButton = new ButtonBuilder()
    .setCustomId('create_ticket')
    .setLabel('Ticket Oluştur')
    .setEmoji('📬')
    .setStyle(ButtonStyle.Primary);
  
  const myTicketsButton = new ButtonBuilder()
    .setCustomId('my_tickets')
    .setLabel('Ticketlarım')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  // Add buttons to row
  const row = new ActionRowBuilder().addComponents(createTicketButton, myTicketsButton);

  return { embed, row };
}

async function createNewTicketEmbed(ticket) {
  // Get active staff members from database
  const activeStaff = await storage.getActiveStaffMembers();
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Yeni Ticket')
    .setThumbnail('https://i.imgur.com/pgTRpDd.png')
    .addFields(
      {
        name: '👤 Açan:',
        value: `<@${ticket.user_discord_id || 'Bilinmeyen Kullanıcı'}>`,
        inline: false
      },
      {
        name: '📂 Kategori:',
        value: `${ticket.category_emoji || '📌'} ${ticket.category_name || 'Genel Kategori'}`,
        inline: false
      },
      {
        name: '📝 Açıklama:',
        value: `"${ticket.description}"`,
        inline: false
      },
      {
        name: '📆 Açılış:',
        value: formatDate(ticket.created_at),
        inline: false
      }
    )
    .setImage('https://i.imgur.com/pgTRpDd.png');

  // Add staff section
  if (activeStaff.length > 0) {
    const validStaff = activeStaff.filter(staff => staff.discord_id);
    
    if (validStaff.length > 0) {
      const staffList = validStaff.map(staff => `• <@${staff.discord_id}>`).join('\n');
      const staffCount = validStaff.length;
      
      embed.addFields({
        name: `👮‍♂️ Yetkili Ekibi (${staffCount} Aktif Yetkili):`,
        value: staffList,
        inline: false
      });
    } else {
      embed.addFields({
        name: '👮‍♂️ Yetkili Ekibi:',
        value: 'Yetkililer yakında size yardımcı olacaklar.',
        inline: false
      });
    }
  } else {
    embed.addFields({
      name: '👮‍♂️ Yetkili Ekibi:',
      value: 'Yetkililer yakında size yardımcı olacaklar.',
      inline: false
    });
  }

  // Create buttons
  const replyButton = new ButtonBuilder()
    .setCustomId('reply_ticket')
    .setLabel('Yanıtla')
    .setEmoji('💬')
    .setStyle(ButtonStyle.Primary);
  
  const acceptButton = new ButtonBuilder()
    .setCustomId('accept_ticket')
    .setLabel('Kabul Et')
    .setEmoji('✅')
    .setStyle(ButtonStyle.Success);
  
  const rejectButton = new ButtonBuilder()
    .setCustomId('reject_ticket')
    .setLabel('Reddet')
    .setEmoji('⛔')
    .setStyle(ButtonStyle.Danger);
  
  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Kapat')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Secondary);

  // Create rows for buttons
  const row1 = new ActionRowBuilder().addComponents(acceptButton, rejectButton);
  const row2 = new ActionRowBuilder().addComponents(replyButton, closeButton);
  
  // Combine the rows
  const rows = [row1, row2];

  return { embed, rows, activeStaff };
}

function createTicketListEmbed(tickets) {
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
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
  // Check if user has staff or admin permissions
  if (!isStaffMember(message.member)) {
    return message.reply({ content: 'Bu komutu kullanabilmek için yetkili olmalısın delikanlı.' });
  }
  
  try {
    // Sunucudaki roller
    const roles = message.guild.roles.cache.filter(role => 
      !role.managed && role.id !== message.guild.id
    ).map(role => {
      return {
        label: role.name, 
        value: role.id,
        description: `ID: ${role.id}`
      };
    }).slice(0, 25); // Discord 25'ten fazla seçeneğe izin vermiyor
    
    // Seçim menüsü
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('staff_role_select')
      .setPlaceholder('Yetkili rolünü seçin')
      .addOptions(roles);
      
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await message.reply({ 
      content: 'Lütfen ticket sistemi için yetkili rolünü seçin:', 
      components: [row] 
    });
    
    // Rol seçimini bekle
    const filter = i => i.customId === 'staff_role_select' && i.user.id === message.author.id;
    
    try {
      const roleSelection = await message.channel.awaitMessageComponent({ filter, time: 60000 });
      const selectedRoleId = roleSelection.values[0];
      const selectedRole = message.guild.roles.cache.get(selectedRoleId);
      
      if (!selectedRole) {
        return message.channel.send('Geçersiz rol seçimi. İşlem iptal edildi.');
      }
      
      // Rolü kaydet
      await storage.setStaffRole(message.guild.id, selectedRoleId);
      
      // Ticket panelini oluştur
      const { embed, row } = await createTicketPanelEmbed(message.guild.id);
      await message.channel.send({ 
        content: `✅ Yetkili rolü olarak **${selectedRole.name}** ayarlandı! Bu rol her ticket açıldığında etiketlenecek.`,
        embeds: [embed], 
        components: [row] 
      });
      
      await roleSelection.update({ content: `Yetkili rolü olarak **${selectedRole.name}** seçildi!`, components: [] });
    } catch (error) {
      console.error('Role selection error:', error);
      // Rol seçimi için süre doldu mesajı kaldırıldı (kullanıcı isteği)
    }
  } catch (error) {
    console.error('Error creating ticket panel:', error);
    message.reply({ content: 'Ticket paneli oluşturulurken bir hata oluştu.' });
  }
}

async function handleTicketCommand(message) {
  try {
    // Kategori seçim menüsü oluştur
    const categories = await storage.getAllCategories();
    
    if (categories.length === 0) {
      return message.reply({ content: 'Henüz hiç ticket kategorisi yapılandırılmamış.' });
    }
    
    // SelectMenu oluştur
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Bir kategori seçin...');
    
    categories.forEach(category => {
      selectMenu.addOptions({
        label: category.name,
        value: category.id.toString(),
        description: category.description || 'Açıklama yok',
        emoji: category.emoji
      });
    });
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
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
      
      // Modal oluştur
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${categoryId}`)
        .setTitle('Ticket Oluştur');
      
      const ticketDescription = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Açıklama')
        .setPlaceholder('Ticket hakkında detayları buraya yazın...')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(1000)
        .setStyle(TextInputStyle.Paragraph);
      
      const firstRow = new ActionRowBuilder().addComponents(ticketDescription);
      
      modal.addComponents(firstRow);
      
      // Modalı göster
      await categorySelection.showModal(modal);
      
    } catch (error) {
      console.error('Error awaiting category selection:', error);
      // Kategori seçimi için süre doldu mesajı kaldırıldı (kullanıcı isteği)
    }
  } catch (error) {
    console.error('Error creating ticket command:', error);
    message.reply({ content: 'Ticket oluşturulurken bir hata oluştu.' });
  }
}

async function handleTicketCreation(interaction, categoryId, description) {
  try {
    const user = interaction.user;
    const guild = interaction.guild;
    
    // Kullanıcıyı veritabanında oluştur veya güncelle
    const userData = {
      discordId: user.id,
      username: user.username,
      avatarUrl: user.displayAvatarURL()
    };
    
    const dbUser = await storage.createOrUpdateUser(userData);
    
    if (!dbUser) {
      return interaction.reply({ content: 'Kullanıcı bilgileri kaydedilemedi.', ephemeral: true });
    }
    
    // Kategoriyi kontrol et
    const category = await storage.getCategoryById(categoryId);
    
    if (!category) {
      return interaction.reply({ content: 'Seçilen kategori bulunamadı.', ephemeral: true });
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
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id, // Ticket oluşturan kullanıcı
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: staffRoleId, // Staff rolü
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: client.user.id, // Bot kendisi
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          }
        ]
      });
      
      // Ticket'ı veritabanına kaydet
      const ticketData = {
        userId: dbUser.id,
        categoryId: category.id,
        description: description,
        channelId: ticketChannel.id
      };
      
      const ticket = await storage.createTicket(ticketData);
      
      if (!ticket) {
        return interaction.followUp({ content: 'Ticket kaydedilemedi.', ephemeral: true });
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
      
      // Yetkili rolünü etiketle ve mesajı gönder
      await ticketChannel.send({ 
        content: `<@&${staffRoleId}> Yeni bir ticket oluşturuldu!`, 
        embeds: [embed], 
        components: rows 
      });
      
      // Kullanıcıya bilgi ver (başarı mesajı kaldırıldı, kullanıcı isteği)
      await interaction.followUp({ content: `Ticket işleminiz tamamlandı.`, ephemeral: true });
      
    } catch (error) {
      console.error('Error creating ticket channel:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'Ticket kanalı oluşturulurken bir hata oluştu.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Ticket kanalı oluşturulurken bir hata oluştu.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Error in ticket creation:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Ticket oluşturulurken bir hata oluştu.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Ticket oluşturulurken bir hata oluştu.', ephemeral: true });
    }
  }
}

async function handleTicketlarimCommand(message) {
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
      
      return message.reply({ content: 'Henüz bir ticket oluşturmamışsınız. .ticket komutu ile yeni bir ticket oluşturabilirsiniz.', });
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

async function handleHelpCommand(message) {
  try {
    // Prefix'i al (bot ayarlarından veya varsayılan)
    const settings = await storage.getBotSettings(message.guild.id);
    const prefix = settings?.prefix || '.';
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Porsuk Support Bot Komutları')
      .setDescription(`Aşağıdaki komutları ${prefix} önekiyle kullanabilirsiniz.`)
      .addFields(
        {
          name: `${prefix}ticketkur`,
          value: 'Ticket sistemini kur ve paneli gönder (Sadece yetkililer)',
          inline: false
        },
        {
          name: `${prefix}ticket`,
          value: 'Yeni bir ticket oluştur',
          inline: false
        },
        {
          name: `${prefix}ticketlarım`,
          value: 'Oluşturduğunuz ticketları listele',
          inline: false
        },
        {
          name: `${prefix}help`,
          value: 'Bu yardım mesajını göster',
          inline: false
        }
      )
      .setFooter({ text: 'Porsuk Support Ticket Sistemi' });
    
    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error showing help:', error);
    message.reply({ content: 'Yardım mesajı gösterilirken bir hata oluştu.' });
  }
}

// Modal yanıt işleyicisi
async function handleModalSubmit(interaction) {
  if (interaction.customId.startsWith('ticket_modal_')) {
    const categoryId = parseInt(interaction.customId.replace('ticket_modal_', ''));
    const description = interaction.fields.getTextInputValue('ticket_description');
    
    // Ticket oluştur
    await handleTicketCreation(interaction, categoryId, description);
  } else if (interaction.customId === 'reject_ticket_modal') {
    // Red nedenini işle
    const rejectReason = interaction.fields.getTextInputValue('reject_reason');
    
    // Ticket'ı bul
    const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
    
    if (!ticketInfo) {
      return interaction.reply({ content: 'Ticket bilgisi bulunamadı.', ephemeral: true });
    }
    
    // Ticket'ı reddet
    await storage.rejectTicket(ticketInfo.id, rejectReason);
    
    // Kullanıcıya DM gönder
    try {
      const ticketUser = await client.users.fetch(ticketInfo.user_discord_id);
      
      if (ticketUser) {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xED4245) // Discord red
          .setTitle('❌ Ticketınız Reddedildi')
          .setDescription(`"${ticketInfo.description}" açıklamalı ticketınız yetkili tarafından reddedildi.`)
          .addFields(
            {
              name: '📂 Kategori:',
              value: `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`,
              inline: false
            },
            {
              name: '⛔ Red Nedeni:',
              value: rejectReason,
              inline: false
            },
            {
              name: '👮‍♂️ Reddeden Yetkili:',
              value: `@${interaction.user.username}`,
              inline: false
            }
          )
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
    
    // Kanala bildirimde bulun
    await interaction.reply({ content: `❌ Ticket <@${interaction.user.id}> tarafından reddedildi. <@${ticketInfo.user_discord_id}> bilgilendirildi.` });
  } else if (interaction.customId === 'reply_ticket_modal') {
    // Yanıtı işle
    const replyText = interaction.fields.getTextInputValue('reply_content');
    
    // Ticket'ı bul
    const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
    
    if (!ticketInfo) {
      return interaction.reply({ content: 'Ticket bilgisi bulunamadı.', ephemeral: true });
    }
    
    // Kullanıcıyı veritabanında oluştur veya güncelle
    const userData = {
      discordId: interaction.user.id,
      username: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL()
    };
    
    const dbUser = await storage.createOrUpdateUser(userData);
    
    if (!dbUser) {
      return interaction.reply({ content: 'Kullanıcı bilgileri kaydedilemedi.', ephemeral: true });
    }
    
    // Yanıtı kaydet
    const responseData = {
      ticketId: ticketInfo.id,
      userId: dbUser.id,
      message: replyText
    };
    
    await storage.addResponse(responseData);
    
    // Yanıt embed'i oluştur
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(replyText)
      .setTimestamp();
    
    // Kanala bildirimde bulun
    await interaction.reply({ embeds: [embed] });
    
    // Ticket sahibine DM gönder (eğer yanıt veren kişi ticket sahibi değilse)
    if (interaction.user.id !== ticketInfo.user_discord_id) {
      try {
        const ticketUser = await client.users.fetch(ticketInfo.user_discord_id);
        
        if (ticketUser) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💬 Ticketınıza Yanıt Geldi')
            .setDescription(`"${ticketInfo.description}" açıklamalı ticketınıza yanıt geldi.`)
            .addFields(
              {
                name: '👤 Yanıtlayan:',
                value: `@${interaction.user.username}`,
                inline: false
              },
              {
                name: '📝 Yanıt:',
                value: replyText,
                inline: false
              }
            )
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
    }
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
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57F287) // Discord green
          .setTitle('✅ Ticketınız Kabul Edildi')
          .setDescription(`"${ticketInfo.description}" açıklamalı ticketınız yetkili tarafından kabul edildi.`)
          .addFields(
            {
              name: '📂 Kategori:',
              value: `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`,
              inline: false
            },
            {
              name: '👮‍♂️ İlgilenen Yetkili:',
              value: `@${interaction.user.username}`,
              inline: false
            }
          )
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
    
    // Kanala bildirimde bulun
    await interaction.followUp({ content: `✅ Ticket <@${interaction.user.id}> tarafından kabul edildi. <@${ticketInfo.user_discord_id}> bilgilendirildi.` });
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
    // Modal oluştur
    const modal = new ModalBuilder()
      .setCustomId('reject_ticket_modal')
      .setTitle('Ticket Reddetme Nedeni');
    
    const rejectReason = new TextInputBuilder()
      .setCustomId('reject_reason')
      .setLabel('Red Nedeni')
      .setPlaceholder('Ticketı reddetme nedeninizi belirtin...')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph);
    
    const firstRow = new ActionRowBuilder().addComponents(rejectReason);
    
    modal.addComponents(firstRow);
    
    // Modalı göster
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing reject modal:', error);
    await interaction.reply({ content: 'Ticket reddetme modalı gösterilirken bir hata oluştu.', ephemeral: true });
  }
}

async function closeTicket(interaction) {
  try {
    await interaction.deferReply();
    
    // Ticket'ı bul
    const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
    
    if (!ticketInfo) {
      return interaction.followUp({ content: 'Ticket bilgisi bulunamadı.' });
    }
    
    // Ticket'ı kapat
    await storage.closeTicket(ticketInfo.id);
    
    // Kanala bildirimde bulun
    await interaction.followUp({ content: `✅ Ticket <@${interaction.user.id}> tarafından kapatıldı.` });
    
    // Kanalı arşivle (5 saniye bekle)
    setTimeout(async () => {
      try {
        await interaction.channel.send({ content: 'Bu ticket kapatıldı ve birazdan silinecek.' });
        
        // 5 saniye sonra kanalı sil
        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (deleteError) {
            console.error('Error deleting channel:', deleteError);
          }
        }, 5000);
      } catch (archiveError) {
        console.error('Error archiving channel:', archiveError);
      }
    }, 5000);
  } catch (error) {
    console.error('Error closing ticket:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Ticket kapatılırken bir hata oluştu.' });
    } else {
      await interaction.followUp({ content: 'Ticket kapatılırken bir hata oluştu.' });
    }
  }
}

async function replyToTicket(interaction) {
  try {
    // Modal oluştur
    const modal = new ModalBuilder()
      .setCustomId('reply_ticket_modal')
      .setTitle('Ticketa Yanıt Ver');
    
    const replyContent = new TextInputBuilder()
      .setCustomId('reply_content')
      .setLabel('Yanıt')
      .setPlaceholder('Yanıtınızı buraya yazın...')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph);
    
    const firstRow = new ActionRowBuilder().addComponents(replyContent);
    
    modal.addComponents(firstRow);
    
    // Modalı göster
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing reply modal:', error);
    await interaction.reply({ content: 'Yanıt modalı gösterilirken bir hata oluştu.', ephemeral: true });
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
    
    console.log(`Command received: ${command} by ${message.author.tag}`);
    
    // Komutları işle
    if (command === 'ping') {
      message.reply({ content: `Pong! Bot gecikmesi: ${client.ws.ping}ms` });
    } else if (command === 'ticketkur' || command === 'ticketkurpaneli') {
      await handleTicketKurCommand(message);
    } else if (command === 'ticket') {
      await handleTicketCommand(message);
    } else if (command === 'ticketlarım' || command === 'ticketlarim') {
      await handleTicketlarimCommand(message);
    } else if (command === 'help' || command === 'yardım' || command === 'yardim') {
      await handleHelpCommand(message);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    try {
      message.reply({ content: 'Komut işlenirken bir hata oluştu.' });
    } catch (replyError) {
      console.error('Error replying to message:', replyError);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Button etkileşimleri
    if (interaction.isButton()) {
      console.log(`Button interaction received: ${interaction.customId} by ${interaction.user.tag}`);
      
      if (interaction.customId === 'create_ticket') {
        // Kategori seçim menüsünü göster
        const categories = await storage.getAllCategories();
        
        if (categories.length === 0) {
          return interaction.reply({ content: 'Henüz hiç ticket kategorisi yapılandırılmamış.', ephemeral: true });
        }
        
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_category')
          .setPlaceholder('Bir kategori seçin...');
        
        categories.forEach(category => {
          selectMenu.addOptions({
            label: category.name,
            value: category.id.toString(),
            description: category.description || 'Açıklama yok',
            emoji: category.emoji
          });
        });
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
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
      } else if (interaction.customId === 'accept_ticket') {
        await acceptTicket(interaction);
      } else if (interaction.customId === 'reject_ticket') {
        await rejectTicket(interaction);
      } else if (interaction.customId === 'close_ticket') {
        await closeTicket(interaction);
      } else if (interaction.customId === 'reply_ticket') {
        await replyToTicket(interaction);
      }
    } 
    // Select menu etkileşimleri
    else if (interaction.isStringSelectMenu()) {
      console.log(`Select menu interaction received: ${interaction.customId} by ${interaction.user.tag}`);
      
      if (interaction.customId === 'ticket_category') {
        const categoryId = parseInt(interaction.values[0]);
        
        // Modal oluştur
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${categoryId}`)
          .setTitle('Ticket Oluştur');
        
        const ticketDescription = new TextInputBuilder()
          .setCustomId('ticket_description')
          .setLabel('Açıklama')
          .setPlaceholder('Ticket hakkında detayları buraya yazın...')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(1000)
          .setStyle(TextInputStyle.Paragraph);
        
        const firstRow = new ActionRowBuilder().addComponents(ticketDescription);
        
        modal.addComponents(firstRow);
        
        // Modalı göster
        await interaction.showModal(modal);
      }
    } 
    // Modal submit etkileşimleri
    else if (interaction.isModalSubmit()) {
      console.log(`Modal submit received: ${interaction.customId} by ${interaction.user.tag}`);
      await handleModalSubmit(interaction);
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
client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log('Bot is fully initialized and ready to handle interactions');
  
  // Default kategori yoksa ekleyelim
  if (memoryStorage.categories.size === 0) {
    defaultCategories.forEach(category => {
      memoryStorage.categories.set(category.id, category);
    });
    console.log('Default categories added to memory storage');
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

// Discord botunu başlat
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Bot login error:', err);
});