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
        '`.ticketkur yetkili @rol` - Ticket kanallarına erişebilecek yetkili rolünü ayarlar'
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
      
      await message.reply('✅ Ticket paneli başarıyla oluşturuldu!');
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
    else {
      await message.reply(
        '**Geçersiz alt komut!**\n\n' +
        'Kullanım:\n' +
        '`.ticketkur panel` - Ticket oluşturma panelini oluşturur\n' +
        '`.ticketkur yetkili @rol` - Ticket kanallarına erişebilecek yetkili rolünü ayarlar'
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
    await interaction.reply({
      content: 'İşlem sırasında bir hata oluştu!',
      ephemeral: true
    });
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
      
      // Handle button interactions in tickets
      if (interaction.isButton()) {
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
      .setMinLength(10)
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
      // Get staff role ID from settings
      const guildSettings = await storage.getBotSettings(modalInteraction.guild.id);
      const staffRoleId = guildSettings?.staffRoleId;
      
      // Channel name
      const channelName = `ticket-${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      
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
        const { embed, row, activeStaff } = await createNewTicketEmbed(ticketData);
        
        // Construct a message mentioning the user and convert row to proper message component
        const messageOptions = {
          content: `<@${modalInteraction.user.id}>, ticket oluşturuldu.`,
          embeds: [embed],
          components: [row] // row is already in raw JSON format for Discord.js
        };
        
        // Send the embed to the channel
        const message = await channel.send(messageOptions);
        
        // Pin the message
        await message.pin();
        
        // No need to send staff avatars, they are now included in the embed
        
        // Send a random funny response after a short delay
        setTimeout(async () => {
          const funnyResponse = await storage.getRandomFunnyResponse();
          if (funnyResponse) {
            await channel.send({
              content: `*${funnyResponse.content}*`
            });
          }
        }, 5000);
        
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
    await modalInteraction.reply({
      content: 'Ticket oluşturulurken bir hata oluştu!',
      ephemeral: true
    });
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
          .setMinLength(10)
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
    
    // Get ticket ID from args
    let ticketId: number | undefined;
    
    if (args.length > 0) {
      ticketId = parseInt(args[0]);
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
      await message.reply('Lütfen geçerli bir ticket ID\'si belirtin!');
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
    await interaction.reply({
      content: 'Ticketlarınız gösterilirken bir hata oluştu!',
      ephemeral: true
    });
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
    await interaction.reply({
      content: 'Ticket kapatılırken bir hata oluştu!',
      ephemeral: true
    });
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
    await interaction.reply({
      content: 'Yanıt verme sırasında bir hata oluştu!',
      ephemeral: true
    });
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
    await modalInteraction.reply({
      content: 'Yanıtınız gönderilirken bir hata oluştu!',
      ephemeral: true
    });
  }
}
