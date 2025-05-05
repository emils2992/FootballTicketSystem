import { db } from "./index";
import * as schema from "@shared/schema";

async function seed() {
  try {
    // Seed categories
    const categories = [
      { name: "Transfer Talebi", emoji: "⚽", description: "Takım transferi ile ilgili talepler" },
      { name: "Hakem Şikayeti", emoji: "❗", description: "Hakem kararları ile ilgili şikayetler" },
      { name: "Basın Toplantısı", emoji: "🗣️", description: "Basın toplantısı düzenleme talepleri" },
      { name: "Lisans Sorunu", emoji: "⚙️", description: "Oyuncu lisansları ile ilgili sorunlar" },
      { name: "Acil Durum", emoji: "💥", description: "Acil çözüm gerektiren durumlar" },
    ];

    const existingCategories = await db.query.ticketCategories.findMany();
    if (existingCategories.length === 0) {
      console.log("Seeding ticket categories...");
      for (const category of categories) {
        await db.insert(schema.ticketCategories).values(category);
      }
    }

    // Seed funny responses
    const funnyResponses = [
      { content: "Yetkili şu an çiğ köfte yiyor, azıcık sabır kral." },
      { content: "Bu taleple FIFA'ya bile başvurabilirdin aq." },
      { content: "Scoutlar seni izliyor, düzgün yaz da rezil olmayalım." },
      { content: "Messi olsan bile sıranı beklemen lazım gardaş." },
      { content: "Ronaldo musun olm sen, niye bu kadar acelen var?" },
      { content: "Hakem kararına itiraz ediyorsun da VAR'ı mı duymadın?" },
      { content: "Kulübün sana zam yapmadan önce bizden tavsiye alsan iyi olur." },
      { content: "Transfer sezonu kapandı mı açıldı mı biz de bilmiyoruz..." },
      { content: "Yetkili 90+5'te gol attı, şimdi kutlama yapıyor." },
      { content: "Bilet paralarını düşürün diyorsun ama maaşın Ronaldo gibi." }
    ];

    const existingResponses = await db.query.funnyResponses.findMany();
    if (existingResponses.length === 0) {
      console.log("Seeding funny responses...");
      for (const response of funnyResponses) {
        await db.insert(schema.funnyResponses).values(response);
      }
    }

    // Seed sample users (staff)
    const staffMembers = [
      { 
        username: "Yusuf", 
        password: "hashed_password", 
        isStaff: true,
        discordId: "794205713533894696", // Sizin Discord ID'niz
        avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
      },
      { 
        username: "Caner", 
        password: "hashed_password", 
        isStaff: true,
        discordId: "123456789012345678", // Örnek Discord ID
        avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
      },
      { 
        username: "Ali", 
        password: "hashed_password", 
        isStaff: true,
        discordId: "987654321098765432", // Örnek Discord ID
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80"
      }
    ];

    const existingStaff = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.isStaff, true)
    });

    if (existingStaff.length === 0) {
      console.log("Seeding staff members...");
      for (const staff of staffMembers) {
        await db.insert(schema.users).values(staff);
      }
    }

    // Seed bot settings
    const existingSettings = await db.query.botSettings.findMany();
    if (existingSettings.length === 0) {
      console.log("Seeding default bot settings...");
      await db.insert(schema.botSettings).values({
        guildId: "default_guild",
        prefix: ".",
      });
    }

    console.log("Seeding completed successfully");
  } 
  catch (error) {
    console.error("Error during seeding:", error);
  }
}

seed();
