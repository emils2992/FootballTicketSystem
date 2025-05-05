import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  isAdmin: boolean("is_admin").default(false),
  isStaff: boolean("is_staff").default(false),
  discordId: text("discord_id").unique(),
});

// Ticket categories
export const ticketCategories = pgTable("ticket_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  description: text("description"),
});

// Tickets table
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, closed
  rejectReason: text("reject_reason"),
  categoryId: integer("category_id").references(() => ticketCategories.id),
  userId: integer("user_id").references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  channelId: text("channel_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

// Ticket responses
export const ticketResponses = pgTable("ticket_responses", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Funny auto-responses
export const funnyResponses = pgTable("funny_responses", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
});

// Bot settings
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  prefix: text("prefix").notNull().default("."),
  ticketChannelId: text("ticket_channel_id"),
  logChannelId: text("log_channel_id"),
  adminRoleId: text("admin_role_id"),
  staffRoleId: text("staff_role_id"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Define relations
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  category: one(ticketCategories, {
    fields: [tickets.categoryId],
    references: [ticketCategories.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
  }),
  responses: many(ticketResponses),
}));

export const ticketResponsesRelations = relations(ticketResponses, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketResponses.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketResponses.userId],
    references: [users.id],
  }),
}));

// Define schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
});

export const insertTicketCategorySchema = createInsertSchema(ticketCategories, {
  name: (schema) => schema.min(3, "Category name must be at least 3 characters"),
  emoji: (schema) => schema.min(1, "Emoji is required"),
});

export const insertTicketSchema = createInsertSchema(tickets, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  description: (schema) => schema.min(1, "Description cannot be empty"),
});

export const insertTicketResponseSchema = createInsertSchema(ticketResponses, {
  content: (schema) => schema.min(1, "Response cannot be empty"),
});

export const insertFunnyResponseSchema = createInsertSchema(funnyResponses, {
  content: (schema) => schema.min(5, "Response must be at least 5 characters"),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type TicketCategory = typeof ticketCategories.$inferSelect;
export type InsertTicketCategory = z.infer<typeof insertTicketCategorySchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type TicketResponse = typeof ticketResponses.$inferSelect;
export type InsertTicketResponse = z.infer<typeof insertTicketResponseSchema>;

export type FunnyResponse = typeof funnyResponses.$inferSelect;
export type InsertFunnyResponse = z.infer<typeof insertFunnyResponseSchema>;

export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;
