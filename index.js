   
    const express = require("express");
require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const ONE_HOUR = 60 * 60 * 1000;

const userMemory = {};
const recentUsed = new Map();

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

function getUniqueLine(userId, type, lines) {
  const key = `${userId}_${type}`;
  const now = Date.now();

  if (!recentUsed.has(key)) {
    recentUsed.set(key, []);
  }

  let used = recentUsed.get(key).filter(item => now - item.time < ONE_HOUR);
  recentUsed.set(key, used);

  let available = lines.filter(line => !used.some(item => item.text === line));

  if (available.length === 0) {
    used = [];
    recentUsed.set(key, used);
    available = lines;
  }

  const chosen = available[Math.floor(Math.random() * available.length)];

  used.push({
    text: chosen,
    time: now
  });

  recentUsed.set(key, used);

  return chosen;
}

const roastGifs = [
  "https://media.giphy.com/media/l41YdDNnasCOd2TWo/giphy.gif",
  "https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif",
  "https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif",
  "https://media.giphy.com/media/3ohs4qw8hkPShGeanS/giphy.gif",
  "https://media.giphy.com/media/cF7QqO5DYdft6/giphy.gif",
  "https://media.giphy.com/media/xT9DPBMumj2Q0hlI3K/giphy.gif",
  "https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
  "https://media.giphy.com/media/26n6Gx9moCgs1pUuk/giphy.gif",
  "https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif",
  "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif",
  "https://media.giphy.com/media/lszAB3TzFtRaU/giphy.gif",
  "https://media.giphy.com/media/1r91ZwKcE2J7WhUqrh/giphy.gif",
  "https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif",
  "https://media.giphy.com/media/3o7aD4kZn5k0SEvPmo/giphy.gif",
  "https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif",
  "https://media.giphy.com/media/RBeddeaQ5Xo0E/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif",
  "https://media.giphy.com/media/PjaQrF9J53UvTS2PPa/giphy.gif",
  "https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif",
  "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
  "https://media.giphy.com/media/1d5Zn8FqmJqApu4hNU/giphy.gif",
  "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
  "https://media.giphy.com/media/VDTOChMWX1BmFflzyr/giphy.gif",
  "https://media.giphy.com/media/13ATyLQB0rLVzG/giphy.gif",
  "https://media.giphy.com/media/3ohhwxmNcPvwyRqYKI/giphy.gif",
  "https://media.giphy.com/media/3o85xnoIXebk3xYx4Q/giphy.gif",
  "https://media.giphy.com/media/YrD1PQldGsstG/giphy.gif",
  "https://media.giphy.com/media/hPPx8yk3Bmqys/giphy.gif",
  "https://media.giphy.com/media/3orieYJ5E6MBrv0YSI/giphy.gif",
  "https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif",
  "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
  "https://media.giphy.com/media/11mwI67GLeMvgA/giphy.gif",
  "https://media.giphy.com/media/1014RBn4HVSTK/giphy.gif",
  "https://media.giphy.com/media/3og0INyCmHlNylks9O/giphy.gif",
  "https://media.giphy.com/media/3oKIPwoeGErMmaI43C/giphy.gif",
  "https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif",
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "https://media.giphy.com/media/14smAwp2uHM3Di/giphy.gif",
  "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
  "https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif",
  "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
  "https://media.giphy.com/media/l0MYryZTmQgvHI5TG/giphy.gif",
  "https://media.giphy.com/media/3o6ZsZdNs3yE5l6hWM/giphy.gif",
  "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif",
  "https://media.giphy.com/media/l0ExayQDzrI2xOb8A/giphy.gif",
  "https://media.giphy.com/media/3xz2BLBOt13X9AgjEA/giphy.gif",
  "https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif",
  "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
  "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif"
];

