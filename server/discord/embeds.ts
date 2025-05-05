import { 
  EmbedBuilder, 
  ButtonBuilder, 
  ActionRowBuilder, 
  SelectMenuBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { storage } from '../storage';
import * as schema from "@shared/schema";

// Helper function to format timestamps
export function formatDate(date: Date) {
  return format(date, "d MMMM yyyy | HH:mm", { locale: tr });
}

// Ticket panel embed with buttons
export async function createTicketPanelEmbed(guildId: string) {
  // Get active staff members from database
  const activeStaff = await storage.getActiveStaffMembers();
  const onlineCount = Math.min(activeStaff.length, 2); // Pretend 2 of them are online for now
  
  // Get guild settings to get the prefix
  const settings = await storage.getBotSettings(guildId);
  const prefix = settings?.prefix || '!';
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2) // Discord blurple color
    .setTitle('🎟️ Futbol RP Ticket Paneli')
    .setDescription(
      'Bir sorun, talep veya delikanlı gibi açıklaman mı var?\n\n' +
      '👇 Aşağıdaki seçeneklerle bir ticket oluşturabilirsin.'
    )
    .setFooter({ text: `Görkemli Ticket Sistemi | Prefix: ${prefix} | by Porsuk Support` });

  // Create button for creating ticket in raw JSON format
  const createTicketButton = {
    type: 2, // Button type
    custom_id: 'create_ticket',
    label: 'Ticket Oluştur',
    emoji: { name: '📬' },
    style: 1 // PRIMARY style
  };

  // Add button to action row in raw JSON format
  const row = {
    type: 1, // ActionRow type
    components: [createTicketButton]
  };

  return { embed, row };
}

// Ticket creation modal select menu options
export async function createTicketCategoryOptions() {
  // Get categories from database
  const categories = await storage.getAllCategories();
  
  // Create select menu options in raw JSON format with proper emoji formatting
  const options = categories.map(category => ({
    label: category.name,
    description: category.description || 'No description',
    value: category.id.toString(),
    emoji: { name: category.emoji }
  }));
  
  // Create the select menu in raw JSON format
  const selectMenu = {
    type: 3, // StringSelectMenu type
    custom_id: 'ticket_category',
    placeholder: 'Bir kategori seçin...',
    options: options
  };
  
  // Add select menu to action row
  const row = {
    type: 1, // ActionRow type
    components: [selectMenu]
  };
  
  return row;
}

// New ticket embed
export async function createNewTicketEmbed(ticket: schema.Ticket & { 
  category: schema.TicketCategory | null, 
  user: schema.User | null,
  assignedTo: schema.User | null
}) {
  // Get active staff members from database
  const activeStaff = await storage.getActiveStaffMembers();
  
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Yeni Ticket')
    .addFields(
      {
        name: '👤 Açan:',
        value: `@${ticket.user?.username || 'Bilinmeyen Kullanıcı'}`,
        inline: false
      },
      {
        name: '📂 Kategori:',
        value: `${ticket.category?.emoji || '📌'} ${ticket.category?.name || 'Genel Kategori'}`,
        inline: false
      },
      {
        name: '📝 Açıklama:',
        value: `"${ticket.description}"`,
        inline: false
      },
      {
        name: '📆 Açılış:',
        value: formatDate(ticket.createdAt),
        inline: false
      }
    );

  if (activeStaff.length > 0) {
    embed.addFields({
      name: '👮‍♂️ Yetkili Ekibi:',
      value: '\u200B', // Zero-width space as placeholder, staff avatars will be shown in the message
      inline: false
    });
  }

  // Create buttons in raw JSON format
  const replyButton = {
    type: 2, // Button type
    custom_id: 'reply_ticket',
    label: 'Yanıtla',
    emoji: { name: '✅' },
    style: 3 // SUCCESS style
  };

  const closeButton = {
    type: 2, // Button type
    custom_id: 'close_ticket',
    label: 'Ticket Kapat',
    emoji: { name: '❌' },
    style: 4 // DANGER style
  };

  // Add buttons to action row
  const row = {
    type: 1, // ActionRow type
    components: [replyButton, closeButton]
  };

  return { embed, row, activeStaff };
}

// Ticket list embed
export function createTicketListEmbed(tickets: (schema.Ticket & { 
  category: schema.TicketCategory | null 
})[]) {
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Ticketlarım');
  
  if (tickets.length === 0) {
    embed.setDescription('Hiç ticket oluşturmamışsın delikanlı.');
  } else {
    let description = '';
    
    tickets.forEach((ticket, index) => {
      const statusEmoji = ticket.status === 'open' ? '🟢' : '🔴';
      const statusText = ticket.status === 'open' ? 'Açık' : 'Kapalı';
      description += `**${index + 1}.** ${ticket.category?.emoji || '📌'} ${ticket.category?.name || 'Genel Kategori'} - ${statusEmoji} ${statusText}\n`;
    });
    
    embed.setDescription(description);
  }
  
  embed.setFooter({ text: 'Açık ticketlara tıklayarak gidebilirsiniz' });
  
  return embed;
}

// Ticket log embed
export function createTicketLogEmbed(ticket: schema.Ticket & { 
  category: schema.TicketCategory | null, 
  user: schema.User | null,
  assignedTo: schema.User | null
}) {
  // Create the embed
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📁 Ticket Özeti - #ticket-${ticket.user?.username || 'unknown'}`)
    .addFields(
      {
        name: '👤 Açan:',
        value: `@${ticket.user?.username || 'Bilinmeyen Kullanıcı'}`,
        inline: false
      },
      {
        name: '🎯 Konu:',
        value: ticket.category?.name || 'Genel Kategori',
        inline: false
      },
      {
        name: '📝 Açıklama:',
        value: `"${ticket.description}"`,
        inline: false
      }
    );
  
  // Add timing information if available
  if (ticket.createdAt) {
    const openTime = format(ticket.createdAt, 'HH:mm');
    let timeInfo = `Açıldı: ${openTime}`;
    
    if (ticket.status === 'closed' && ticket.closedAt) {
      const closeTime = format(ticket.closedAt, 'HH:mm');
      timeInfo += ` | Kapatıldı: ${closeTime}`;
    }
    
    embed.addFields({
      name: '⏱️ Süreler:',
      value: timeInfo,
      inline: false
    });
  }
  
  // Add assigned staff member if available
  if (ticket.assignedTo) {
    embed.addFields({
      name: '👮‍♂️ İlgilenen Yetkili:',
      value: `@${ticket.assignedTo.username}`,
      inline: false
    });
  }
  
  embed.setFooter({ 
    text: `Ticket Log Sistemi • ${format(new Date(), 'd MMMM yyyy', { locale: tr })}` 
  });
  
  return embed;
}
