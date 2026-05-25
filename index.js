const express = require("express");
const app = express();

require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const roasts = [
  "has the personality of expired milk.",
  "talks like their brain is buffering.",
  "is proof evolution can go backwards.",
  "has less intelligence than airplane food.",
  "looks like a corrupted GTA character.",
  "types like their keyboard is fighting for survival.",
  "has confidence levels unsupported by reality.",
  "sounds like a YouTube ad nobody can skip.",
  "was clearly dropped on airplane mode.",
  "has two brain cells fighting for third place.",
  "looks like a rejected Roblox character.",
  "talks big for someone built like a loading screen.",
  "has the emotional damage of Windows Vista.",
  "could lose an argument to a brick wall.",
  "is the reason shampoo has instructions.",
  "has WiFi signal stronger than their IQ.",
  "acts like the main character but got NPC stats.",
  "looks like they smell their own socks for fun."
];

const destroyRoasts = [
  "your existence lowers the server IQ.",
  "you talk like an unskippable YouTube ad.",
  "your confidence is genuinely terrifying for your skill level.",
  "you look like your parents change the topic when someone mentions you.",
  "you have the survival instincts of a tutorial NPC.",
  "you type like autocorrect is begging for mercy.",
  "your brain runs on free trial mode.",
  "you sound like someone who claps when the plane lands."
];

const mentionReplies = [
  "what do you want now 💀",
  "your existence summoned me unfortunately.",
  "i was happier before you pinged me.",
  "speak faster my RAM is limited.",
  "you type like your keyboard owes you money.",
  "imagine needing MY attention 😭"
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // RANDOM AUTO ROAST
  const randomChance = Math.floor(Math.random() * 12);

  if (randomChance === 1) {

    await message.channel.sendTyping();

    setTimeout(() => {

      const autoRoast =
        roasts[Math.floor(Math.random() * roasts.length)];

      message.reply(autoRoast);

    }, 2000);
  }

  // BOT MENTION REPLY
  if (message.mentions.has(client.user)) {

    await message.channel.sendTyping();

    setTimeout(() => {

      const reply =
        mentionReplies[Math.floor(Math.random() * mentionReplies.length)];

      message.reply(reply);

    }, 1500);
  }

  // !ROAST COMMAND
  if (message.content.startsWith("!roast")) {

    const target = message.mentions.users.first();

    const roast =
      roasts[Math.floor(Math.random() * roasts.length)];

    await message.channel.sendTyping();

    setTimeout(() => {

      if (target) {
        message.channel.send(`${target} ${roast}`);
      } else {
        message.reply("mention someone to roast 😭");
      }

    }, 2000);
  }

  // !DESTROY COMMAND
  if (message.content.startsWith("!destroy")) {

    const target = message.mentions.users.first();

    const finalRoast =
      destroyRoasts[Math.floor(Math.random() * destroyRoasts.length)];

    await message.channel.sendTyping();

    setTimeout(() => {

      if (target) {
        message.channel.send(`💀 ${target} ${finalRoast}`);
      } else {
        message.reply("mention someone to destroy 😭");
      }

    }, 2500);
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
