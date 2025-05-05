import { Client, IntentsBitField, Partials, Events, GatewayIntentBits } from 'discord.js';
import { log } from '../vite';
import { handleCommands } from './commands';
import { storage } from '../storage';

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Discord token from environment variable
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Initialize Discord bot
export async function initializeDiscordBot() {
  if (!DISCORD_TOKEN) {
    log('DISCORD_TOKEN not found in environment variables.', 'discord');
    return;
  }

  try {
    // Login with token
    await client.login(DISCORD_TOKEN);
    log(`Discord bot logged in as ${client.user?.tag}`, 'discord');

    // Set bot activity
    client.user?.setActivity('.ticketkur | Futbol RP', { type: 0 });

    // Set up event handlers
    client.on(Events.MessageCreate, async (message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      try {
        // Get guild settings
        const guildId = message.guild?.id || 'default_guild';
        const settings = await storage.getBotSettings(guildId);
        const prefix = settings?.prefix || '.';

        // Check if message starts with prefix
        if (message.content.startsWith(prefix)) {
          // Process commands
          await handleCommands(message, prefix, client);
        }
      } catch (error) {
        log(`Error processing message: ${error}`, 'discord');
      }
    });

    // Setup periodic funny responses
    setInterval(async () => {
      try {
        // Get all open tickets
        const openTickets = await storage.getOpenTickets();
        
        if (openTickets.length > 0) {
          // Pick a random ticket
          const randomTicket = openTickets[Math.floor(Math.random() * openTickets.length)];
          
          if (randomTicket.channelId) {
            // Get a random funny response
            const funnyResponse = await storage.getRandomFunnyResponse();
            
            if (funnyResponse) {
              // Find the channel
              const channel = await client.channels.fetch(randomTicket.channelId);
              if (channel?.isTextBased()) {
                // Send the funny response
                await channel.send({
                  content: `*${funnyResponse.content}*`,
                });
              }
            }
          }
        }
      } catch (error) {
        log(`Error sending funny response: ${error}`, 'discord');
      }
    }, 600000); // 10 minutes interval

    return client;
  } catch (error) {
    log(`Failed to initialize Discord bot: ${error}`, 'discord');
    return null;
  }
}

// Export the client for use in other modules
export { client };
