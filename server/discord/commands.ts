import { 
  Message, 
  Client, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  MessageComponentInteraction,
  GuildMember,
  GuildChannel,
  ChannelSelectMenuBuilder,
  ChannelSelectMenuInteraction,
  MessageCreateOptions,
  TextChannel
} from 'discord.js';
import { log } from '../vite';
import { storage } from '../storage';
import { 
  createTicketPanelEmbed, 
  createTicketCategoryOptions, 
  createNewTicketEmbed,
  createTicketListEmbed,
  createTicketLogEmbed
} from './embeds';
//import { getWelcomeImage } from './welcome-card';

// Handle all message commands
export async function handleCommands(message: Message, prefix: string, client: Client) {
  const commandBody = message.content.slice(prefix.length).trim();
  const args = commandBody.split(' ');
  const command = args.shift()?.toLowerCase();

  switch (command) {
    case 'ticketkur':
      await handleTicketKurCommand(message);
      break;

    case 'ticketlarım':
      await handleTicketlarimCommand(message);
      break;

    case 'ticketlog':
      await handleTicketLogCommand(message, args);
      break;

    case 'help':
      await handleHelpCommand(message, prefix);
      break;
  }
}

// Command: .ticketkur - Creates a ticket panel and sets up staff role
async function handleTicketKurCommand(message: Message) {
  try {
    // Check if user has admin permission
    if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.reply('Bu komutu kullanmak için yönetici yetkisine sahip olmalısın!');
      return;
    }
    
    const args = message.content.split(' ').slice(1);
    
    // If no arguments provided, show syntax help
    if (args.length === 0) {
      await message.reply(
        '**Ticket Sistemi Kurulum**\n\n' +
        'Kullanım:\n' +
        '`.ticketkur panel` - Ticket oluşturma panelini oluşturur\n' +
        '`.ticketkur yetkili @rol` - Ticket kanallarına erişebilecek yetkili rolünü ayarlar\n' +
        '`.ticketkur log #kanal` - Ticket log kanalını ayarlar'
      );
      return;
    }
    
    const subCommand = args[0].toLowerCase();
    
    // Handle panel creation
    if (subCommand === 'panel') {
      // Create ticket panel embed
      const guildId = message.guild?.id || 'default_guild';
      const { embed, row } = await createTicketPanelEmbed(guildId);

      // Send the panel
      // Cast channel to TextChannel to fix TypeScript error
      if (!message.channel || !message.channel.isTextBased()) {
        throw new Error("Channel is not text-based");
      }
      
      const textChannel = message.channel as TextChannel;
      
      const panel = await textChannel.send({
        embeds: [embed],
        components: [row]
      });

      // Save the channel ID to database for future reference
      if (message.guild?.id) {
        await storage.updateBotSettings(message.guild.id, {
          ticketChannelId: message.channel.id
        });
      }

      // Set up button interaction collectors
      const collector = panel.createMessageComponentCollector();
      
      collector.on('collect', async (interaction: any) => {
        if (interaction.isButton()) {
          await handleTicketButtonInteraction(interaction);
        }
      });
      
      // Mesajı sadece sunucu sahibine DM olarak gönder
      try {
        if (message.guild?.ownerId) {
          const owner = await message.guild.members.fetch(message.guild.ownerId);
          if (owner) {
            await owner.send('✅ Ticket paneli başarıyla oluşturuldu!');
          }
        }
        // Kanal mesajını artık göstermiyoruz
      } catch (error) {
        log(`DM gönderme hatası: ${error}`, 'discord');
        // DM gönderilemezse sessizce devam et
      }
    }
    // Handle staff role setup
    else if (subCommand === 'yetkili') {
      const roleId = args[1]?.match(/\d+/)?.[0];
      
      if (!roleId) {
        await message.reply('Lütfen geçerli bir rol etiketleyin: `.ticketkur yetkili @rolismi`');
        return;
      }
      
      // Check if the role exists in the guild
      const role = message.guild?.roles.cache.get(roleId);
      if (!role) {
        await message.reply('Belirtilen rol bulunamadı. Lütfen geçerli bir rol etiketleyin.');
        return;
      }
      
      // Save the staff role ID to database
      if (message.guild?.id) {
        await storage.updateBotSettings(message.guild.id, {
          staffRoleId: roleId
        });
      }
      
      await message.reply(`✅ Yetkili rolü başarıyla \`@${role.name}\` olarak ayarlandı!`);
    }
    // Handle log channel setup
    else if (subCommand === 'log') {
      const channelId = args[1]?.match(/\d+/)?.[0];
      
      if (!channelId) {
        await message.reply('Lütfen geçerli bir kanal etiketleyin: `.ticketkur log #kanaladi`');
        return;
      }
      
      // Check if the channel exists in the guild
      const channel = message.guild?.channels.cache.get(channelId);
      if (!channel) {
        await message.reply('Belirtilen kanal bulunamadı. Lütfen geçerli bir kanal etiketleyin.');
        return;
      }
      
      // Check if the channel is a text channel
      if (!channel.isTextBased()) {
        await message.reply('Belirtilen kanal bir metin kanalı değil. Lütfen geçerli bir metin kanalı etiketleyin.');
        return;
      }
      
      // Save the log channel ID to database
      if (message.guild?.id) {
        await storage.updateBotSettings(message.guild.id, {
          logChannelId: channelId
        });
      }
      
      await message.reply(`✅ Log kanalı başarıyla \`#${channel.name}\` olarak ayarlandı!`);
    }
    else {
      await message.reply(
        '**Geçersiz alt komut!**\n\n' +
        'Kullanım:\n' +
        '`.ticketkur panel` - Ticket oluşturma panelini oluşturur\n' +
        '`.ticketkur yetkili @rol` - Ticket kanallarına erişebilecek yetkili rolünü ayarlar\n' +
        '`.ticketkur log #kanal` - Ticket log kanalını ayarlar'
      );
    }

  } catch (error) {
    log(`Error in ticketkur command: ${error}`, 'discord');
    await message.reply('Ticket sistemi kurulurken bir hata oluştu!');
  }
}

