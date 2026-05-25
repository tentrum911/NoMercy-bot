   const express = require("express");
const app = express();

require("dotenv").config();

const fetch = require("node-fetch");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// MEMORY
const userMemory = {};

function getMemory(user) {
  if (!userMemory[user.id]) {
    userMemory[user.id] = {
      username: user.username,
      roastCount: 0,
      destroyCount: 0,
      mentionCount: 0
    };
  }

  userMemory[user.id].username = user.username;
  return userMemory[user.id];
}

// GIFS
const roastGifs = [
  "https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif",
  "https://media.giphy.com/media/l41YdDNnasCOd2TWo/giphy.gif",
  "https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif"
];

// ROASTS
const fallbackRoasts = [
  "you type like autocorrect gave up on you.",
  "your brain loads slower than hotel WiFi.",
  "you sound like a tutorial nobody asked for.",
  "your confidence is illegal for your skill level.",
  "you look AI generated with low budget settings.",
  "has two brain cells fighting for third place.",
  "talks like their brain is buffering.",
  "looks like a corrupted GTA character.",
  "has the personality of expired milk.",
  "acts like the main character but got NPC stats."
];

const destroyLines = [
  "your existence lowers the server IQ.",
  "you talk like an unskippable YouTube ad.",
  "your confidence is genuinely terrifying for your skill level.",
  "you have the survival instincts of a tutorial NPC.",
  "you type like autocorrect is begging for mercy.",
  "your brain runs on free trial mode.",
  "you sound like someone who claps when the plane lands.",
  "your IQ is fighting for survival."
];

const mentionReplies = [
  "bro summoned me like a side quest 💀",
  "you again? tragic.",
  "your messages lower server FPS.",
  "i've seen smarter Instagram comments.",
  "lightly insulting you is self care.",
  "your existence summoned me unfortunately."
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

async function generateRoast(user) {
  const memory = getMemory(user);

  try {
    const response = await fetch(
      "https://evilinsult.com/generate_insult.php?lang=en&type=json"
    );

    const data = await response.json();

    if (data && data.insult) {
      return `${user} ${data.insult}`;
    }

    throw new Error("No insult returned");
  } catch {
    const line =
      fallbackRoasts[Math.floor(Math.random() * fallbackRoasts.length)];

    if (memory.roastCount >= 5) {
      return `${user} already survived ${memory.roastCount} roasts and still types like this. ${line}`;
    }

    return `${user} ${line}`;
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const authorMemory = getMemory(message.author);

  // RANDOM AUTO ROAST
  const randomChance = Math.floor(Math.random() * 18);

  if (randomChance === 1) {
    await message.channel.sendTyping();

    setTimeout(async () => {
      const roast = await generateRoast(message.author);
      authorMemory.roastCount++;
      message.reply(roast);
    }, 2000);
  }

  // BOT MENTION
  if (message.mentions.has(client.user)) {
    authorMemory.mentionCount++;

    await message.channel.sendTyping();

    setTimeout(() => {
      const reply =
        mentionReplies[Math.floor(Math.random() * mentionReplies.length)];

      message.reply(reply);
    }, 1500);
  }

  // !ROAST
  if (message.content.startsWith("!roast")) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply("mention someone to roast 😭");
    }

    const targetMemory = getMemory(target);
    targetMemory.roastCount++;

    await message.channel.sendTyping();

    setTimeout(async () => {
      const roast = await generateRoast(target);

      const gif =
        roastGifs[Math.floor(Math.random() * roastGifs.length)];

      message.channel.send({
        content: `${roast}\n${gif}`
      });
    }, 2000);
  }

  // !DESTROY
  if (message.content.startsWith("!destroy")) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply("mention someone to destroy 💀");
    }

    const targetMemory = getMemory(target);
    targetMemory.roastCount += 3;
    targetMemory.destroyCount++;

    const line =
      destroyLines[Math.floor(Math.random() * destroyLines.length)];

    const gif =
      roastGifs[Math.floor(Math.random() * roastGifs.length)];

    await message.channel.sendTyping();

    setTimeout(() => {
      message.channel.send({
        content: `💀 ${target} ${line}\n${gif}`
      });
    }, 2500);
  }

  // !STATS
  if (message.content.startsWith("!stats")) {
    const target = message.mentions.users.first() || message.author;
    const stats = getMemory(target);

    message.reply(
      `${stats.username} stats 💀\nRoasted: ${stats.roastCount}\nDestroyed: ${stats.destroyCount}\nSummoned bot: ${stats.mentionCount}`
    );
  }

  // !LEADERBOARD
  if (message.content.startsWith("!leaderboard")) {
    const users = Object.values(userMemory)
      .sort((a, b) => b.roastCount - a.roastCount)
      .slice(0, 5);

    if (users.length === 0) {
      return message.reply("no victims yet 💀");
    }

    const board = users
      .map((u, i) => `${i + 1}. ${u.username} — ${u.roastCount} roasts`)
      .join("\n");

    message.reply(`🏆 Roast leaderboard:\n${board}`);
  }
});

client.login(process.env.TOKEN);

// WEB SERVER FOR RENDER
app.get("/", (req, res) => {
  res.send("NoMercy bot is alive");
});

app.listen(3000, () => {
  console.log("Web server running");
});     
