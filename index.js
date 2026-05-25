const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const express = require("express");
require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("NoMercy is alive 💀");
});

app.listen(3000, () => {
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

const PREFIX = "!";
const ONE_HOUR = 60 * 60 * 1000;

const roastStats = {};
const recentLines = {};
const recentGifs = {};

// ============================
// ADD 100 ROAST LINES HERE
// ============================
const roastLines = [
"you look AI generated with low budget settings.",
"your brain has permanent airplane mode.",
"your confidence is louder than your intelligence.",
"you type like autocorrect gave up.",
"your personality is sponsored by lag.",
"your logic expired years ago.",
"you sound like weak WiFi.",
"your opinions are side quests.",
"you have the energy of a failed captcha.",
"your vibe got ratioed.",
"your face loaded with missing textures.",
"you’re proof tutorials don’t help everyone.",
"your brain runs on trial version.",
"your thoughts need software updates.",
"your existence lowers FPS.",
"your aura screams low battery.",
"you look like a background NPC.",
"your confidence is unsupported by facts.",
"your typing hurts literacy.",
"you think slower than Internet Explorer.",
"your brain cells are on unpaid leave.",
"your vibe got disconnected.",
"you talk like loading screens.",
"your personality is buffering.",
"your logic belongs in the recycle bin.",
"you look like a bad side quest.",
"you make silence awkward.",
"your existence feels optional.",
"you’re the human version of typo.",
"your thoughts arrive late.",
"your face has rendering issues.",
"your IQ needs premium upgrade.",
"your humor has expired.",
"you argue like broken GPS.",
"your personality has ads.",
"your thoughts got packet loss.",
"your brain uses Internet Explorer.",
"your confidence should stay private.",
"you sound downloadable.",
"your face looks procedurally generated.",
"your vibe has malware.",
"your logic got banned.",
"you look copy pasted.",
"your energy screams tutorial fail.",
"your brain entered sleep mode.",
"you talk like expired Bluetooth.",
"your opinions are corrupted files.",
"your vibe is unsupported hardware.",
"you type like angry autocorrect.",
"your face has low graphics settings.",
"you look emotionally sponsored.",
"your brain has high ping.",
"you sound factory reset.",
"your existence is DLC nobody bought.",
"you got defeated by basic logic.",
"your vibe belongs in drafts.",
"your aura got muted.",
"you argue like expired AI.",
"your personality is beta testing.",
"your logic crashes instantly.",
"your vibe needs patch notes.",
"your brain has server maintenance.",
"you look algorithm generated.",
"your confidence is fan fiction.",
"your thoughts have loading ads.",
"your vibe got nerfed.",
"your existence is low resolution.",
"your brain has parental controls.",
"you sound recyclable.",
"your personality has weak signal.",
"your thoughts feel pirated.",
"your logic got timeout error.",
"you look emotionally offline.",
"your brain entered power saving mode.",
"your face screams buffering.",
"you argue like expired captcha.",
"your vibe got shadow banned.",
"your thoughts are sponsored content.",
"your personality is optional update.",
"you sound compressed.",
"your brain has corrupted sectors.",
"your existence has ads every minute.",
"your vibe is free trial.",
"your logic is fan made.",
"you talk like tutorial subtitles.",
"your face has lag spikes.",
"your confidence scares science.",
"your brain lost connection.",
"your vibe is low effort.",
"your thoughts are recycled.",
"you sound badly optimized.",
"your logic belongs in beta.",
"your personality feels unfinished.",
"your aura disconnected from reality.",
"your face has update pending.",
"your thoughts are in maintenance.",
"your confidence got carried.",
"your existence lowered server quality.",
"you type like keyboard abuse victim.",
"your brain got packet loss.",
"your personality needs antivirus.",
"your logic failed successfully."
];

// ============================
// ADD 100 DESTROY LINES HERE
// ============================
const destroyLines = [
"got cooked so badly even the server felt second hand embarrassment 💀",
"your existence is proof some updates should've stayed in beta 💀",
"bro lost an argument to his own reflection 💀",
"your personality got rejected by artificial intelligence 💀",
"even autocorrect stopped trying to save you 💀",
"your brain has less activity than a dead group chat 💀",
"you got the confidence of a billionaire with the skill set of expired yogurt 💀",
"your face looks like your barber had personal issues 💀",
"you sound like somebody who claps when the plane lands 💀",
"you got humbled by basic common sense 💀",
"your thoughts move slower than school WiFi 💀",
"you talk like your brain pays rent separately 💀",
"bro's IQ is running on battery saver mode 💀",
"your existence feels like a deleted scene 💀",
"you got emotionally folded like cheap laundry 💀",
"your personality has the depth of a loading screen 💀",
"you argue like your source is TikTok comments 💀",
"your face card got declined internationally 💀",
"you sound like a tutorial nobody asked for 💀",
"your entire bloodline could not defend this level of embarrassment 💀",
"you got roasted so hard your ancestors felt it 💀",
"your brain has the processing power of a microwave 💀",
"your confidence should be studied by scientists 💀",
"you lost the genetic lottery and kept gambling 💀",
"your thoughts arrive with buffering symbols 💀",
"your personality got ratioed by reality itself 💀",
"you look like a failed Roblox avatar 💀",
"your logic expired before the conversation started 💀",
"your existence lowers the quality of nearby conversations 💀",
"you sound like somebody typing with one finger 💀",
"your brain is basically decorative 💀",
"your vibe screams unpaid internship 💀",
"you got defeated by your own sentence structure 💀",
"your aura has negative ratings 💀",
"you look like a side character with no dialogue 💀",
"your confidence is carrying your entire personality 💀",
"your opinions should require moderator approval 💀",
"bro got cooked harder than overworked CPU 💀",
"your intelligence left the match early 💀",
"your brain enters sleep mode mid conversation 💀",
"you sound like expired motivational quotes 💀",
"your existence has the energy of a failed reboot 💀",
"your logic got banned from public servers 💀",
"your personality feels AI generated incorrectly 💀",
"you got verbally demolished beyond repair 💀",
"your face has permanent low graphics settings 💀",
"your thoughts are held together with duct tape 💀",
"you argue like someone who still says first in comments 💀",
"your IQ has parental controls enabled 💀",
"your entire presence feels like a software error 💀",
"you got folded faster than a lawn chair 💀",
"your confidence survives things your intelligence cannot 💀",
"your personality is what happens when buffering becomes human 💀",
"you sound like somebody who loses tutorials 💀",
"your vibe got permanently shadow banned 💀",
"your logic has missing textures 💀",
"your existence feels algorithmically generated 💀",
"your brain got disconnected from reality years ago 💀",
"you got mentally uninstallled in real time 💀",
"your thoughts are public domain embarrassment 💀",
"you talk like your IQ is under maintenance 💀",
"your face looks procedurally generated 💀",
"your entire argument collapsed under gravity 💀",
"you got cooked so hard even the GIF lagged 💀",
"your personality has less structure than instant noodles 💀",
"you sound like low quality Bluetooth audio 💀",
"your brain works overtime to produce nonsense 💀",
"your vibe belongs in airplane mode 💀",
"your confidence is the only thing doing heavy lifting 💀",
"your existence feels sponsored by bad decisions 💀",
"you got folded like weak internet connection 💀",
"your personality has expired warranty 💀",
"you argue with the confidence of someone permanently wrong 💀",
"your brain runs on outdated drivers 💀",
"your face card got revoked permanently 💀",
"you got verbally hit by a financial recession 💀",
"your thoughts need software updates desperately 💀",
"your logic got cooked before entering the chat 💀",
"your presence lowers room temperature emotionally 💀",
"you sound like expired customer support 💀",
"your intelligence has left no surviving evidence 💀",
"your personality feels compressed into 144p 💀",
"you got destroyed harder than free public WiFi 💀",
"your existence feels like accidental screen recording 💀",
"your confidence has no business being this loud 💀",
"your vibe is basically unfinished homework 💀",
"you argue like someone who reads headlines only 💀",
"your thoughts travel slower than Windows updates 💀",
"your brain entered safe mode permanently 💀",
"your logic belongs in museum archives 💀",
"your personality could lose an argument to a calculator 💀",
"you got emotionally nerfed beyond recovery 💀",
"your aura feels pirated 💀",
"your face has side quest energy 💀",
"your intelligence got carried by autocorrect 💀",
"you sound like broken subtitles 💀",
"your vibe has permanent packet loss 💀",
"your entire existence feels like optional DLC 💀",
"your confidence got forged in delusion 💀",
"you got verbally sent back to factory settings 💀",
"your personality is basically background lag 💀",
"your brain has less RAM than a calculator 💀"
];

// ============================
// ADD 100 SELF MENTION REPLIES HERE
// ============================
const mentionReplies = [
"bro pinged me like he finally found human interaction.",
"you mention me the way toddlers press random buttons.",
"your notification felt like a system warning.",
"you type with the confidence of someone who never rereads messages.",
"your ping just lowered the quality of this channel.",
"your existence has side effects.",
"you sound like your inner voice gave up years ago.",
"your messages feel like accidental voice notes.",
"you mention me like you pay my electricity bill.",
"your thoughts look homemade.",
"your typing style screams low storage.",
"your brain sent that and called it a good idea.",
"your message had the energy of a dying battery.",
"you ping me like life isn't already hard enough.",
"your confidence should be in museums.",
"your aura just buffered in real time.",
"your logic took a smoke break mid sentence.",
"your messages feel sticky somehow.",
"you talk like your brain has popup ads.",
"your ping arrived with emotional damage.",
"your existence just caused background lag.",
"your thoughts look copy pasted from failed group chats.",
"your vibe feels like expired cereal.",
"you type like autocorrect filed a complaint against you.",
"your notification made the server feel unsafe.",
"your thoughts travel slower than airport WiFi.",
"your personality sounds flammable.",
"your typing has side quest energy.",
"your ping just triggered second hand embarrassment.",
"your brain typed that with full confidence too.",
"your messages feel legally questionable.",
"your vibe has outdated firmware.",
"you sound like a rejected podcast host.",
"your logic just tripped over itself.",
"your notification gave my RAM anxiety.",
"you mention me like your opinions matter here.",
"your messages feel AI generated incorrectly.",
"your typing has public restroom energy.",
"your vibe feels accidentally uploaded.",
"your brain definitely lagged before sending that.",
"your thoughts have unlicensed software energy.",
"your message looked tired before I even read it.",
"your confidence sounds rented.",
"your typing belongs in a customer complaint.",
"your aura got muted automatically.",
"your thoughts feel undercooked.",
"your ping arrived with low texture quality.",
"your logic sounds pirated.",
"your message felt like a scam email.",
"your vibe is built from leftover personality traits.",
"your notification just embarrassed your ancestors.",
"your thoughts move like old printers.",
"your typing feels emotionally unstable.",
"your aura entered battery saver mode.",
"your logic sounds sponsored by bad decisions.",
"your message gave the server trust issues.",
"your thoughts definitely came from incognito mode.",
"your personality feels factory refurbished.",
"your typing has unpaid internship energy.",
"your vibe just lost connection to reality.",
"your brain used predictive text for that one.",
"your notification had low frame rates.",
"your existence feels accidentally public.",
"your typing sounds like wet socks.",
"your message looked confused before I opened it.",
"your confidence feels procedurally generated.",
"your aura just got age restricted.",
"your thoughts feel recycled from YouTube comments.",
"your ping had background NPC energy.",
"your typing activated survival instincts.",
"your logic sounds emotionally uninsured.",
"your message arrived with packet loss.",
"your vibe feels microwave safe only.",
"your thoughts look like beta testing.",
"your notification smells like poor decisions.",
"your typing belongs behind parental controls.",
"your personality has buffering subtitles.",
"your message just violated common sense.",
"your vibe feels accidentally downloaded.",
"your aura has tutorial mode enabled.",
"your typing gave grammar depression.",
"your notification triggered my fight or flight response.",
"your thoughts look assembled in a hurry.",
"your vibe has expired drivers.",
"your logic sounds sleep deprived.",
"your message feels cursed in 4K.",
"your typing style looks physically exhausted.",
"your aura just disconnected from the server.",
"your confidence sounds AI enhanced.",
"your thoughts feel copied from loading screens.",
"your notification entered with negative aura.",
"your vibe feels emotionally rented.",
"your message had unnecessary confidence.",
"your typing activated low power mode.",
"your aura feels unsupported on this device.",
"your logic sounds sponsored by delusion.",
"your message arrived like a software bug.",
"your thoughts look legally editable.",
"your typing belongs in airplane mode.",
"your vibe sounds like expired headphones.",
"your notification reduced server morale instantly.",
"your existence just updated incorrectly.",
"your typing feels one software update behind."
];
// ============================
// ADD 50 GIF LINKS HERE
// ============================
const gifs = [
"https://media.giphy.com/media/l41YdDNnasCOd2TWo/giphy.gif",
"https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
"https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif",
"https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
"https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
"https://media.giphy.com/media/3oEduPQqbpT1LqVOz6/giphy.gif",
"https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
"https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif",
"https://media.giphy.com/media/9MFsKQ8A6HCN2/giphy.gif",
"https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif",
"https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif",
"https://media.giphy.com/media/26FPy3QZQqGtDcrja/giphy.gif",
"https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif",
"https://media.giphy.com/media/13ATyLQB0rLVzG/giphy.gif",
"https://media.giphy.com/media/14smAwp2uHM3Di/giphy.gif",
"https://media.giphy.com/media/3orieYJ5E6MBrv0YSI/giphy.gif",
"https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif",
"https://media.giphy.com/media/1014RBn4HVSTK/giphy.gif",
"https://media.giphy.com/media/hPPx8yk3Bmqys/giphy.gif",
"https://media.giphy.com/media/xUA7aM09ByyR1w5YWc/giphy.gif",
"https://media.giphy.com/media/3o7TKwmnDgQb5jemjK/giphy.gif",
"https://media.giphy.com/media/3o6ZsZdNs3yE5l6hWM/giphy.gif",
"https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
"https://media.giphy.com/media/l0MYryZTmQgvHI5TG/giphy.gif",
"https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
"https://media.giphy.com/media/3oKIPwoeGErMmaI43C/giphy.gif",
"https://media.giphy.com/media/11mwI67GLeMvgA/giphy.gif",
"https://media.giphy.com/media/3o7aTskHEUdgCQAXde/giphy.gif",
"https://media.giphy.com/media/VDTOChMWX1BmFflzyr/giphy.gif",
"https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
"https://media.giphy.com/media/YrD1PQldGsstG/giphy.gif",
"https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif",
"https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif",
"https://media.giphy.com/media/PjaQrF9J53UvTS2PPa/giphy.gif",
"https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif",
"https://media.giphy.com/media/3o7aD4kZn5k0SEvPmo/giphy.gif",
"https://media.giphy.com/media/3oEjHI8WJv4x6UPDB6/giphy.gif",
"https://media.giphy.com/media/1d5Zn8FqmJqApu4hNU/giphy.gif",
"https://media.giphy.com/media/ro08ZmQ1MeqZypzgDN/giphy.gif",
"https://media.giphy.com/media/cF7QqO5DYdft6/giphy.gif",
"https://media.giphy.com/media/Ju7l5y9osyymQ/giphy.gif",
"https://media.giphy.com/media/3ohs4qw8hkPShGeanS/giphy.gif",
"https://media.giphy.com/media/l378khQxt68syiWJy/giphy.gif",
"https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif",
"https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
"https://media.giphy.com/media/3ohhwxmNcPvwyRqYKI/giphy.gif",
"https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
"https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif",
"https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif",
"https://media.giphy.com/media/3o6Mbbs879ozZ9Yic/giphy.gif"
];

// ============================
// NO REPEAT FOR 1 HOUR
// ============================
function getUniqueLine(userId, type, array) {
  const key = `${userId}_${type}`;
  const now = Date.now();

  if (!recentLines[key]) {
    recentLines[key] = [];
  }

  recentLines[key] = recentLines[key].filter(
    item => now - item.time < ONE_HOUR
  );

  let available = array.filter(
    line => !recentLines[key].some(item => item.text === line)
  );

  if (available.length === 0) {
    recentLines[key] = [];
    available = array;
  }

  const chosen = available[Math.floor(Math.random() * available.length)];

  recentLines[key].push({
    text: chosen,
    time: now
  });

  return chosen;
}

function getUniqueGif(userId) {
  const now = Date.now();

  if (!recentGifs[userId]) {
    recentGifs[userId] = [];
  }

  recentGifs[userId] = recentGifs[userId].filter(
    item => now - item.time < ONE_HOUR
  );

  let available = gifs.filter(
    gif => !recentGifs[userId].some(item => item.text === gif)
  );

  if (available.length === 0) {
    recentGifs[userId] = [];
    available = gifs;
  }

  const chosen = available[Math.floor(Math.random() * available.length)];

  recentGifs[userId].push({
    text: chosen,
    time: now
  });

  return chosen;
}

client.once("ready", () => {
  console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // BOT MENTION REPLY
  if (message.mentions.has(client.user) && !message.content.startsWith(PREFIX)) {
    if (mentionReplies.length === 0) {
      return message.reply("mentionReplies list is empty.");
    }

    const reply = getUniqueLine(message.author.id, "mention", mentionReplies);
    return message.reply(reply);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ROAST COMMAND
  if (command === "roast") {
    if (roastLines.length === 0) {
      return message.reply("roastLines list is empty.");
    }

    const target = message.mentions.users.first() || message.author;
    const roast = getUniqueLine(target.id, "roast", roastLines);

    roastStats[target.id] = roastStats[target.id] || {
      username: target.username,
      roasts: 0,
      destroys: 0
    };

    roastStats[target.id].username = target.username;
    roastStats[target.id].roasts++;

    await message.channel.sendTyping();

    const embed = new EmbedBuilder()
      .setColor("DarkRed")
      .setDescription(`${target} ${roast}`);

    if (gifs.length > 0) {
      embed.setImage(getUniqueGif(target.id));
    }

    return message.reply({ embeds: [embed] });
  }

  // DESTROY COMMAND
  if (command === "destroy") {
    if (destroyLines.length === 0) {
      return message.reply("destroyLines list is empty.");
    }

    const target = message.mentions.users.first() || message.author;
    const line = getUniqueLine(target.id, "destroy", destroyLines);

    roastStats[target.id] = roastStats[target.id] || {
      username: target.username,
      roasts: 0,
      destroys: 0
    };

    roastStats[target.id].username = target.username;
    roastStats[target.id].roasts += 3;
    roastStats[target.id].destroys++;

    await message.channel.sendTyping();

    const embed = new EmbedBuilder()
      .setColor("DarkRed")
      .setDescription(`💀 ${target} ${line}`);

    if (gifs.length > 0) {
      embed.setImage(getUniqueGif(target.id));
    }

    return message.reply({ embeds: [embed] });
  }

  // STATS COMMAND
  if (command === "stats") {
    const target = message.mentions.users.first() || message.author;

    const stats = roastStats[target.id] || {
      username: target.username,
      roasts: 0,
      destroys: 0
    };

    return message.reply(
      `💀 ${stats.username} stats\n\nRoasted: ${stats.roasts}\nDestroyed: ${stats.destroys}`
    );
  }

  // LEADERBOARD COMMAND
  if (command === "leaderboard") {
    const users = Object.values(roastStats)
      .sort((a, b) => b.roasts - a.roasts)
      .slice(0, 10);

    if (users.length === 0) {
      return message.reply("no victims yet 💀");
    }

    const board = users
      .map((u, i) => `${i + 1}. ${u.username} — ${u.roasts} roasts`)
      .join("\n");

    return message.reply(`🏆 Roast Leaderboard\n\n${board}`);
  }

  // HELP COMMAND
  if (command === "help") {
    return message.reply(
      `💀 NoMercy Commands\n\n!roast @user\n!destroy @user\n!stats @user\n!leaderboard\n!help`
    );
  }
});

client.login(process.env.TOKEN);
