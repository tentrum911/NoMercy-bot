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

const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

// ================= EXPRESS =================

const app = express();

app.get("/", (req, res) => {
  res.send("NoMercy is alive 😈");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Web server running on port ${PORT}`
  );
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
  model: "gemini-1.5-flash",
});

// ================= MEMORY =================

const roastStats = {};

const recentReplies = new Map();
const recentKeywords = new Map();

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .trim();
}

function extractKeywords(text) {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 4)
    .slice(0, 6);
}

function isRepeated(userId, reply) {
  const normalized = normalize(reply);

  const replies =
    recentReplies.get(userId) || [];

  if (replies.includes(normalized))
    return true;

  const keywords = extractKeywords(reply);

  const oldKeywords =
    recentKeywords.get(userId) || [];

  let matches = 0;

  for (const word of keywords) {
    if (oldKeywords.includes(word)) {
      matches++;
    }
  }

  return matches >= 2;
}

function saveReply(userId, reply) {
  const normalized = normalize(reply);

  const replies =
    recentReplies.get(userId) || [];

  replies.push(normalized);

  if (replies.length > 40) {
    replies.shift();
  }

  recentReplies.set(userId, replies);

  // keywords
  const keywords =
    recentKeywords.get(userId) || [];

  keywords.push(...extractKeywords(reply));

  if (keywords.length > 120) {
    keywords.splice(
      0,
      keywords.length - 120
    );
  }

  recentKeywords.set(userId, keywords);

  // clear memory after 1 hour
  setTimeout(() => {
    recentReplies.delete(userId);
    recentKeywords.delete(userId);
  }, 3600000);
}

// ================= GIF MEMORY =================

const recentGifs = [];

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

STRICT RULES:
- Every reply MUST be unique
- Never repeat sentence structures
- Never repeat jokes
- Never say:
  "AI disconnected"
  "NPC"
  "side quest"
  "braincells"
  "wifi"
  "loading screen"
  "airplane mode"
- Use internet meme humor
- Human sounding
- Context based
- Short replies only
- Max 2 lines
- Light swearing allowed
- Aggressive but funny
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
      isRepeated(username, response) &&
      tries < 10
    );

    saveReply(username, response);

    return response;
  } catch (err) {
    console.log(
      "GEMINI ERROR:",
      err
    );

    // backup replies if AI fails
    const backups = [
      "your existence lowers server FPS 💀",
      "bro types like autocorrect gave up 😭",
      "you sound downloadable 💀",
      "your confidence needs parental controls 😭",
      "even your shadow avoids association 💀",
      "you type like a scam ad popup 😭",
      "you look like expired DLC 💀",
      "bro speaks in buffering 😭",
      "you bring negative ping somehow 💀",
      "your insults need software updates 😭",
    ];

    return backups[
      Math.floor(
        Math.random() * backups.length
      )
    ];
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
- clown meme
- emotional damage
- awkward meme
- fail meme
- laughing meme
- crying meme
- angry cat
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
      tries < 15
    );

    saveGif(gif);

    return gif;
  } catch (err) {
    console.log(
      "GIF ERROR:",
      err
    );

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

// ================= EVENTS =================

client.on(
  "messageCreate",
  async (message) => {
    if (message.author.bot) return;

    const content =
      message.content.toLowerCase();

    // ================= !stats =================

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

    // ================= !roast =================

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
        await getGif(roast);

      return message.reply(
        `${target} ${roast}${
          gif ? `\n\n${gif}` : ""
        }`
      );
    }

    // ================= !destroy =================

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
        await getGif(destroy);

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
        await getGif(reply);

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
      if (Math.random() < 0.08) {
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
