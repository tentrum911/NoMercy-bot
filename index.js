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
  "sounds like a YouTube ad nobody can skip."
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!roast")) {

    const target = message.mentions.users.first();

    const roast =
      roasts[Math.floor(Math.random() * roasts.length)];

    if (target) {
      message.channel.send(`${target} ${roast}`);
    } else {
      message.reply("mention someone to roast 😭");
    }
  }
});

client.login(process.env.TOKEN);

app.get("/", (req, res) => {
  res.send("NoMercy bot is alive");
});

app.listen(3000, () => {
  console.log("Web server running");
});
