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
  res.send("NoMercy bot is alive 😈");
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
  model: "gemini-2.0-flash",
});

// ================= MEMORY =================

const recentReplies = new Map();
const recentGifs = [];
const roastStats = {};
const cooldowns = new Map();

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

  if (history.length > 25) {
    history.shift();
  }

  recentReplies.set(userId, history);
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
  userInput,
  userId
) {
  try {
    const prompt = `
You are NoMercy, a savage funny Discord roast bot.

TYPE:
${type}

MESSAGE:
${userInput}

STRICT RULES:
- Be unique every time
- Never repeat replies
- Context based humor
- Human sounding
- Internet meme humor
- Gen Z humor
- Light swearing allowed
- Maximum 2 lines
- Funny and brutal
- No racism
- No hate speech
- Avoid repeating same joke structure
`;

    let text = "";
    let attempts = 0;

    do {
      const result =
        await model.generateContent(prompt);

      const response =
        await result.response;

      text = response.text().trim();

      text = text.replace(/\n+/g, " ");

      attempts++;
    } while (
      isRepeated(userId, text) &&
      attempts < 7
    );

    saveReply(userId, text);

    return text;

  } catch (err) {

    console.log(
      "GEMINI ERROR:",
      err
    );

    const backups = [
      "bro scared the AI away 💀",
      "Gemini crashed after reading that 😭",
      "even Google gave up on you 💀",
      "AI needs therapy after this 😭",
      "bro bullied the servers 💀",
      "your aura got rate limited 😭",
      "AI disconnected for mental health reasons 💀",
      "Google HQ blocked your vibes 😭",
      "bro broke reality itself 💀",
      "even the AI said hell nah 😭"
    ];

    return backups[
      Math.floor(
        Math.random() * backups.length
      )
    ];
  }
}

// ================= GIF SYSTEM =================

async function getGif(query) {

  try {

    const keywordPrompt = `
Give ONLY one short meme gif search keyword.

Message:
${query}

Examples:
- clown meme
- emotional damage
- awkward meme
- laughing meme
- crying meme
- fail meme
- bruh meme

ONLY RETURN SEARCH TERM.
`;

    const keywordResult =
      await model.generateContent(
        keywordPrompt
      );

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
      )}&limit=40&rating=pg13`
    );

    const data = await response.json();

    if (
      !data.data ||
      !data.data.length
    ) {
      return null;
    }

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
    `${client.user.tag} is online 🔥`
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

    // ================= COOLDOWN =================

    const now = Date.now();

    if (
      cooldowns.has(message.author.id)
    ) {

      const expiration =
        cooldowns.get(
          message.author.id
        );

      if (now < expiration) {

        return message.reply(
          "slow down mf you're bullying the AI 😭"
        );
      }
    }

    cooldowns.set(
      message.author.id,
      now + 5000
    );

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
          "ROAST",
          `${message.author.username} wants to roast ${target.username}`,
          target.id
        );

      const gif =
        await getGif(roast);

      return message.reply({
        content:
          `${target} ${roast}`,
        files: gif ? [gif] : []
      });
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
          "DESTROY",
          `${message.author.username} brutally destroying ${target.username}`,
          target.id
        );

      const gif =
        await getGif(destroy);

      return message.reply({
        content:
          `${target} ${destroy}`,
        files: gif ? [gif] : []
      });
    }

    // ================= SELF REPLY =================

    if (
      content.includes("nomercy") ||
      message.mentions.has(client.user)
    ) {

      await message.channel.sendTyping();

      const reply =
        await generateRoast(
          "SELF REPLY",
          message.content,
          message.author.id
        );

      const gif =
        await getGif(reply);

      return message.reply({
        content: reply,
        files: gif ? [gif] : []
      });
    }

    // ================= RANDOM REPLY =================

    const randomChance =
      Math.floor(
        Math.random() * 100
      );

    if (randomChance < 5) {

      const randomReply =
        await generateRoast(
          "RANDOM REPLY",
          message.content,
          message.author.id
        );

      if (
        !isRepeated(
          message.author.id,
          randomReply
        )
      ) {

        saveReply(
          message.author.id,
          randomReply
        );

        return message.reply(
          randomReply
        );
      }
    }
  }
);

// ================= LOGIN =================

client.login(process.env.TOKEN);
