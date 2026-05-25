const express = require("express");
const app = express();

require("dotenv").config();

const fetch = require("node-fetch");

const {
  Client,
  GatewayIntentBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// MEMORY SYSTEM
const userMemory = {};

// GIFS
const roastGifs = [
  "https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif",
  "https://media.giphy.com/media/l41YdDNnasCOd2TWo/giphy.gif",
  "https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif"
];

// FALLBACK ROASTS
const fallbackRoasts = [
  "you type like autocorrect gave up on you.",
  "your brain loads slower than hotel WiFi.",
  "you sound like a tutorial nobody asked for.",
  "your confidence is illegal for your skill level.",
  "you look AI generated with low budget settings."
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

// AI ROAST FUNCTION
async function generateRoast(username) {

  try {

    const response = await fetch(
      `https://evilinsult.com/generate_insult.php?lang=en&type=json`
    );

    const data = await response.json();

    return `${username} ${data.insult}`;

  } catch {

    return `${username} ${
      fallbackRoasts[
        Math.floor(Math.random() * fallbackRoasts.length)
      ]
    }`;
  }
}

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const username = message.author.username;

  // MEMORY TRACK
  if (!userMemory[username]) {
    userMemory[username] = {
      roastCount: 0
    };
  }

  // AUTO RANDOM ROAST
  const randomChance = Math.floor(Math.random() * 18);

  if (randomChance === 1) {

    await message.channel.sendTyping();

    setTimeout(async () => {

      const roast = await generateRoast(message.author);

      message.reply(roast);

    }, 2000);
  }

  // BOT MENTION
  if (message.mentions.has(client.user)) {

    const mentionReplies = [
      "bro summoned me like a side quest 💀",
      "you again? tragic.",
      "your messages lower server FPS.",
      "i've seen smarter Instagram comments.",
      "lightly insulting you is self care."
    ];

    await message.channel.sendTyping();

    setTimeout(() => {

      const reply =
        mentionReplies[
          Math.floor(Math.random() * mentionReplies.length)
        ];

      message.reply(reply);

    }, 1500);
  }

  // !ROAST
  if (message.content.startsWith("!roast")) {

    const target = message.mentions.users.first();

    if (!target) {
      return message.reply("mention someone 😭");
    }

    userMemory[target.username].roastCount++;

    await message.channel.sendTyping();

    setTimeout(async () => {

      const roast = await generateRoast(target);

      const gif =
        roastGifs[
          Math.floor(Math.random() * roastGifs.length)
        ];

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

    userMemory[target.username].roastCount += 3;

    const destroyLines = [
      "your existence is proof free will was a mistake.",
      "you type like your keyboard is under emotional stress.",
      "even autocorrect avoids helping you.",
      "your IQ is fighting for survival."
    ];

    await message.channel.sendTyping();

    setTimeout(() => {

      const line =
        destroyLines[
          Math.floor(Math.random() * destroyLines.length)
        ];

      const gif =
        roastGifs[
          Math.floor(Math.random() * roastGifs.length)
        ];

      message.channel.send({
        content: `💀 ${target} ${line}\n${gif}`
      });

    }, 2500);
  }

  // !STATS
  if (message.content.startsWith("!stats")) {

    const target =
      message.mentions.users.first() || message.author;

    const stats = userMemory[target.username];

    message.reply(
      `${target.username} has been roasted ${stats.roastCount} times 💀`
    );
  }
});

client.login(process.env.TOKEN);

// WEB SERVER
app.get("/", (req, res) => {
  res.send("NoMercy bot is alive");
});

app.listen(3000, () => {
  console.log("Web server running");
});
client.login(process.env.TOKEN);

// WEB SERVER FOR RENDER
app.get("/", (req, res) => {
  res.send("NoMercy bot is alive");
});

app.listen(3000, () => {
  console.log("Web server running");
});