// Handle ticket button interactions
async function handleTicketButtonInteraction(interaction: ButtonInteraction) {
  try {
    switch (interaction.customId) {
      case 'create_ticket':
        // Get categories from database
        const categoryRow = await createTicketCategoryOptions();
        
        // Show category selection menu
        await interaction.reply({
          content: '**Yeni Ticket Oluştur**\nLütfen bir kategori seçin:',
          components: [categoryRow],
          ephemeral: true
        });
        break;
        
      case 'my_tickets':
        await showUserTickets(interaction);
        break;
        
      case 'close_ticket':
        await closeTicket(interaction);
        break;
        
      case 'reply_ticket':
        await replyToTicket(interaction);
        break;
    }
  } catch (error) {
    log(`Error handling button interaction: ${error}`, 'discord');
    try {
      // Sadece eğer henüz yanıtlanmamışsa hata mesajı gönder
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'İşlem sırasında bir hata oluştu!',
          ephemeral: true
        });
      }
    } catch (replyError) {
      log(`Error sending error reply: ${replyError}`, 'discord');
      // Sessizce devam et
    }
  }
}

// Show ticket category selection
export async function setupSelectMenuInteraction(client: Client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      // Handle select menu interactions for ticket categories
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_category') {
          await handleCategorySelection(interaction);
        } else if (interaction.customId === 'ticket_category_direct') {
          await handleCategorySelection(interaction);
        }
      }
      
      // Handle button interactions in tickets, but only process buttons from panel
      // Avoid running duplication of handleTicketButtonInteraction
      if (interaction.isButton()) {
        // Skip 'create_ticket' processing here because it's already handled in button collector
        if (interaction.customId !== 'create_ticket') {
          switch (interaction.customId) {
            case 'my_tickets':
              await showUserTickets(interaction);
              break;
              
            case 'close_ticket':
              await closeTicket(interaction);
              break;
              
            case 'reply_ticket':
              await replyToTicket(interaction);
              break;
              
            case 'accept_ticket':
              await acceptTicket(interaction);
              break;
              
            case 'reject_ticket':
              await rejectTicket(interaction);
              break;
          }
        }
      }
      
      // Handle modal submissions for tickets
      if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        
        // Regex to check if this is a ticket modal (both from panel and direct command)
        if (customId.startsWith('ticket_modal_')) {
          const categoryIdMatch = customId.match(/ticket_modal_(\d+)/);
          if (categoryIdMatch && categoryIdMatch[1]) {
            const categoryId = parseInt(categoryIdMatch[1]);
            await handleTicketCreation(interaction, categoryId);
          }
        }
        // Check for direct ticket creation (from .ticket command)
        else if (customId.startsWith('ticket_modal_direct_')) {
          const categoryIdMatch = customId.match(/ticket_modal_direct_(\d+)/);
          if (categoryIdMatch && categoryIdMatch[1]) {
            const categoryId = parseInt(categoryIdMatch[1]);
            await handleTicketCreation(interaction, categoryId);
          }
        }
        // Check for reply modals
        else if (customId.startsWith('reply_modal_')) {
          const ticketIdMatch = customId.match(/reply_modal_(\d+)/);
          if (ticketIdMatch && ticketIdMatch[1]) {
            const ticketId = parseInt(ticketIdMatch[1]);
            await handleTicketReply(interaction, ticketId);
          }
        }
        // Check for reject modals
        else if (customId.startsWith('reject_modal_')) {
          const ticketIdMatch = customId.match(/reject_modal_(\d+)/);
          if (ticketIdMatch && ticketIdMatch[1]) {
            const ticketId = parseInt(ticketIdMatch[1]);
            const reason = interaction.fields.getTextInputValue('reject_reason');
            
            // Reject the ticket
            const ticketData = await storage.getTicketById(ticketId);
            if (ticketData) {
              await storage.rejectTicket(ticketId, reason);
              
              // Try to send DM to user
              if (ticketData.user?.discordId) {
                try {
                  const discordUser = await interaction.client.users.fetch(ticketData.user.discordId);
                  await discordUser.send({
                    content: `🔴 **Ticket Reddedildi**\nTicket ID: #${ticketId}\n\nYetkili: ${interaction.user.username}\n\nRed Sebebi: ${reason}`
                  });
                } catch (dmError) {
                  log(`Failed to send DM: ${dmError}`, 'discord');
                }
              }
              
              // Reply with status
              await interaction.reply({
                content: `❌ Ticket reddedildi. ${ticketData.user ? `<@${ticketData.user.discordId}>` : 'Kullanıcı'} bilgilendirildi.`
              });
              
              // Add status message to channel
              if (ticketData.channelId) {
                const channel = await interaction.client.channels.fetch(ticketData.channelId) as TextChannel;
                if (channel) {
                  await channel.send({
                    content: `🔴 **Ticket Reddedildi**\nYetkili: <@${interaction.user.id}>\n\nRed Sebebi: ${reason}`,
                    allowedMentions: { users: [] }
                  });
                  
                  // Schedule deletion
                  setTimeout(async () => {
                    try {
                      await channel.delete('Ticket reddedildi');
                    } catch (error) {
                      log(`Error deleting rejected ticket channel: ${error}`, 'discord');
                    }
                  }, 30000);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      log(`Error handling interaction: ${error}`, 'discord');
    }
  });
}

// Handle ticket category selection
async function handleCategorySelection(interaction: StringSelectMenuInteraction) {
  try {
    // Get selected category ID
    const categoryId = parseInt(interaction.values[0]);
    
    // Get category details
    const category = await storage.getCategoryById(categoryId);
    
    if (!category) {
      await interaction.reply({
        content: 'Seçilen kategori bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Create description input modal
    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${categoryId}`)
      .setTitle('Yeni Ticket Oluştur');
    
    // Add description input
    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Açıklama')
      .setPlaceholder('Açıklamanı kısa ve net yaz kardeşim...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(1) // Minimum 1 karakter olarak değiştirildi (istediğini yazabilirsin)
      .setMaxLength(500);
    
    // Create action row with input and convert to proper format that works with Discord.js
    const descriptionRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(descriptionInput);
    
    // Add row to modal
    modal.addComponents(descriptionRow);
    
    // Show modal
    await interaction.showModal(modal);
    
    // We no longer need to wait for modal submission here
    // Modal submissions are now handled in the main interactionCreate event handler
    // This prevents orphaned modal submissions and ensures all modals are properly handled
    
  } catch (error) {
    log(`Error handling category selection: ${error}`, 'discord');
    await interaction.reply({
      content: 'Kategori seçimi sırasında bir hata oluştu!',
      ephemeral: true
    });
  }
}

// Handle ticket creation after modal submission
async function handleTicketCreation(modalInteraction: ModalSubmitInteraction, categoryId: number) {
  try {
    // Get description from modal
    const description = modalInteraction.fields.getTextInputValue('ticket_description');
    
    // Get category details
    const category = await storage.getCategoryById(categoryId);
    
    if (!category) {
      await modalInteraction.reply({
        content: 'Seçilen kategori bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Acknowledge modal submission
    await modalInteraction.deferReply({ ephemeral: true });
    
    // Create or get the user in database
    const discordId = modalInteraction.user.id;
    const username = modalInteraction.user.username;
    const avatarUrl = modalInteraction.user.displayAvatarURL();
    
    const user = await storage.createOrUpdateUser({
      discordId,
      username,
      avatar: avatarUrl
    });
    
    // Create ticket in database (without channel ID for now)
    const ticket = await storage.createTicket({
      title: `${category.name} - ${username}`,
      description,
      userId: user.id,
      categoryId
    });
    
    // Create a private ticket channel
    if (modalInteraction.guild) {
      // Get settings from database for staff role and ticket numbering
      const guildSettings = await storage.getBotSettings(modalInteraction.guild.id);
      const staffRoleId = guildSettings?.staffRoleId;
      
      // Sunucu için son ticket numarasını alarak 1 arttır
      const lastTicketNumber = (guildSettings?.lastTicketNumber || 0);
      const ticketNumber = lastTicketNumber + 1;
      
      // Sunucu ayarlarında son ticket numarasını güncelle
      await storage.updateBotSettings(modalInteraction.guild.id, {
        lastTicketNumber: ticketNumber
      });
      
      // Sayısal formatta kanal adı oluştur
      const channelName = `ticket-${ticketNumber}`;
      
      // Create channel
      const channel = await modalInteraction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: modalInteraction.guild.id, // @everyone
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: modalInteraction.user.id, // Ticket creator
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: modalInteraction.client.user!.id, // Bot
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });
      
      // Add staff role permission if available
      if (staffRoleId) {
        await channel.permissionOverwrites.create(staffRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
      
      // Update ticket with channel ID in the ticket table, not bot settings
      await storage.getTicketById(ticket.id).then(async (ticketData) => {
        if (ticketData) {
          // This will use the proper update method for tickets
          await storage.updateTicketChannel(ticket.id, channel.id);
        }
      });
      
      // Create ticket embed
      const ticketData = await storage.getTicketById(ticket.id);
      
      if (ticketData) {
        const { embed, rows, activeStaff } = await createNewTicketEmbed(ticketData);
        
        // Staff rolünü etiketle
        let messageContent = `<@${modalInteraction.user.id}>, ticket oluşturuldu.`;
        
        // Yetkili rolünü ekle (varsa)
        if (staffRoleId) {
          messageContent += `\n<@&${staffRoleId}>, yeni bir ticket açıldı!`;
        }
        

        
        // Ticket oluşturuldu mesajı için basit embed
        const messageOptions = {
          content: messageContent,
          embeds: [
            embed
          ],
          components: rows // Multiple rows are already in raw JSON format for Discord.js
        };
        
        // Send the embed to the channel
        const message = await channel.send(messageOptions);
        
        // Pin the message
        await message.pin();
        
        // Ticket açılış bildirimi gönderme (log kanalına)
        try {
          // Log kanalı ID'sini alınan guild settings'ten kullan
          const logChannelId = guildSettings?.logChannelId;
          
          // Log kanalı varsa bildirim gönder
          if (logChannelId) {
            const logChannel = modalInteraction.guild.channels.cache.get(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
              await logChannel.send({
                content: `📩 Yeni ticket oluşturuldu: <#${channel.id}>\n👤 Açan: <@${modalInteraction.user.id}>\n📂 Kategori: ${category.name}`,
                embeds: [embed]
              });
            }
          }
        } catch (error) {
          log(`Log kanalına mesaj gönderme hatası: ${error}`, 'discord');
          // Hata olursa sessizce devam et, kullanıcıya hata gösterme
        }
        
        // No need to send staff avatars, they are now included in the embed
        
        // Send confirmation to the user
        await modalInteraction.editReply({
          content: `Ticket oluşturuldu! Lütfen <#${channel.id}> kanalına gidin.`
        });
      }
    } else {
      await modalInteraction.editReply({
        content: 'Ticket oluşturulurken bir hata oluştu! Sunucu bilgisi alınamadı.'
      });
    }
  } catch (error) {
    log(`Error creating ticket: ${error}`, 'discord');
    try {
      if (!modalInteraction.replied && !modalInteraction.deferred) {
        await modalInteraction.reply({
          content: 'Ticket oluşturulurken bir hata oluştu!',
          ephemeral: true
        });
      } else if (modalInteraction.deferred) {
        await modalInteraction.editReply({
          content: 'Ticket oluşturulurken bir hata oluştu!'
        });
      }
    } catch (replyError) {
      log(`Error responding to modal: ${replyError}`, 'discord');
    }
  }
}

