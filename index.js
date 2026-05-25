        require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require("discord.js");

const express = require("express");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) =>
    fetch(...args)
  );

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ================= EXPRESS =================

const app = express();

app.get("/", (req, res) => {
  res.send("NoMercy is alive 😈");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// ================= DISCORD =================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ================= GEMINI =================

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// ================= MEMORY =================

const roastStats = {};
const recentReplies = [];
const recentGifs = [];

function isRepeated(reply) {
  return recentReplies.includes(reply);
}

function saveReply(reply) {
  recentReplies.push(reply);

  if (recentReplies.length > 80) {
    recentReplies.shift();
  }
}

function isGifRepeated(gif) {
  return recentGifs.includes(gif);
}

function saveGif(gif) {
  recentGifs.push(gif);

  if (recentGifs.length > 50) {
    recentGifs.shift();
  }
}

// ================= AI ROAST =================

async function generateRoast(
  type,
  username,
  message
) {
  try {
    const prompt = `
You are NoMercy, a savage funny Discord roast bot.

TYPE:
${type}

USERNAME:
${username}

MESSAGE:
${message}

RULES:
- Context based replies
- Funny and brutal
- Meme humor
- Internet humor
- Human sounding
- Never repeat replies
- Short replies only
- Maximum 2 lines
- Light swearing allowed
- No racism
- No hate speech
`;

    let response = "";

    let tries = 0;

    do {
      const result =
        await model.generateContent(prompt);

      response = result.response
        .text()
        .trim();

      tries++;
    } while (
      isRepeated(response) &&
      tries < 5
    );

    saveReply(response);

    return response;
  } catch (err) {
    console.log(err);

    return "your brain crashed before the reply loaded 💀";
  }
}

// ================= AI GIF =================

async function getGif(context) {
  try {
    const gifPrompt = `
Give ONLY one short meme GIF search keyword.

MESSAGE:
${context}

Examples:
- crying meme
- emotional damage
- clown meme
- npc meme
- awkward meme
- fail meme
- bruh meme

ONLY RETURN SEARCH TERM.
`;

    const keywordResult =
      await model.generateContent(gifPrompt);

    const keyword =
      keywordResult.response
        .text()
        .trim();

    console.log(
      "GIF SEARCH:",
      keyword
    );

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(
        keyword
      )}&limit=50&rating=pg13`
    );

    const data = await response.json();

    if (!data.data.length) return null;

    let gif;

    let tries = 0;

    do {
      gif =
        data.data[
          Math.floor(
            Math.random() *
              data.data.length
          )
        ].images.original.url;

      tries++;
    } while (
      isGifRepeated(gif) &&
      tries < 10
    );

    saveGif(gif);

    return gif;
  } catch (err) {
    console.log(err);

    return null;
  }
}

// ================= READY =================

client.once("ready", () => {
  console.log(
    `${client.user.tag} is online.`
  );

  client.user.setPresence({
    activities: [
      {
        name: "destroying egos 😈",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
});

// ================= MESSAGE EVENT =================

client.on(
  "messageCreate",
  async (message) => {
    if (message.author.bot) return;

    const content =
      message.content.toLowerCase();

    // ================= STATS =================

    if (
      content.startsWith("!stats")
    ) {
      const target =
        message.mentions.users.first() ||
        message.author;

      const count =
        roastStats[target.id] || 0;

      return message.reply(
        `${target.username} has been roasted ${count} times 💀`
      );
    }

    // ================= ROAST =================

    if (
      content.startsWith("!roast")
    ) {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          "mention someone to roast 💀"
        );
      }

      roastStats[target.id] =
        (roastStats[target.id] || 0) + 1;

      await message.channel.sendTyping();

      const roast =
        await generateRoast(
          "funny roast",
          target.username,
          message.content
        );

      const gif =
        await getGif(message.content);

      return message.reply(
        `${target} ${roast}${
          gif ? `\n\n${gif}` : ""
        }`
      );
    }

    // ================= DESTROY =================

    if (
      content.startsWith("!destroy")
    ) {
      const target =
        message.mentions.users.first();

      if (!target) {
        return message.reply(
          "mention someone to destroy 💀"
        );
      }

      roastStats[target.id] =
        (roastStats[target.id] || 0) + 1;

      await message.channel.sendTyping();

      const destroy =
        await generateRoast(
          "brutal destroy",
          target.username,
          message.content
        );

      const gif =
        await getGif(message.content);

      return message.reply(
        `${target} ${destroy}${
          gif ? `\n\n${gif}` : ""
        }`
      );
    }

    // ================= SELF MENTION =================

    if (
      message.mentions.has(client.user) &&
      !content.startsWith("!roast") &&
      !content.startsWith("!destroy")
    ) {
      await message.channel.sendTyping();

      const reply =
        await generateRoast(
          "self mention",
          message.author.username,
          message.content
        );

      const gif =
        await getGif(message.content);

      return message.reply(
        `${reply}${
          gif ? `\n\n${gif}` : ""
        }`
      );
    }

    // ================= RANDOM COMEBACK =================

    const triggerWords = [
      "bot",
      "nomercy",
      "trash",
      "ugly",
      "stupid",
      "loser",
    ];

    if (
      triggerWords.some((word) =>
        content.includes(word)
      )
    ) {
      if (Math.random() < 0.12) {
        const comeback =
          await generateRoast(
            "random comeback",
            message.author.username,
            message.content
          );

        return message.reply(comeback);
      }
    }
  }
);

// ================= LOGIN =================

client.login(process.env.TOKEN);