const roastLines = [
  "you look like your WiFi disconnects out of embarrassment.",
  "your brain runs like a phone at 1 percent battery.",
  "you type like autocorrect retired early.",
  "your confidence is bigger than your common sense.",
  "you look like a failed character customization screen.",
  "your thoughts arrive slower than public WiFi.",
  "you sound like an unskippable ad with opinions.",
  "your logic needs a software update.",
  "your brain has more bugs than beta software.",
  "you have the personality of expired milk.",
  "your face has low render distance.",
  "you talk like background noise learned words.",
  "your opinions should come with a warning label.",
  "you look like disappointment got a profile picture.",
  "your IQ is buffering again.",
  "you have main character energy with NPC stats.",
  "your brain forgot to install the smart package.",
  "you move like lag became human.",
  "your jokes need customer support.",
  "you sound like a tutorial nobody opened.",
  "your confidence needs parental controls.",
  "you look like a side quest nobody completed.",
  "your thoughts have packet loss.",
  "you type like your keyboard is filing a complaint.",
  "your brain runs on free trial mode.",
  "you look like a screenshot taken during lag.",
  "your logic is held together with tape.",
  "you sound like weak Bluetooth audio.",
  "your existence lowers server FPS.",
  "you look like failed DLC.",
  "your vibe got rejected by reality.",
  "your brain has airplane mode permanently on.",
  "you talk like a pop-up ad.",
  "your opinions need cooldowns.",
  "you look like a bug report with legs.",
  "your thoughts come in 144p.",
  "your personality has buffering issues.",
  "you sound like expired software.",
  "your brain needs antivirus.",
  "you look AI generated on low budget settings.",
  "your confidence is unsupported by evidence.",
  "you have the energy of a loading screen.",
  "your logic got banned from reality.",
  "you look like a rejected emoji.",
  "your brain uses Internet Explorer.",
  "your vibe is sponsored by bad decisions.",
  "you talk like your mic is emotionally damaged.",
  "your thoughts need quality control.",
  "your face looks like corrupted data.",
  "your personality has no warranty.",
  "you sound like fake AirPods arguing.",
  "your brain has high ping.",
  "you look like a typo became a person.",
  "your IQ needs tech support.",
  "your personality was written by interns.",
  "you sound like recycled comment section energy.",
  "your logic came from a discount website.",
  "you look like your barber lost a bet.",
  "your brain is still on demo mode.",
  "your thoughts crash on startup.",
  "your vibe is expired coupon energy.",
  "you sound like a motivational quote gone wrong.",
  "your face has lag spikes.",
  "your confidence should require permission.",
  "your brain was assembled incorrectly.",
  "you look like your own before picture.",
  "your personality is background noise.",
  "your thoughts are unsupported files.",
  "you talk like your brain is under maintenance.",
  "your logic needs a reboot.",
  "you look emotionally sponsored.",
  "your IQ has ads enabled.",
  "your vibe got muted by life.",
  "you sound like microwave instructions.",
  "your brain is pay-to-win and still losing.",
  "your personality is low graphics mode.",
  "you look like a deleted scene.",
  "your thoughts were delayed in traffic.",
  "your confidence has malware.",
  "you talk like a broken tutorial.",
  "your brain has subscription issues.",
  "you look like low-resolution regret.",
  "your logic is free trial intelligence.",
  "your vibe is in safe mode.",
  "your face looks like it loaded halfway.",
  "your thoughts have loading screens.",
  "your personality feels pirated.",
  "you sound like a keyboard smashing itself.",
  "your brain got disconnected from the server.",
  "your confidence is a visual bug.",
  "you look like your mirror needs therapy.",
  "your logic is missing textures.",
  "your vibe has expired warranty.",
  "your brain is running outdated drivers.",
  "you sound like a bad update.",
  "your face looks procedurally generated.",
  "your opinions belong in quarantine.",
  "your personality got patched out.",
  "your thoughts are compressed files.",
  "you look like chaos in 360p.",
  "your brain has skill issue."
];

const destroyLines = [
  "your existence lowers the IQ of nearby people.",
  "you sound like a broken YouTube ad.",
  "your confidence is terrifying for your skill level.",
  "your brain has left the chat permanently.",
  "you type like your keyboard is crying.",
  "your logic is illegal in multiple countries.",
  "your face needs a refund.",
  "you got defeated by common sense.",
  "your personality feels tax deductible.",
  "your thoughts come in 144p.",
  "you look like corrupted save data.",
  "your face has low render distance.",
  "your vibe got shadow banned.",
  "your existence feels pirated.",
  "your IQ got nerfed last patch.",
  "your brain runs on potato servers.",
  "your logic came from wish.com.",
  "you look like failed DLC.",
  "your confidence needs parental controls.",
  "your face looks emotionally unstable.",
  "your personality is background noise.",
  "your thoughts have packet loss.",
  "your vibe is unsupported hardware.",
  "your face looks AI generated badly.",
  "your logic is held together with tape.",
  "your existence is a side effect.",
  "you sound like fake AirPods.",
  "your IQ has ads enabled.",
  "your face got ratioed by reality.",
  "your brain entered airplane mode.",
  "your thoughts need antivirus.",
  "your personality expired years ago.",
  "your logic has missing textures.",
  "your face feels downloadable.",
  "your existence needs rebooting.",
  "your brain has skill issue.",
  "your vibe feels cursed in HD.",
  "your personality was written by interns.",
  "your thoughts are unsupported files.",
  "your confidence scares professionals.",
  "your face looks compressed.",
  "your logic came from TikTok comments.",
  "your brain buffers in real life.",
  "your vibe has monthly subscriptions.",
  "your personality got disconnected.",
  "your thoughts feel copyrighted.",
  "your face needs a software update.",
  "your existence lowers server FPS.",
  "your logic belongs in a museum.",
  "your brain uses Internet Explorer.",
  "your vibe got muted by reality.",
  "your personality is in beta testing.",
  "your thoughts got delayed in traffic.",
  "your face has tutorial NPC energy.",
  "your logic got banned from reality.",
  "your existence feels autogenerated.",
  "your confidence runs on lies.",
  "your brain forgot to install updates.",
  "your face is sponsored by lag.",
  "your personality has cooldown issues.",
  "your logic is free trial intelligence.",
  "your thoughts are compressed files.",
  "your vibe has loading screens.",
  "your existence should have stayed in drafts.",
  "your face got randomized.",
  "your personality is expired software.",
  "your logic crashes on startup.",
  "your thoughts deserve investigation.",
  "your vibe is emotionally sponsored.",
  "your brain got disconnected from server.",
  "your confidence has malware.",
  "your face looks procedurally generated.",
  "your personality was pirated badly.",
  "your existence got patched incorrectly.",
  "your logic has terrible optimization.",
  "your thoughts are low battery mode.",
  "your vibe feels legally questionable.",
  "your brain needs customer support.",
  "your face has side quest energy.",
  "your confidence has no warranty.",
  "your personality belongs in airplane mode.",
  "your thoughts are weak WiFi signals.",
  "your logic came pre-damaged.",
  "your existence feels like filler content.",
  "your face has buffering issues.",
  "your brain is DLC nobody bought.",
  "your personality is public domain cringe.",
  "your vibe got declined by reality.",
  "your thoughts are emotionally lagging.",
  "your confidence should be illegal.",
  "your logic is held hostage.",
  "your face looks factory reset.",
  "your personality is corrupted data.",
  "your existence has patch notes.",
  "your brain is running on demo mode.",
  "your vibe has expired warranty.",
  "your thoughts are unsupported updates.",
  "your confidence is a visual bug.",
  "your logic was assembled incorrectly.",
  "your face looks AI upscaled badly.",
  "your personality got deleted accidentally.",
  "your existence is low budget chaos.",
  "your brain has permanent loading screens.",
  "your vibe is sponsored by bad decisions."
];