// Command: .ticket - Creates a new ticket directly
async function handleTicketCommand(message: Message) {
  try {
    // Get categories from database
    const categories = await storage.getAllCategories();
    
    if (categories.length === 0) {
      await message.reply('Henüz hiç ticket kategorisi tanımlanmamış!');
      return;
    }
    
    // Create a selection menu with categories
    const options = categories.map(category => {
      const emoji = category.emoji.includes(':') 
        ? { id: category.emoji.split(':')[2]?.replace('>', '') } 
        : { name: category.emoji };
      
      return {
        label: category.name,
        description: category.description || 'No description',
        value: category.id.toString(),
        emoji: emoji
      };
    });
    
    // Create a proper SelectMenu that works with Discord.js
    const selectMenu = {
      type: 3, // StringSelectMenu type
      custom_id: 'ticket_category_direct',
      placeholder: 'Bir kategori seçin...',
      options: options
    };
    
    // Create a proper ActionRow that works with Discord.js
    const row = {
      type: 1, // ActionRow type
      components: [selectMenu]
    };
    
    // Send the message with the menu
    await message.reply({
      content: '**Yeni Ticket Oluştur**\nLütfen bir kategori seçin:',
      components: [row]
    });
    
    // Set up collector for the response
    const filter = (i: MessageComponentInteraction) => 
      i.customId === 'ticket_category_direct' && i.user.id === message.author.id;
    
    const collector = message.channel.createMessageComponentCollector({ 
      filter, 
      time: 60000,
      max: 1
    });
    
    collector.on('collect', async (interaction) => {
      if (interaction.isStringSelectMenu()) {
        const categoryId = parseInt(interaction.values[0]);
        
        // Create description input modal
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_direct_${categoryId}`)
          .setTitle('Yeni Ticket Oluştur');
        
        // Add description input
        const descriptionInput = new TextInputBuilder()
          .setCustomId('ticket_description')
          .setLabel('Açıklama')
          .setPlaceholder('Açıklamanı kısa ve net yaz kardeşim...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(1) // Minimum 1 karakter olarak değiştirildi
          .setMaxLength(500);
        
        // Create action row with input
        const descriptionRow = new ActionRowBuilder<TextInputBuilder>()
          .addComponents(descriptionInput);
        
        // Add row to modal
        modal.addComponents(descriptionRow);
        
        // Show modal
        await interaction.showModal(modal);
        
        // Set up modal submit collector
        const modalFilter = (i: ModalSubmitInteraction) => 
          i.customId === `ticket_modal_direct_${categoryId}` && i.user.id === message.author.id;
        
        interaction.awaitModalSubmit({ filter: modalFilter, time: 60000 })
          .then(async (modalInteraction) => {
            await handleTicketCreation(modalInteraction, categoryId);
          })
          .catch((error) => {
            log(`Error in modal submission: ${error}`, 'discord');
          });
      }
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        message.reply('Ticket oluşturma işlemi zaman aşımına uğradı.');
      }
    });
    
  } catch (error) {
    log(`Error in ticket command: ${error}`, 'discord');
    await message.reply('Ticket oluşturulurken bir hata oluştu!');
  }
}

// Command: .ticketlarım - Shows user's tickets
async function handleTicketlarimCommand(message: Message) {
  try {
    // Get user from database
    const discordId = message.author.id;
    const user = await storage.getUserByDiscordId(discordId);
    
    if (!user) {
      await message.reply('Henüz herhangi bir ticket oluşturmadınız!');
      return;
    }
    
    // Get user's tickets
    const tickets = await storage.getTicketsByUserId(user.id);
    
    // Create and send embed
    const embed = createTicketListEmbed(tickets);
    const reply = await message.reply({ embeds: [embed] });
    
    // Set up collector for ticket selection
    const filter = (reaction: any, user: any) => user.id === message.author.id;
    const collector = reply.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', async (reaction, user) => {
      // Get the index from the reaction emoji (1️⃣, 2️⃣, etc.)
      const match = reaction.emoji.name?.match(/(\d+)️⃣/);
      if (match) {
        const index = parseInt(match[1]) - 1;
        if (index >= 0 && index < tickets.length && tickets[index].status === 'open') {
          // Get the ticket channel
          const channelId = tickets[index].channelId;
          if (channelId) {
            const channel = message.guild?.channels.cache.get(channelId);
            if (channel) {
              // Send a message with a link to the channel
              await message.reply(`Buyrun ticket kanalınız: <#${channelId}>`);
            } else {
              await message.reply('Bu ticket kanalı artık mevcut değil!');
            }
          }
        }
      }
    });
    
  } catch (error) {
    log(`Error in ticketlarım command: ${error}`, 'discord');
    await message.reply('Ticketlarınız gösterilirken bir hata oluştu!');
  }
}

