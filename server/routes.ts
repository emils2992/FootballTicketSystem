import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeDiscordBot } from "./discord";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Discord bot
  const discordClient = await initializeDiscordBot();
  
  if (!discordClient) {
    log("Warning: Discord bot failed to initialize. Bot functionality will not be available.", "express");
  }

  // API routes
  app.get('/api/status', async (req, res) => {
    res.json({
      status: "ok",
      botOnline: !!discordClient?.isReady()
    });
  });

  // Ticket categories endpoint
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Ticket stats endpoint
  app.get('/api/stats', async (req, res) => {
    try {
      const openTickets = await storage.getOpenTickets();
      const activeStaff = await storage.getActiveStaffMembers();
      
      res.json({
        openTickets: openTickets.length,
        activeStaff: activeStaff.length,
        staffOnline: Math.min(activeStaff.length, 2) // Mock online staff count
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get user tickets endpoint
  app.get('/api/user/:discordId/tickets', async (req, res) => {
    try {
      const { discordId } = req.params;
      const user = await storage.getUserByDiscordId(discordId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const tickets = await storage.getTicketsByUserId(user.id);
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user tickets" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
