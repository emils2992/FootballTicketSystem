// index.js - Porsuk Ticket Bot - Glitch-optimized version
import { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import pg from 'pg';
const { Pool } = pg;
import express from 'express';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Glitch'i uyanık tutmak için Express sunucusu
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Porsuk Support Bot çalışıyor!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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

// Helper functions
function formatDate(date) {
  if (!date) return 'Bilinmiyor';
  return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: tr });
}

// DB access functions
const storage = {
  async getBotSettings(guildId) {
    try {
      const result = await pool.query('SELECT * FROM bot_settings WHERE guild_id = $1', [guildId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting bot settings:', error);
      return null;
    }
  },
  
  async getAllCategories() {
    try {
      const result = await pool.query('SELECT * FROM ticket_categories ORDER BY id ASC');
      return result.rows;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  },
  
  async getUserByDiscordId(discordId) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },
  
  async createOrUpdateUser(userData) {
    try {
      const { discordId, username, avatarUrl } = userData;
      
      // Check if user exists
      const existingUser = await this.getUserByDiscordId(discordId);
      
      if (existingUser) {
        // Update user
        const result = await pool.query(
          'UPDATE users SET username = $1, avatar_url = $2, updated_at = NOW() WHERE discord_id = $3 RETURNING *',
          [username, avatarUrl, discordId]
        );
        return result.rows[0];
      } else {
        // Create new user
        const result = await pool.query(
          'INSERT INTO users (discord_id, username, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
          [discordId, username, avatarUrl]
        );
        return result.rows[0];
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return null;
    }
  },
  
  async getCategoryById(id) {
    try {
      const result = await pool.query('SELECT * FROM ticket_categories WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      console.error('Error getting category:', error);
      return null;
    }
  },
  
  async createTicket(ticketData) {
    try {
      const { userId, categoryId, description, status = 'pending', channelId } = ticketData;
      
      const result = await pool.query(
        'INSERT INTO tickets (user_id, category_id, description, status, created_at, channel_id) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING *',
        [userId, categoryId, description, status, channelId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating ticket:', error);
      return null;
    }
  },
  
  async getTicketById(id) {
    try {
      const result = await pool.query(`
        SELECT t.*, tc.name as category_name, tc.emoji as category_emoji, u.username as user_username, u.discord_id as user_discord_id, 
        a.username as staff_username, a.discord_id as staff_discord_id
        FROM tickets t 
        LEFT JOIN ticket_categories tc ON t.category_id = tc.id 
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.staff_id = a.id
        WHERE t.id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting ticket:', error);
      return null;
    }
  },
  
  async getTicketByChannelId(channelId) {
    try {
      const result = await pool.query(`
        SELECT t.*, tc.name as category_name, tc.emoji as category_emoji, u.username as user_username, u.discord_id as user_discord_id, 
        a.username as staff_username, a.discord_id as staff_discord_id
        FROM tickets t 
        LEFT JOIN ticket_categories tc ON t.category_id = tc.id 
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.staff_id = a.id
        WHERE t.channel_id = $1
      `, [channelId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting ticket by channel ID:', error);
      return null;
    }
  },
  
  async getTicketsByUserId(userId) {
    try {
      const result = await pool.query(`
        SELECT t.*, tc.name as category_name, tc.emoji as category_emoji
        FROM tickets t 
        LEFT JOIN ticket_categories tc ON t.category_id = tc.id 
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
      `, [userId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting tickets by user ID:', error);
      return [];
    }
  },
  
  async acceptTicket(ticketId) {
    try {
      const result = await pool.query(
        'UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *',
        ['accepted', ticketId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error accepting ticket:', error);
      return null;
    }
  },
  
  async rejectTicket(ticketId, rejectReason) {
    try {
      const result = await pool.query(
        'UPDATE tickets SET status = $1, reject_reason = $2 WHERE id = $3 RETURNING *',
        ['rejected', rejectReason, ticketId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      return null;
    }
  },
  
  async closeTicket(ticketId) {
    try {
      const result = await pool.query(
        'UPDATE tickets SET status = $1, closed_at = NOW() WHERE id = $2 RETURNING *',
        ['closed', ticketId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error closing ticket:', error);
      return null;
    }
  },
  
  async assignTicket(ticketId, staffId) {
    try {
      const result = await pool.query(
        'UPDATE tickets SET staff_id = $1 WHERE id = $2 RETURNING *',
        [staffId, ticketId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error assigning ticket:', error);
      return null;
    }
  },
  
  async addResponse(responseData) {
    try {
      const { ticketId, userId, message } = responseData;
      
      const result = await pool.query(
        'INSERT INTO ticket_responses (ticket_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [ticketId, userId, message]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding response:', error);
      return null;
    }
  },
  
  async getResponsesByTicketId(ticketId) {
    try {
      const result = await pool.query(`
        SELECT tr.*, u.username, u.discord_id
        FROM ticket_responses tr
        LEFT JOIN users u ON tr.user_id = u.id
        WHERE tr.ticket_id = $1
        ORDER BY tr.created_at ASC
      `, [ticketId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting responses:', error);
      return [];
    }
  },
  
  async getActiveStaffMembers() {
    try {
      // Basit bir örnek - gerçek uygulamada bu rolü veya izinleri kontrol etmelisiniz
      const result = await pool.query(`
        SELECT * FROM users 
        WHERE is_staff = TRUE AND last_active > NOW() - INTERVAL '1 day'
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting active staff:', error);
      return [];
    }
  },
  
  async getNextTicketNumber(guildId) {
    try {
      // Önce mevcut guild ayarlarını al
      const settings = await this.getBotSettings(guildId);
      
      let ticketNumber = 1;
      
      if (settings && settings.last_ticket_number !== null) {
        // Son ticket numarasını 1 arttır
        ticketNumber = settings.last_ticket_number + 1;
        
        // Son ticket numarasını güncelle
        await pool.query(
          'UPDATE bot_settings SET last_ticket_number = $1 WHERE guild_id = $2',
          [ticketNumber, guildId]
        );
      } else {
        // Guild ayarları yoksa oluştur
        await pool.query(
          'INSERT INTO bot_settings (guild_id, last_ticket_number) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET last_ticket_number = $2',
          [guildId, ticketNumber]
        );
      }
      
      return ticketNumber;
    } catch (error) {
      console.error('Error getting next ticket number:', error);
      return 1; // Hata durumunda 1 dön
    }
  }
};

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
        value: `@${ticket.user_username || 'Bilinmeyen Kullanıcı'}`,
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
  // Check if user has admin permissions
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply('Bu komutu kullanabilmek için yönetici yetkisine sahip olmalısın delikanlı.');
  }
  
  try {
    const { embed, row } = await createTicketPanelEmbed(message.guild.id);
    const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
    
    message.reply('✅ Ticket paneli başarıyla oluşturuldu!');
  } catch (error) {
    console.error('Error creating ticket panel:', error);
    message.reply('Ticket paneli oluşturulurken bir hata oluştu.');
  }
}

async function handleTicketCommand(message) {
  try {
    // Kategori seçim menüsü oluştur
    const categories = await storage.getAllCategories();
    
    if (categories.length === 0) {
      return message.reply('Henüz hiç ticket kategorisi yapılandırılmamış.');
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
      
      await categorySelection.showModal(modal);
      
      // Modal submit olayını bekle
      const filter = i => i.customId === `ticket_modal_${categoryId}` && i.user.id === message.author.id;
      
      try {
        const modalSubmit = await categorySelection.awaitModalSubmit({ filter, time: 120000 });
        
        await handleTicketCreation(modalSubmit, categoryId);
      } catch (error) {
        console.error('Error waiting for modal submission:', error);
        if (error.name === 'Error' && error.message.includes('time')) {
          await message.followUp({ content: 'Ticket oluşturma süresi doldu.', ephemeral: true });
        }
      }
    } catch (error) {
      console.error('Error awaiting category selection:', error);
      if (error.name === 'Error' && error.message.includes('time')) {
        await message.followUp({ content: 'Kategori seçimi zaman aşımına uğradı.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Error creating ticket command:', error);
    message.reply('Ticket oluşturulurken bir hata oluştu.');
  }
}

async function handleTicketCreation(modalInteraction, categoryId) {
  try {
    await modalInteraction.deferReply({ ephemeral: true });
    
    const description = modalInteraction.fields.getTextInputValue('ticket_description');
    const user = modalInteraction.user;
    const guild = modalInteraction.guild;
    
    // Kullanıcıyı veritabanında oluştur veya güncelle
    const userData = {
      discordId: user.id,
      username: user.username,
      avatarUrl: user.displayAvatarURL()
    };
    
    const dbUser = await storage.createOrUpdateUser(userData);
    
    if (!dbUser) {
      return modalInteraction.followUp({ content: 'Kullanıcı bilgileri kaydedilemedi.', ephemeral: true });
    }
    
    // Kategoriyi kontrol et
    const category = await storage.getCategoryById(categoryId);
    
    if (!category) {
      return modalInteraction.followUp({ content: 'Seçilen kategori bulunamadı.', ephemeral: true });
    }
    
    // Ticket numarasını al
    const ticketNumber = await storage.getNextTicketNumber(guild.id);
    
    // Ticket kanalı oluştur
    const channelName = `ticket-${ticketNumber}`;
    
    try {
      // Staff rolünü al (bot ayarlarından veya sabit bir ID ile)
      // NOT: Bu değeri kendi sunucunuza göre değiştirin
      const staffRoleId = '123456789012345678'; // Gerçek bir rol ID'si ile değiştir
      
      // Kanal oluştur ve izinleri ayarla
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id, // Ticket oluşturan
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
        return modalInteraction.followUp({ content: 'Ticket veritabanına kaydedilemedi.', ephemeral: true });
      }
      
      // Ticket channel mesajını oluştur
      const ticketInfo = {
        id: ticket.id,
        category_name: category.name,
        category_emoji: category.emoji,
        user_username: dbUser.username,
        description: description,
        created_at: ticket.created_at
      };
      
      const { embed, rows } = await createNewTicketEmbed(ticketInfo);
      
      // Staff rolünü etiketle
      await ticketChannel.send({ content: `<@&${staffRoleId}> Yeni bir ticket oluşturuldu!`, embeds: [embed], components: rows });
      
      await modalInteraction.followUp({ content: `✅ Ticket başarıyla oluşturuldu! <#${ticketChannel.id}>`, ephemeral: true });
      
    } catch (error) {
      console.error('Error creating ticket channel:', error);
      await modalInteraction.followUp({ content: 'Ticket kanalı oluşturulurken bir hata oluştu.', ephemeral: true });
    }
  } catch (error) {
    console.error('Error in ticket creation:', error);
    if (!modalInteraction.replied && !modalInteraction.deferred) {
      await modalInteraction.reply({ content: 'Ticket oluşturulurken bir hata oluştu.', ephemeral: true });
    } else {
      await modalInteraction.followUp({ content: 'Ticket oluşturulurken bir hata oluştu.', ephemeral: true });
    }
  }
}

async function handleTicketlarimCommand(message) {
  try {
    // Kullanıcıyı veritabanında bul
    const user = await storage.getUserByDiscordId(message.author.id);
    
    if (!user) {
      return message.reply('Henüz bir hesabınız oluşturulmamış, önce bir ticket oluşturun.');
    }
    
    // Kullanıcının ticketlarını al
    const tickets = await storage.getTicketsByUserId(user.id);
    
    // Embed oluştur
    const embed = createTicketListEmbed(tickets);
    
    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error listing tickets:', error);
    message.reply('Ticketlar listelenirken bir hata oluştu.');
  }
}

async function handleHelpCommand(message) {
  try {
    // Prefix'i al (bot ayarlarından)
    const settings = await storage.getBotSettings(message.guild.id);
    const prefix = settings?.prefix || '.';
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Porsuk Support Bot Komutları')
      .setDescription(`Aşağıdaki komutları ${prefix} önekiyle kullanabilirsiniz.`)
      .addFields(
        {
          name: `${prefix}ticketkur`,
          value: 'Ticket sistemini kur ve paneli gönder (Sadece yöneticiler)',
          inline: false
        },
        {
          name: `${prefix}ticketkurpaneli`,
          value: 'Sadece ticket panelini gönder (Sadece yöneticiler)',
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
    message.reply('Yardım mesajı gösterilirken bir hata oluştu.');
  }
}

// Button Interactions
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
          .addFields({
            name: '📂 Kategori:',
            value: `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`,
            inline: false
          }, {
            name: '👮‍♂️ İlgilenen Yetkili:',
            value: `@${interaction.user.username}`,
            inline: false
          })
          .setFooter({ text: `Ticket ID: ${ticketInfo.id}` })
          .setTimestamp();
        
        await ticketUser.send({ embeds: [dmEmbed] });
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
    // Modal göster
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
    
    await interaction.showModal(modal);
    
    // Modal submit olayını bekle
    const filter = i => i.customId === 'reject_ticket_modal' && i.user.id === interaction.user.id;
    
    try {
      const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120000 });
      
      await modalSubmit.deferReply();
      
      const rejectReasonText = modalSubmit.fields.getTextInputValue('reject_reason');
      
      // Ticket'ı bul
      const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
      
      if (!ticketInfo) {
        return modalSubmit.followUp({ content: 'Ticket bilgisi bulunamadı.' });
      }
      
      // Ticket'ı reddet
      await storage.rejectTicket(ticketInfo.id, rejectReasonText);
      
      // Kullanıcıya DM gönder
      try {
        const ticketUser = await client.users.fetch(ticketInfo.user_discord_id);
        
        if (ticketUser) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0xED4245) // Discord red
            .setTitle('❌ Ticketınız Reddedildi')
            .setDescription(`"${ticketInfo.description}" açıklamalı ticketınız yetkili tarafından reddedildi.`)
            .addFields({
              name: '📂 Kategori:',
              value: `${ticketInfo.category_emoji || '📌'} ${ticketInfo.category_name || 'Genel Kategori'}`,
              inline: false
            }, {
              name: '⛔ Red Nedeni:',
              value: rejectReasonText,
              inline: false
            }, {
              name: '👮‍♂️ Reddeden Yetkili:',
              value: `@${interaction.user.username}`,
              inline: false
            })
            .setFooter({ text: `Ticket ID: ${ticketInfo.id}` })
            .setTimestamp();
          
          await ticketUser.send({ embeds: [dmEmbed] });
        }
      } catch (dmError) {
        console.error('DM send error:', dmError);
        // DM gönderilmezse kanalda devam et
      }
      
      // Kanala bildirimde bulun
      await modalSubmit.followUp({ content: `❌ Ticket <@${interaction.user.id}> tarafından reddedildi. <@${ticketInfo.user_discord_id}> bilgilendirildi.` });
      
    } catch (error) {
      console.error('Error awaiting modal submission:', error);
      if (error.name === 'Error' && error.message.includes('time')) {
        await interaction.followUp({ content: 'Red nedeni girme süresi doldu.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Error rejecting ticket:', error);
    await interaction.reply({ content: 'Ticket reddedilirken bir hata oluştu.', ephemeral: true });
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
        await interaction.channel.send('Bu ticket kapatıldı ve birazdan arşivlenecek.');
        
        // Kanalı arşivle veya sil
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
    // Modal göster
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
    
    await interaction.showModal(modal);
    
    // Modal submit olayını bekle
    const filter = i => i.customId === 'reply_ticket_modal' && i.user.id === interaction.user.id;
    
    try {
      const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120000 });
      
      await modalSubmit.deferReply();
      
      const replyText = modalSubmit.fields.getTextInputValue('reply_content');
      
      // Ticket'ı bul
      const ticketInfo = await storage.getTicketByChannelId(interaction.channel.id);
      
      if (!ticketInfo) {
        return modalSubmit.followUp({ content: 'Ticket bilgisi bulunamadı.' });
      }
      
      // Kullanıcıyı veritabanında oluştur veya güncelle
      const userData = {
        discordId: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL()
      };
      
      const dbUser = await storage.createOrUpdateUser(userData);
      
      if (!dbUser) {
        return modalSubmit.followUp({ content: 'Kullanıcı bilgileri kaydedilemedi.' });
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
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setDescription(replyText)
        .setTimestamp();
      
      // Kanala bildirimde bulun
      await modalSubmit.followUp({ embeds: [embed] });
      
      // Ticket sahibine DM gönder (eğer yanıt veren kişi ticket sahibi değilse)
      if (interaction.user.id !== ticketInfo.user_discord_id) {
        try {
          const ticketUser = await client.users.fetch(ticketInfo.user_discord_id);
          
          if (ticketUser) {
            const dmEmbed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('💬 Ticketınıza Yanıt Geldi')
              .setDescription(`"${ticketInfo.description}" açıklamalı ticketınıza yanıt geldi.`)
              .addFields({
                name: '👤 Yanıtlayan:',
                value: `@${interaction.user.username}`,
                inline: false
              }, {
                name: '📝 Yanıt:',
                value: replyText,
                inline: false
              })
              .setFooter({ text: `Ticket ID: ${ticketInfo.id}` })
              .setTimestamp();
            
            await ticketUser.send({ embeds: [dmEmbed] });
          }
        } catch (dmError) {
          console.error('DM send error:', dmError);
          // DM gönderilmezse kanalda devam et
        }
      }
    } catch (error) {
      console.error('Error awaiting modal submission:', error);
      if (error.name === 'Error' && error.message.includes('time')) {
        await interaction.followUp({ content: 'Yanıt verme süresi doldu.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Error replying to ticket:', error);
    await interaction.reply({ content: 'Yanıt gönderilirken bir hata oluştu.', ephemeral: true });
  }
}

// Event handlers
client.on('messageCreate', async (message) => {
  // Botun mesajlarını ve önek olmayan mesajları yoksay
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  
  // Komutu ve argümanları ayır
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  // Komutları işle
  if (command === 'ping') {
    message.reply(`Pong! Bot gecikmesi: ${client.ws.ping}ms`);
  } else if (command === 'ticketkur' || command === 'ticketkurpaneli') {
    await handleTicketKurCommand(message);
  } else if (command === 'ticket') {
    await handleTicketCommand(message);
  } else if (command === 'ticketlarım' || command === 'ticketlarim') {
    await handleTicketlarimCommand(message);
  } else if (command === 'help' || command === 'yardım' || command === 'yardim') {
    await handleHelpCommand(message);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Buton etkileşimlerini işle
    if (interaction.isButton()) {
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
          return interaction.reply({ content: 'Henüz bir hesabınız oluşturulmamış, önce bir ticket oluşturun.', ephemeral: true });
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
    
    // Select menu etkileşimlerini işle
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category') {
        await interaction.deferUpdate();
        
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
        
        await interaction.showModal(modal);
      }
    }
    
    // Modal etkileşimlerini işle
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_modal_')) {
        const categoryId = parseInt(interaction.customId.replace('ticket_modal_', ''));
        await handleTicketCreation(interaction, categoryId);
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
client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log('Bot is fully initialized and ready to handle interactions');
  
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
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Bot login error:', err);
});