// Command: .ticketlog [id] - Shows ticket log
async function handleTicketLogCommand(message: Message, args: string[]) {
  try {
    // Check if user has admin or staff permission
    const member = message.member;
    const guildId = message.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isAdmin = member?.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = settings?.staffRoleId && member?.roles.cache.has(settings.staffRoleId);
    
    if (!isAdmin && !isStaff) {
      await message.reply('Bu komutu kullanmak için yetkili olmalısınız!');
      return;
    }
    
    // Get ticket ID or channel from args
    let ticketId: number | undefined;
    
    if (args.length > 0) {
      // Check if arg is a channel mention (#channel) format
      const channelMention = args[0].match(/<#(\d+)>/);
      
      if (channelMention && channelMention[1]) {
        // Etiketlenen kanalı bul
        const channelId = channelMention[1];
        const channel = message.guild?.channels.cache.get(channelId);
        
        if (channel && channel.name.startsWith('ticket-')) {
          // Bu bir ticket kanalı ise ID'sini kanaldan al
          const ticketData = await storage.getTicketByChannelId(channelId);
          if (ticketData) {
            ticketId = ticketData.id;
          }
        } else {
          await message.reply('Etiketlenen kanal bir ticket kanalı değil!');
          return;
        }
      } else {
        // Eğer kanal etiketi değilse normal sayı olarak dene
        const inputId = parseInt(args[0]);
        if (!isNaN(inputId)) {
          ticketId = inputId;
        } else {
          // Eğer kanal adı yazıldıysa (örn: ticket-5)
          if (args[0].startsWith('ticket-')) {
            // Kanal adından numarayı çıkar
            const ticketNumber = args[0].replace('ticket-', '');
            const ticketNumberInt = parseInt(ticketNumber);
            if (!isNaN(ticketNumberInt)) {
              // Kanal adına göre kanalı bul
              const channel = message.guild?.channels.cache.find(ch => ch.name === args[0]);
              if (channel) {
                const ticketData = await storage.getTicketByChannelId(channel.id);
                if (ticketData) {
                  ticketId = ticketData.id;
                }
              } else {
                await message.reply(`Sunucuda '${args[0]}' adında bir kanal bulunamadı!`);
                return;
              }
            }
          }
        }
      }
    } else {
      // If no ID provided, check if the command is used in a ticket channel
      const channel = message.channel as GuildChannel;
      if (channel.name.startsWith('ticket-')) {
        const ticketData = await storage.getTicketByChannelId(channel.id);
        if (ticketData) {
          ticketId = ticketData.id;
        }
      }
    }
    
    if (!ticketId) {
      await message.reply('Lütfen geçerli bir ticket ID\'si veya ticket kanalı etiketleyin. Örnek: `.ticketlog #ticket-1` veya `.ticketlog 5`');
      return;
    }
    
    // Get ticket data
    const ticket = await storage.getTicketById(ticketId);
    
    if (!ticket) {
      await message.reply('Belirtilen ID\'ye sahip bir ticket bulunamadı!');
      return;
    }
    
    // Create and send embed
    const embed = createTicketLogEmbed(ticket);
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    log(`Error in ticketlog command: ${error}`, 'discord');
    await message.reply('Ticket log gösterilirken bir hata oluştu!');
  }
}

// Command: .help - Shows help message
async function handleHelpCommand(message: Message, prefix: string) {
  try {
    // Create help embed
    const embed = {
      title: '🎫 Futbol RP Ticket Sistemi Komutları',
      color: 0x5865F2,
      description: `Aşağıdaki komutları kullanarak ticket sistemi ile etkileşimde bulunabilirsiniz:`,
      fields: [
        {
          name: `${prefix}ticketkur`,
          value: 'Ticket panel oluşturur ve yetkili rolünü ayarlar. (Sadece Yöneticiler)',
          inline: false
        },
        {
          name: `${prefix}ticketlarım`,
          value: 'Kendi oluşturduğunuz ticketları listeler.',
          inline: false
        },
        {
          name: `${prefix}ticketlog [ID]`,
          value: 'Belirtilen ticket\'ın logunu gösterir. (Sadece Yetkililer)',
          inline: false
        },
        {
          name: `${prefix}help`,
          value: 'Bu yardım mesajını gösterir.',
          inline: false
        }
      ],
      footer: {
        text: `Görkemli Ticket Sistemi | Prefix: ${prefix} | by Porsuk Support`
      }
    };
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    log(`Error in help command: ${error}`, 'discord');
    await message.reply('Yardım mesajı gösterilirken bir hata oluştu!');
  }
}

// Accept a ticket
async function acceptTicket(interaction: ButtonInteraction) {
  try {
    // Check if the interaction is in a ticket channel
    const channel = interaction.channel as GuildChannel;
    
    if (!channel || !channel.name.startsWith('ticket-')) {
      await interaction.reply({
        content: 'Bu komut sadece ticket kanallarında kullanılabilir!',
        ephemeral: true
      });
      return;
    }
    
    // Get ticket data
    const ticketData = await storage.getTicketByChannelId(channel.id);
    
    if (!ticketData) {
      await interaction.reply({
        content: 'Bu kanal için ticket bilgisi bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Check if user has permission
    const member = interaction.member as GuildMember;
    const guildId = interaction.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId);
    
    if (!isAdmin && !isStaff) {
      await interaction.reply({
        content: 'Bu ticketı kabul etme yetkiniz yok!',
        ephemeral: true
      });
      return;
    }
    
    // Accept the ticket
    await storage.acceptTicket(ticketData.id);
    
    // Get user info (ticket creator)
    const user = ticketData.user;
    
    if (user && user.discordId) {
      try {
        // Try to get user from Discord
        const discordUser = await interaction.client.users.fetch(user.discordId);
        
        if (discordUser) {
          // Send DM to user
          await discordUser.send({
            content: `🟢 **Ticket Kabul Edildi**\nTicket ID: #${ticketData.id}\n\nYetkili: ${interaction.user.username}\n\nYetkili ekibimiz en kısa sürede sizinle ilgilenecek.`
          });
        }
      } catch (error) {
        log(`Error sending DM to user: ${error}`, 'discord');
      }
    }
    
    // Reply to interaction
    await interaction.reply({
      content: `✅ Ticket kabul edildi. ${user ? `<@${user.discordId}>` : 'Kullanıcı'} bilgilendirildi.`
    });
    
    // Add accepted status message to channel
    if (interaction.channel && interaction.channel.isTextBased() && 'send' in interaction.channel) {
      await interaction.channel.send({
        content: `🟢 **Ticket Kabul Edildi**\nYetkili: <@${interaction.user.id}>\n\nTicket işleme alındı ve inceleniyor.`,
        allowedMentions: { users: [] }
      });
    }
    
  } catch (error) {
    log(`Error accepting ticket: ${error}`, 'discord');
    await interaction.reply({
      content: 'Ticket kabul edilirken bir hata oluştu!',
      ephemeral: true
    });
  }
}

// Reject a ticket
async function rejectTicket(interaction: ButtonInteraction) {
  try {
    // Check if the interaction is in a ticket channel
    const channel = interaction.channel as GuildChannel;
    
    if (!channel || !channel.name.startsWith('ticket-')) {
      await interaction.reply({
        content: 'Bu komut sadece ticket kanallarında kullanılabilir!',
        ephemeral: true
      });
      return;
    }
    
    // Get ticket data
    const ticketData = await storage.getTicketByChannelId(channel.id);
    
    if (!ticketData) {
      await interaction.reply({
        content: 'Bu kanal için ticket bilgisi bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Check if user has permission
    const member = interaction.member as GuildMember;
    const guildId = interaction.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId);
    
    if (!isAdmin && !isStaff) {
      await interaction.reply({
        content: 'Bu ticketı reddetme yetkiniz yok!',
        ephemeral: true
      });
      return;
    }
    
    // Create reject reason modal
    const modal = new ModalBuilder()
      .setCustomId(`reject_modal_${ticketData.id}`)
      .setTitle('Reddetme Sebebi');
    
    // Add reason input
    const reasonInput = new TextInputBuilder()
      .setCustomId('reject_reason')
      .setLabel('Reddetme Sebebi')
      .setPlaceholder('Ticketı neden reddediyorsunuz?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(1000);
    
    // Create action row with input
    const reasonRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(reasonInput);
    
    // Add row to modal
    modal.addComponents(reasonRow);
    
    // Show modal
    await interaction.showModal(modal);
    
    // Set up modal submit collector
    const filter = (i: ModalSubmitInteraction) => 
      i.customId === `reject_modal_${ticketData.id}` && i.user.id === interaction.user.id;
    
    interaction.awaitModalSubmit({ filter, time: 60000 })
      .then(async (modalInteraction) => {
        try {
          // Get reason from modal
          const reason = modalInteraction.fields.getTextInputValue('reject_reason');
          
          // Reject the ticket
          await storage.rejectTicket(ticketData.id, reason);
          
          // Get user info (ticket creator)
          const user = ticketData.user;
          
          if (user && user.discordId) {
            try {
              // Try to get user from Discord
              const discordUser = await interaction.client.users.fetch(user.discordId);
              
              if (discordUser) {
                // Send DM to user
                await discordUser.send({
                  content: `🔴 **Ticket Reddedildi**\nTicket ID: #${ticketData.id}\n\nYetkili: ${interaction.user.username}\n\nRed Sebebi: ${reason}`
                });
              }
            } catch (error) {
              log(`Error sending DM to user: ${error}`, 'discord');
            }
          }
          
          // Reply to interaction
          await modalInteraction.reply({
            content: `❌ Ticket reddedildi. ${user ? `<@${user.discordId}>` : 'Kullanıcı'} bilgilendirildi.`
          });
          
          // Add rejected status message to channel
          if (interaction.channel && interaction.channel.isTextBased() && 'send' in interaction.channel) {
            await interaction.channel.send({
              content: `🔴 **Ticket Reddedildi**\nYetkili: <@${interaction.user.id}>\n\nRed Sebebi: ${reason}`,
              allowedMentions: { users: [] }
            });
          }
          
          // Close ticket channel after 30 seconds
          setTimeout(async () => {
            try {
              await channel.delete('Ticket reddedildi');
            } catch (error) {
              log(`Error deleting rejected ticket channel: ${error}`, 'discord');
            }
          }, 30000);
          
        } catch (error) {
          log(`Error processing reject reason: ${error}`, 'discord');
          await modalInteraction.reply({
            content: 'Ticket reddedilirken bir hata oluştu!',
            ephemeral: true
          });
        }
      })
      .catch((error) => {
        log(`Error in reject modal submission: ${error}`, 'discord');
      });
    
  } catch (error) {
    log(`Error rejecting ticket: ${error}`, 'discord');
    await interaction.reply({
      content: 'Ticket reddedilirken bir hata oluştu!',
      ephemeral: true
    });
  }
}

// Show user's tickets
async function showUserTickets(interaction: ButtonInteraction) {
  try {
    // Get user from database
    const discordId = interaction.user.id;
    const user = await storage.getUserByDiscordId(discordId);
    
    if (!user) {
      await interaction.reply({
        content: 'Henüz herhangi bir ticket oluşturmadınız!',
        ephemeral: true
      });
      return;
    }
    
    // Get user's tickets
    const tickets = await storage.getTicketsByUserId(user.id);
    
    // Create and send embed
    const embed = createTicketListEmbed(tickets);
    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
    
  } catch (error) {
    log(`Error showing user tickets: ${error}`, 'discord');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Ticketlarınız gösterilirken bir hata oluştu!',
        ephemeral: true
      });
    }
  }
}

// Close a ticket
async function closeTicket(interaction: ButtonInteraction) {
  try {
    // Check if the interaction is in a ticket channel
    const channel = interaction.channel as GuildChannel;
    
    if (!channel || !channel.name.startsWith('ticket-')) {
      await interaction.reply({
        content: 'Bu komut sadece ticket kanallarında kullanılabilir!',
        ephemeral: true
      });
      return;
    }
    
    // Get ticket data
    const ticketData = await storage.getTicketByChannelId(channel.id);
    
    if (!ticketData) {
      await interaction.reply({
        content: 'Bu kanal için ticket bilgisi bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Check if user has permission to close the ticket
    const member = interaction.member as GuildMember;
    const guildId = interaction.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isCreator = ticketData.user?.discordId === interaction.user.id;
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId);
    
    if (!isCreator && !isAdmin && !isStaff) {
      await interaction.reply({
        content: 'Bu ticketı kapatma yetkiniz yok!',
        ephemeral: true
      });
      return;
    }
    
    // Close the ticket in database
    await storage.closeTicket(ticketData.id);
    
    // Announce ticket closing
    await interaction.reply({
      content: `Ticket kapatılıyor... Kanal 5 saniye içinde silinecek.`
    });
    
    // Log the closed ticket
    if (settings?.logChannelId) {
      const logChannel = await interaction.client.channels.fetch(settings.logChannelId);
      
      if (logChannel?.isTextBased() && (logChannel instanceof TextChannel)) {
        const updatedTicket = await storage.getTicketById(ticketData.id);
        if (updatedTicket) {
          const embed = createTicketLogEmbed(updatedTicket);
          await logChannel.send({ embeds: [embed] });
        }
      }
    }
    
    // Delete the channel after 5 seconds
    setTimeout(async () => {
      try {
        await channel.delete('Ticket kapatıldı');
      } catch (error) {
        log(`Error deleting ticket channel: ${error}`, 'discord');
      }
    }, 5000);
    
  } catch (error) {
    log(`Error closing ticket: ${error}`, 'discord');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Ticket kapatılırken bir hata oluştu!',
        ephemeral: true
      });
    }
  }
}

// Reply to a ticket
async function replyToTicket(interaction: ButtonInteraction) {
  try {
    // Check if the interaction is in a ticket channel
    const channel = interaction.channel as GuildChannel;
    
    if (!channel || !channel.name.startsWith('ticket-')) {
      await interaction.reply({
        content: 'Bu komut sadece ticket kanallarında kullanılabilir!',
        ephemeral: true
      });
      return;
    }
    
    // Get ticket data
    const ticketData = await storage.getTicketByChannelId(channel.id);
    
    if (!ticketData) {
      await interaction.reply({
        content: 'Bu kanal için ticket bilgisi bulunamadı!',
        ephemeral: true
      });
      return;
    }
    
    // Check if user has permission to reply
    const member = interaction.member as GuildMember;
    const guildId = interaction.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isCreator = ticketData.user?.discordId === interaction.user.id;
    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isStaff = settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId);
    
    if (!isCreator && !isAdmin && !isStaff) {
      await interaction.reply({
        content: 'Bu ticketa yanıt verme yetkiniz yok!',
        ephemeral: true
      });
      return;
    }
    
    // Create reply modal
    const modal = new ModalBuilder()
      .setCustomId(`reply_modal_${ticketData.id}`)
      .setTitle('Ticket Yanıtı');
    
    // Add reply input
    const replyInput = new TextInputBuilder()
      .setCustomId('ticket_reply')
      .setLabel('Yanıtınız')
      .setPlaceholder('Yanıtınızı buraya yazın...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(1000);
    
    // Create action row with input
    const replyRow = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(replyInput);
    
    // Add row to modal
    modal.addComponents(replyRow);
    
    // Show modal
    await interaction.showModal(modal);
    
    // Set up modal submit collector
    const filter = (i: ModalSubmitInteraction) => 
      i.customId === `reply_modal_${ticketData.id}` && i.user.id === interaction.user.id;
    
    interaction.awaitModalSubmit({ filter, time: 60000 })
      .then(async (modalInteraction) => {
        await handleTicketReply(modalInteraction, ticketData.id);
      })
      .catch((error) => {
        log(`Error in reply modal submission: ${error}`, 'discord');
      });
    
  } catch (error) {
    log(`Error replying to ticket: ${error}`, 'discord');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Yanıt verme sırasında bir hata oluştu!',
        ephemeral: true
      });
    }
  }
}

