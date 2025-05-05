import { db } from "@db";
import * as schema from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const storage = {
  // User operations
  async getUserById(id: number) {
    return await db.query.users.findFirst({
      where: eq(schema.users.id, id)
    });
  },

  async getUserByDiscordId(discordId: string) {
    return await db.query.users.findFirst({
      where: eq(schema.users.discordId, discordId)
    });
  },

  async createOrUpdateUser(userData: Partial<schema.InsertUser> & { discordId: string }) {
    const existingUser = await this.getUserByDiscordId(userData.discordId);
    
    if (existingUser) {
      const [updatedUser] = await db.update(schema.users)
        .set({
          username: userData.username || existingUser.username,
          avatar: userData.avatar || existingUser.avatar,
        })
        .where(eq(schema.users.id, existingUser.id))
        .returning();
      return updatedUser;
    } else {
      // Generate a random password for Discord users
      const randomPassword = Math.random().toString(36).slice(-10);
      const [newUser] = await db.insert(schema.users)
        .values({
          username: userData.username!,
          password: userData.password || randomPassword,
          avatar: userData.avatar,
          discordId: userData.discordId,
        })
        .returning();
      return newUser;
    }
  },

  // Ticket category operations
  async getAllCategories() {
    return await db.query.ticketCategories.findMany();
  },

  async getCategoryById(id: number) {
    return await db.query.ticketCategories.findFirst({
      where: eq(schema.ticketCategories.id, id)
    });
  },

  // Ticket operations
  async createTicket(ticketData: Omit<schema.InsertTicket, "status" | "createdAt" | "closedAt"> & { channelId?: string }) {
    const [ticket] = await db.insert(schema.tickets)
      .values({
        title: ticketData.title,
        description: ticketData.description,
        userId: ticketData.userId,
        categoryId: ticketData.categoryId,
        channelId: ticketData.channelId,
      })
      .returning();
    return ticket;
  },

  async getTicketById(id: number) {
    return await db.query.tickets.findFirst({
      where: eq(schema.tickets.id, id),
      with: {
        category: true,
        user: true,
        assignedTo: true,
        responses: {
          with: {
            user: true
          },
          orderBy: [desc(schema.ticketResponses.createdAt)]
        }
      }
    });
  },

  async getTicketByChannelId(channelId: string) {
    return await db.query.tickets.findFirst({
      where: eq(schema.tickets.channelId, channelId),
      with: {
        category: true,
        user: true,
        assignedTo: true
      }
    });
  },

  async getTicketsByUserId(userId: number) {
    return await db.query.tickets.findMany({
      where: eq(schema.tickets.userId, userId),
      with: {
        category: true
      },
      orderBy: [desc(schema.tickets.createdAt)]
    });
  },

  async assignTicket(ticketId: number, staffId: number) {
    const [ticket] = await db.update(schema.tickets)
      .set({ assignedToId: staffId })
      .where(eq(schema.tickets.id, ticketId))
      .returning();
    return ticket;
  },

  async closeTicket(ticketId: number) {
    const [ticket] = await db.update(schema.tickets)
      .set({ 
        status: "closed",
        closedAt: new Date()
      })
      .where(eq(schema.tickets.id, ticketId))
      .returning();
    return ticket;
  },
  
  async updateTicketChannel(ticketId: number, channelId: string) {
    const [ticket] = await db.update(schema.tickets)
      .set({ channelId })
      .where(eq(schema.tickets.id, ticketId))
      .returning();
    return ticket;
  },

  async getOpenTickets() {
    return await db.query.tickets.findMany({
      where: eq(schema.tickets.status, "open"),
      with: {
        category: true,
        user: true,
        assignedTo: true
      },
      orderBy: [desc(schema.tickets.createdAt)]
    });
  },

  // Ticket response operations
  async addResponse(responseData: schema.InsertTicketResponse) {
    const [response] = await db.insert(schema.ticketResponses)
      .values(responseData)
      .returning();
    return response;
  },

  async getResponsesByTicketId(ticketId: number) {
    return await db.query.ticketResponses.findMany({
      where: eq(schema.ticketResponses.ticketId, ticketId),
      with: { user: true },
      orderBy: [desc(schema.ticketResponses.createdAt)]
    });
  },

  // Bot settings operations
  async getBotSettings(guildId: string) {
    return await db.query.botSettings.findFirst({
      where: eq(schema.botSettings.guildId, guildId)
    });
  },

  async updateBotSettings(guildId: string, settings: Partial<schema.InsertBotSettings>) {
    const existingSettings = await this.getBotSettings(guildId);
    
    if (existingSettings) {
      const [updated] = await db.update(schema.botSettings)
        .set({
          ...settings,
          lastUpdated: new Date()
        })
        .where(eq(schema.botSettings.guildId, guildId))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db.insert(schema.botSettings)
        .values({
          guildId,
          ...settings,
          prefix: settings.prefix || "."
        })
        .returning();
      return newSettings;
    }
  },

  // Funny responses
  async getRandomFunnyResponse() {
    const responses = await db.query.funnyResponses.findMany();
    if (responses.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  },

  // Active staff members
  async getActiveStaffMembers() {
    try {
      // Tüm yetkili kullanıcıları al
      const staffMembers = await db.query.users.findMany({
        where: eq(schema.users.isStaff, true)
      });
      
      // Veritabanında yetkili yoksa boş dizi döndür
      if (staffMembers.length === 0) {
        return [];
      }
      
      // Tüm yetkilileri "aktif" olarak kabul et
      // Gerçek Discord online durumunu kontrol etmiyoruz
      return staffMembers;
    } catch (error) {
      console.error("Error getting active staff:", error);
      return [];
    }
  }
};
