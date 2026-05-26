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
  model: "gemini-2.0-flash",
});

// ================= MEMORY =================

const roastStats = {};

const recentReplies = new Map();
const recentGifs = [];

function isRepeated(userId, text) {
  if (!recentReplies.has(userId)) {
    recentReplies.set(userId, []);
  }

  const history =
    recentReplies.get(userId);

  return history.includes(text);
}

function saveReply(userId, text) {
  if (!recentReplies.has(userId)) {
    recentReplies.set(userId, []);
  }

  const history =
    recentReplies.get(userId);

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

  if (recentGifs.length > 40) {
    recentGifs.shift();
  }
}

// ================= COOLDOWN =================

const cooldowns = new Map();

function onCooldown(userId) {
  const now = Date.now();

  if (cooldowns.has(userId)) {
    const expiration =
      cooldowns.get(userId);

    if (now < expiration) {
      return true;
    }
  }

  cooldowns.set(userId, now + 5000);

  return false;
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
- Be unique every time
- Never repeat replies
- Use internet meme humor
- Human sounding
- Context aware
- Funny and brutal
- Short replies only
- Maximum 2 lines
- Light swearing allowed
- No racism
- No hate speech
`;

    const result =
      await model.generateContent(prompt);

    const response =
      await result.response;

    let text = response
      .text()
      .trim();

    text = text.replace(/\n+/g, " ");

    return text;
  } catch (err) {
    console.log(
      "GEMINI ERROR:",
      err
    );

    const fallbacks = [
      "Google HQ blocked your vibes 😭",
      "AI cooling down after roasting too hard 💀",
      "bro broke the AI again 😭",
      "even AI got tired of this server 💀",
      "Gemini rage quit after reading that 😭",
    ];

    return fallbacks[
      Math.floor(
        Math.random() * fallbacks.length
      )
    ];
  }
}

// ================= AI GIF =================

async function getGif(context) {
  try {
    const prompt = `
Give ONLY one meme GIF search keyword.

MESSAGE:
${context}

Examples:
- crying meme
- clown meme
- awkward meme
- emotional damage
- fail meme
- laughing meme

ONLY RETURN SEARCH TERM.
`;

    const keywordResult =
      await model.generateContent(prompt);

    const keyword =
      keywordResult.response
        .text()
        .trim();

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${encodeURIComponent(
        keyword
      )}&limit=25`
    );

    const data = await response.json();

    if (!data.data.length)
      return null;

    let gif;

    let attempts = 0;

    do {
      gif =
        data.data[
          Math.floor(
            Math.random() *
              data.data.length
          )
        ].images.original.url;

      attempts++;
    } while (
      isGifRepeated(gif) &&
      attempts < 10
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

// ================= EVENTS =================

client.on(
  "messageCreate",
  async (message) => {
    if (message.author.bot) return;

    const content =
      message.content.toLowerCase();

    if (
      onCooldown(message.author.id)
    ) {
      return;
    }

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

      let roast = "";

      let attempts = 0;

      do {
        roast =
          await generateRoast(
            "ROAST",
            target.username,
            message.content
          );

        attempts++;
      } while (
        isRepeated(
          target.id,
          roast
        ) &&
        attempts < 6
      );

      saveReply(
        target.id,
        roast
      );

      const gif =
        await getGif(roast);

      return message.reply({
        content:
          `${target} ${roast}`,
        files: gif ? [gif] : [],
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

      let destroy = "";

      let attempts = 0;

      do {
        destroy =
          await generateRoast(
            "DESTROY",
            target.username,
            message.content
          );

        attempts++;
      } while (
        isRepeated(
          target.id,
          destroy
        ) &&
        attempts < 6
      );

      saveReply(
        target.id,
        destroy
      );

      const gif =
        await getGif(destroy);

      return message.reply({
        content:
          `${target} ${destroy}`,
        files: gif ? [gif] : [],
      });
    }

    // ================= SELF REPLY =================

    if (
      content.includes(
        "nomercy"
      ) ||
      message.mentions.has(
        client.user
      )
    ) {
      await message.channel.sendTyping();

      let reply = "";

      let attempts = 0;

      do {
        reply =
          await generateRoast(
            "SELF REPLY",
            message.author.username,
            message.content
          );

        attempts++;
      } while (
        isRepeated(
          message.author.id,
          reply
        ) &&
        attempts < 6
      );

      saveReply(
        message.author.id,
        reply
      );

      const gif =
        await getGif(reply);

      return message.reply({
        content: reply,
        files: gif ? [gif] : [],
      });
    }

    // ================= RANDOM REPLY =================

    const chance =
      Math.floor(
        Math.random() * 100
      );

    if (chance < 4) {
      const randomReply =
        await generateRoast(
          "RANDOM",
          message.author.username,
          message.content
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
      
          