const mentionReplies = [
  "you summoned me like a side quest 💀",
  "you again? tragic.",
  "your messages lower server FPS.",
  "lightly insulting you is self care.",
  "your notification should have stayed unread.",
  "you pinged me just to embarrass yourself?"
];

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const authorMemory = getMemory(message.author);

  const randomChance = Math.floor(Math.random() * 25);

  if (randomChance === 1) {
    await message.channel.sendTyping();

    setTimeout(() => {
      const roast = getUniqueLine(message.author.id, "roast", roastLines);
      authorMemory.roastCount++;
      message.reply(`${message.author} ${roast}`);
    }, 2000);
  }

  if (message.mentions.has(client.user)) {
    authorMemory.mentionCount++;

    await message.channel.sendTyping();

    setTimeout(() => {
      const reply =
        mentionReplies[Math.floor(Math.random() * mentionReplies.length)];

      message.reply(reply);
    }, 1500);
  }

  if (message.content.startsWith("!roast")) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply("mention someone to roast 💀");
    }

    const targetMemory = getMemory(target);
    targetMemory.roastCount++;

    const roast = getUniqueLine(target.id, "roast", roastLines);
    const gif = roastGifs[Math.floor(Math.random() * roastGifs.length)];

    await message.channel.sendTyping();

    setTimeout(() => {
      message.channel.send({
        content: `${target} ${roast}\n${gif}`
      });
    }, 2000);
  }

  if (message.content.startsWith("!destroy")) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply("mention someone to destroy 💀");
    }

    const targetMemory = getMemory(target);
    targetMemory.roastCount += 3;
    targetMemory.destroyCount++;

    const line = getUniqueLine(target.id, "destroy", destroyLines);
    const gif = roastGifs[Math.floor(Math.random() * roastGifs.length)];

    await message.channel.sendTyping();

    setTimeout(() => {
      message.channel.send({
        content: `💀 ${target} ${line}\n${gif}`
      });
    }, 2500);
  }

  if (message.content.startsWith("!stats")) {
    const target = message.mentions.users.first() || message.author;
    const stats = getMemory(target);

    message.reply(
      `💀 ${stats.username} stats\n\nRoasted: ${stats.roastCount}\nDestroyed: ${stats.destroyCount}\nSummoned bot: ${stats.mentionCount}`
    );
  }

  if (message.content.startsWith("!leaderboard")) {
    const users = Object.values(userMemory)
      .sort((a, b) => b.roastCount - a.roastCount)
      .slice(0, 10);

    if (users.length === 0) {
      return message.reply("no victims yet 💀");
    }

    const board = users
      .map((u, i) => `${i + 1}. ${u.username} — ${u.roastCount} roasts`)
      .join("\n");

    message.reply(`🏆 Roast Leaderboard\n\n${board}`);
  }
});

app.get("/", (req, res) => {
  res.send("NoMercy bot is alive 💀");
});

app.listen(3000, () => {
  console.log("Web server running");
});

client.login(process.env.TOKEN);
