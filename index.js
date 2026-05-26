   require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const fetch = require("node-fetch");

const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("NoMercy bot is alive 🔥");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// =========================
// DISCORD CLIENT
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// =========================
// GEMINI AI
// =========================

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash"
});

// =========================
// MEMORY SYSTEM
// =========================

const recentReplies = new Map();

function isRepeated(userId, text) {
  if (!recentReplies.has(userId)) {
    recentReplies.set(userId, []);
  }

  const history = recentReplies.get(userId);

  return history.includes(text);
}

function saveReply(userId, text) {
  if (!recentReplies.has(userId)) {
    recentReplies.set(userId, []);
  }

  const history = recentReplies.get(userId);

  history.push(text);

  if (history.length > 20) {
    history.shift();
  }

  recentReplies.set(userId, history);
}

// =========================
// GENERATE AI ROAST
// =========================

async function generateRoast(promptType, userInput) {
  try {
    const prompt = `
You are NoMercy, a savage funny Discord roast bot.

Rules:
- Be short
- Be unique every time
- Never repeat lines
- Roast based on context
- Use internet/gaming/genz humor
- No essays
- Max 1-2 lines
- Add emojis sometimes
- Don't be wholesome
- Don't explain joke

Type: ${promptType}

Context:
${userInput}
`;

    const result = await model.generateContent(prompt);

    const response = await result.response;

    let text = response.text().trim();

    text = text.replace(/\n+/g, " ");

    return text;

  } catch (err) {
    console.log("GEMINI ERROR:", err);

    return "bro broke the AI again 💀";
  }
}

// =========================
// GIPHY
// =========================

async function getGif(query) {
  try {
    const url =
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=25`;

    const response = await fetch(url);

    const data = await response.json();

    if (!data.data || !data.data.length) {
      return null;
    }

    const randomGif =
      data.data[
        Math.floor(Math.random() * data.data.length)
      ];

    return randomGif.images.original.url;

  } catch (err) {
    console.log("GIF ERROR:", err);

    return null;
  }
}

// =========================
// READY EVENT
// =========================

client.once("ready", () => {
  console.log(`${client.user.tag} is online 🔥`);
});

// =========================
// MESSAGE EVENT
// =========================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // =========================
  // ROAST COMMAND
  // =========================

  if (content.startsWith("!roast")) {

    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        "mention someone to roast 💀"
      );
    }

    await message.channel.sendTyping();

    let roast = "";
    let attempts = 0;

    do {

      roast = await generateRoast(
        "ROAST",
        `${message.author.username} wants to roast ${target.username}`
      );

      attempts++;

    } while (
      isRepeated(target.id, roast) &&
      attempts < 6
    );

    saveReply(target.id, roast);

    const gif = await getGif(roast);

    return message.reply({
      content:
        `${target} ${roast}`,
      files: gif ? [gif] : []
    });
  }

  // =========================
  // DESTROY COMMAND
  // =========================

  if (content.startsWith("!destroy")) {

    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        "mention someone to destroy 💀"
      );
    }

    await message.channel.sendTyping();

    let destroy = "";
    let attempts = 0;

    do {

      destroy = await generateRoast(
        "DESTROY",
        `${message.author.username} wants to brutally destroy ${target.username}`
      );

      attempts++;

    } while (
      isRepeated(target.id, destroy) &&
      attempts < 6
    );

    saveReply(target.id, destroy);

    const gif = await getGif(destroy);

    return message.reply({
      content:
        `${target} ${destroy}`,
      files: gif ? [gif] : []
    });
  }

  // =========================
  // SELF MENTIONING
  // =========================

  if (
    content.includes("nomercy") ||
    message.mentions.has(client.user)
  ) {

    await message.channel.sendTyping();

    let reply = "";
    let attempts = 0;

    do {

      reply = await generateRoast(
        "SELF REPLY",
        `User said: ${message.content}`
      );

      attempts++;

    } while (
      isRepeated(message.author.id, reply) &&
      attempts < 6
    );

    saveReply(message.author.id, reply);

    return message.reply(reply);
  }

  // =========================
  // RANDOM REPLY
  // =========================

  const randomChance = Math.floor(Math.random() * 100);

  if (randomChance < 5) {

    let randomReply = await generateRoast(
      "RANDOM",
      `Random funny reply to: ${message.content}`
    );

    if (!isRepeated(message.author.id, randomReply)) {

      saveReply(message.author.id, randomReply);

      return message.reply(randomReply);
    }
  }
});

// =========================
// LOGIN
// =========================

client.login(process.env.TOKEN);   
      