// Handle ticket reply submission
async function handleTicketReply(modalInteraction: ModalSubmitInteraction, ticketId: number) {
  try {
    // Get reply content
    const content = modalInteraction.fields.getTextInputValue('ticket_reply');
    
    // Get user from database or create
    const discordId = modalInteraction.user.id;
    const username = modalInteraction.user.username;
    const avatarUrl = modalInteraction.user.displayAvatarURL();
    
    const user = await storage.createOrUpdateUser({
      discordId,
      username,
      avatar: avatarUrl
    });
    
    // Add response to database
    await storage.addResponse({
      content,
      ticketId,
      userId: user.id
    });
    
    // If user is staff and ticket is not assigned, assign it
    const ticketData = await storage.getTicketById(ticketId);
    const member = modalInteraction.member as GuildMember;
    const guildId = modalInteraction.guild?.id || 'default_guild';
    const settings = await storage.getBotSettings(guildId);
    
    const isStaff = settings?.staffRoleId && member.roles.cache.has(settings.staffRoleId);
    
    if (isStaff && ticketData && !ticketData.assignedToId) {
      await storage.assignTicket(ticketId, user.id);
    }
    
    // Send the reply with more detailed formatting
    // Check if the user is staff to show proper formatting
    if (isStaff) {
      await modalInteraction.reply({
        content: `**👮‍♂️ ${modalInteraction.user.username} (Yetkili) yanıtladı:**\n\`\`\`${content}\`\`\``
      });
    } else {
      await modalInteraction.reply({
        content: `**👤 ${modalInteraction.user.username} yanıtladı:**\n\`\`\`${content}\`\`\``
      });
    }
    
  } catch (error) {
    log(`Error handling ticket reply: ${error}`, 'discord');
    if (!modalInteraction.replied && !modalInteraction.deferred) {
      await modalInteraction.reply({
        content: 'Yanıtınız gönderilirken bir hata oluştu!',
        ephemeral: true
      });
    }
  }
}
