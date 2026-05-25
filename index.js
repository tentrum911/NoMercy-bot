const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) =>
    fetch(...args)
  );
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials
} = require("discord.js");

const express = require("express");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.get("/", (req, res) => {
  res.send("NoMercy is alive 💀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server running");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const roastStats = {};

const recentReplies = new Map();

function isRepeated(userId, text) {
  const now = Date.now();

  if (!recentReplies.has(userId)) {
    recentReplies.set(userId, []);
  }

  const history = recentReplies.get(userId);

  const filtered = history.filter(
    item => now - item.time < 3600000
  );

  recentReplies.set(userId, filtered);

  const alreadyUsed = filtered.some(
    item => item.text === text
  );

  if (alreadyUsed) return true;

  filtered.push({
    text,
    time: now
  });

  return false;
}

async function generateRoast(prompt, type = "roast") {

  try {

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    let style = "";

    if (type === "destroy") {

      style =
        "Extremely brutal, humiliating, savage and impossible to reply to.";

    } else if (type === "mention") {

      style =
        "Funny sarcastic self-aware cocky reply.";

    } else {

      style =
        "Funny dark humor roast with light abuse.";

    }

    const result = await model.generateContent(`
      You are NoMercy, a brutal Discord roast bot.

      Rules:
      - Keep replies short
      - No essays
      - Internet humor
      - Gen Z humor
      - Never repeat jokes
      - Be creative
      - Dark humor allowed

      Style:
      ${style}

      User message:
      ${prompt}
    `);

    return result.response.text().trim();

  } catch (err) {

    console.log(err);

    return "even AI gave up roasting you 💀";

  }
}

async function fetchGif(searchText) {

  try {

    const query = encodeURIComponent(searchText);

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${query}&limit=25&rating=pg-13`
    );

    const data = await response.json();

    if (!data.data.length) return null;

    const gif =
      data.data[
        Math.floor(Math.random() * data.data.length)
      ];

    return gif.images.original.url;

  } catch (err) {

    console.log(err);

    return null;

  }
}

client.once("ready", () => {

  console.log(`${client.user.tag} is online.`);

});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  // =========================
  // STATS
  // =========================

  if (content.startsWith("!stats")) {

    const target =
      message.mentions.users.first() ||
      message.author;

    const count =
      roastStats[target.id] || 0;

    return message.reply(
      `${target.username} has been roasted ${count} times 💀`
    );
  }

  // =========================
  // ROAST
  // =========================

  if (content.startsWith("!roast")) {

    const target =
      message.mentions.users.first();

    if (!target) {

      return message.reply(
        "mention someone to roast 💀"
      );
    }

    let roast = "";
    let tries = 0;

    do {

      roast = await generateRoast(
        `${message.author.username} roasting ${target.username}`,
        "roast"
      );

      tries++;

    } while (
      isRepeated(target.id, roast) &&
      tries < 5
    );

    roastStats[target.id] =
      (roastStats[target.id] || 0) + 1;

    const gif = await fetchGif(roast);

    await message.channel.sendTyping();

    return message.reply(
      `${target} ${roast}${gif ? `\n${gif}` : ""}`
    );
  }

  // =========================
  // DESTROY
  // =========================

  if (content.startsWith("!destroy")) {

    const target =
      message.mentions.users.first();

    if (!target) {

      return message.reply(
        "mention someone to destroy 💀"
      );
    }

    let destroy = "";
    let tries = 0;

    do {

      destroy = await generateRoast(
        `${message.author.username} brutally destroying ${target.username}`,
        "destroy"
      );

      tries++;

    } while (
      isRepeated(target.id, destroy) &&
      tries < 5
    );

    roastStats[target.id] =
      (roastStats[target.id] || 0) + 1;

    const gif = await fetchGif(destroy);

    await message.channel.sendTyping();

    return message.reply(
      `${target} ${destroy}${gif ? `\n${gif}` : ""}`
    );
  }

  // =========================
  // MENTION REPLY
  // =========================

  if (message.mentions.has(client.user)) {

    let reply = "";
    let tries = 0;

    do {

      reply = await generateRoast(
        message.content,
        "mention"
      );

      tries++;

    } while (
      isRepeated(message.author.id, reply) &&
      tries < 5
    );

    const gif = await fetchGif(reply);

    await message.channel.sendTyping();

    return message.reply(
      `${reply}${gif ? `\n${gif}` : ""}`
    );
  }

  // =========================
  // RANDOM COMEBACKS
  // =========================

  const triggerWords = [
    "bot",
    "nomercy",
    "trash",
    "ugly",
    "stupid",
    "loser"
  ];

  if (
    triggerWords.some(word =>
      content.includes(word)
    )
  ) {

    if (Math.random() < 0.15) {

      const comeback =
        await generateRoast(
          message.content,
          "mention"
        );

      return message.reply(comeback);
    }
  }
});

client.login(process.env.TOKEN);
