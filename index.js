// ================================================================
//  NoMercy — Discord Roast Bot  v5
//  Discord.js v14 | Groq | Giphy | AWS EC2 | PM2
// ================================================================

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType
} = require("discord.js");

const express = require("express");
const Groq    = require("groq-sdk");

const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

// ================================================================
//  EXPRESS KEEP-ALIVE
// ================================================================

const app = express();
app.get("/",       (_req, res) => res.send("NoMercy is alive 😈"));
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`[SERVER] HTTP server on port ${PORT}`)
);

// ================================================================
//  ENV VALIDATION
// ================================================================

for (const key of ["TOKEN", "GROQ_API_KEY"]) {
  if (!process.env[key]) {
    console.error(`[ENV] FATAL — missing: ${key}`);
    process.exit(1);
  }
}
if (!process.env.GIPHY_API_KEY) {
  console.warn("[ENV] GIPHY_API_KEY not set — GIF replies disabled.");
}

// ================================================================
//  DISCORD CLIENT
// ================================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ================================================================
//  GROQ CLIENT
// ================================================================

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ================================================================
//  CONSTANTS
// ================================================================

const GROQ_MODEL           = "llama-3.3-70b-versatile";
const GROQ_TEMPERATURE     = 1.55;   // raised to 1.55 for more creative, human output
const GROQ_MAX_TOKENS      = 160;

const COOLDOWN_COMMAND_MS  = 3000;
const COOLDOWN_MENTION_MS  = 2000;
const COOLDOWN_RANDOM_MS   = 10000;
const COOLDOWN_GIF_MS      = 2000;

const RANDOM_REPLY_CHANCE  = 2;      // 2% per requirements
const MIN_RANDOM_WORDS     = 4;

const MAX_REPLY_HISTORY    = 100;    // per requirements: last 100 replies
const MAX_GIF_HISTORY      = 50;     // per requirements: last 50 GIFs
const MAX_CONVO_TURNS      = 10;
const MAX_TRACKED_USERS    = 5000;

const MAX_RETRIES_COMMAND  = 5;
const MAX_RETRIES_MENTION  = 4;

const CONTEXT_FETCH_LIMIT  = 8;
const SIMILARITY_THRESHOLD = 0.68;

const LEADERBOARD_SIZE     = 5;

// ================================================================
//  CRASH PREVENTION — registered early
// ================================================================

process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] Unhandled rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("[PROCESS] FATAL:", err?.message || err);
  console.error(err?.stack || "");
  process.exit(1);
});

// ================================================================
//  MEMORY STORES
// ================================================================

// { [userId]: { given, received, displayName } }
const roastStats = Object.create(null);

// userId → string[]  (dedup history)
const recentReplies = new Map();

// userId → { role, content }[]  (conversation context)
const userConversation = new Map();

// GIF dedup: Set for O(1) lookup + queue for FIFO eviction
const gifHistorySet   = new Set();
const gifHistoryQueue = [];

// userId → expiry ms
const cooldowns = new Map();

// ================================================================
//  STATS HELPERS
// ================================================================

function getStats(userId) {
  const raw = roastStats[userId];
  if (!raw)                    return { given: 0, received: 0, displayName: "?" };
  if (typeof raw === "number") return { given: 0, received: raw, displayName: "?" };
  return raw;
}

function recordReceived(userId, displayName) {
  const s = getStats(userId);
  roastStats[userId] = { ...s, received: s.received + 1, displayName };
}

function recordGiven(userId, displayName) {
  const s = getStats(userId);
  roastStats[userId] = { ...s, given: s.given + 1, displayName };
}

// ================================================================
//  MEMORY PRUNING  (every 30 min, doesn't block exit)
// ================================================================

function pruneMemory() {
  const now = Date.now();
  let cleared = 0;
  for (const [id, exp] of cooldowns.entries()) {
    if (exp < now) { cooldowns.delete(id); cleared++; }
  }
  if (recentReplies.size > MAX_TRACKED_USERS) {
    let drop = Math.floor(MAX_TRACKED_USERS / 2);
    let n    = 0;
    for (const k of recentReplies.keys()) {
      if (n++ >= drop) break;
      recentReplies.delete(k);
      userConversation.delete(k);
    }
    console.log(`[PRUNE] Dropped ${n} stale user entries`);
  }
  console.log(
    `[PRUNE] ${cleared} cooldowns | ${recentReplies.size} users | ${gifHistorySet.size} GIFs`
  );
}
setInterval(pruneMemory, 30 * 60 * 1000).unref();

// ================================================================
//  DEDUP HELPERS
// ================================================================

function normalizeText(t) {
  return t.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}

function isTooSimilar(a, b) {
  const na = normalizeText(a).split(" ").filter(Boolean);
  const nb = normalizeText(b).split(" ").filter(Boolean);
  if (!na.length || !nb.length) return false;
  const setA   = new Set(na);
  const shared = nb.filter((w) => setA.has(w)).length;
  return shared / Math.max(na.length, nb.length) > SIMILARITY_THRESHOLD;
}

function isRepeated(userId, text) {
  return (recentReplies.get(userId) || []).some((old) => isTooSimilar(old, text));
}

function saveReply(userId, text) {
  const h = recentReplies.get(userId) || [];
  h.push(text);
  if (h.length > MAX_REPLY_HISTORY) h.shift();
  recentReplies.set(userId, h);
}

function saveConversationTurn(userId, role, content) {
  const t = userConversation.get(userId) || [];
  t.push({ role, content });
  while (t.length > MAX_CONVO_TURNS) t.shift();
  userConversation.set(userId, t);
}

function getConversationHistory(userId) {
  return userConversation.get(userId) || [];
}

// ================================================================
//  GIF CACHE
// ================================================================

function isGifCached(url) { return gifHistorySet.has(url); }

function cacheGif(url) {
  if (gifHistorySet.has(url)) return;
  gifHistorySet.add(url);
  gifHistoryQueue.push(url);
  if (gifHistoryQueue.length > MAX_GIF_HISTORY) {
    gifHistorySet.delete(gifHistoryQueue.shift());
  }
}

// ================================================================
//  COOLDOWN
// ================================================================

function onCooldown(userId, ms = COOLDOWN_COMMAND_MS) {
  const now = Date.now();
  const exp = cooldowns.get(userId);
  if (exp && now < exp) {
    console.log(`[COOLDOWN] ${userId} — ${exp - now}ms left`);
    return true;
  }
  cooldowns.set(userId, now + ms);
  return false;
}

// ================================================================
//  MODE CONFIG
//  All 10 modes in one place. New modes: CHAOS, EXECUTION, JUDGE, COOK.
// ================================================================

const MODE_CONFIG = {
  ROAST: {
    label:     "roast",
    intensity: "funny, sharp, savage — go after their message or vibe"
  },
  DESTROY: {
    label:     "destroy",
    intensity: "brutal, confident, witty — obliterate the ego completely"
  },
  NUCLEAR: {
    label:     "nuclear roast",
    intensity: "maximum chaos, legendary, soul-evaporating — keep it clean but make it hurt"
  },
  SARCASTIC: {
    label:     "sarcastic comeback",
    intensity: "dry, deadpan, dismissive — weaponised politeness that stings"
  },
  CLOWN: {
    label:     "clown mode",
    intensity: "absurd, meme-heavy, chaotic — they are the clown, treat them accordingly 🤡"
  },
  COMEBACK: {
    label:     "comeback",
    intensity: "laser-focused counter — they stepped up, dismantle them in 2 sentences"
  },
  CHAOS: {
    label:     "chaos roast",
    intensity: "wildly unpredictable, unhinged, could go in any direction — pure chaos energy, still funny"
  },
  EXECUTION: {
    label:     "execution",
    intensity: "the hardest possible roast — calculated, deliberate, no mercy, ends careers. This is the final boss mode."
  },
  JUDGE: {
    label:     "courtroom verdict",
    intensity: "deliver a fake courtroom verdict on this person — formal tone mixed with savage judgment, find them guilty of being a clown"
  },
  COOK: {
    label:     "cooking session",
    intensity: "slowly roast every single thing about them — their message, their vibe, their confidence, their typing. Take your time. Cook them properly. 2-3 sentences building up."
  },
  MENTION: {
    label:     "mention reply",
    intensity: "context-aware, witty, direct response to exactly what they said"
  },
  RANDOM: {
    label:     "ambush roast",
    intensity: "one unexpected line that hits from nowhere"
  },
  // Used internally when user sends a GIF — roast + gif combo
  GIF_ROAST: {
    label:     "gif reaction roast",
    intensity: "mock the GIF they sent — comment on their choice of GIF, their energy, why they sent it. Short and savage."
  }
};

// Command → mode key. Module-level — not rebuilt per event.
const COMMAND_MAP = {
  "!roast":     "ROAST",
  "!destroy":   "DESTROY",
  "!nuclear":   "NUCLEAR",
  "!sarcastic": "SARCASTIC",
  "!clown":     "CLOWN",
  "!comeback":  "COMEBACK",
  "!chaos":     "CHAOS",
  "!execution": "EXECUTION",
  "!judge":     "JUDGE",
  "!cook":      "COOK"
};

// ================================================================
//  FALLBACK REPLIES  (100+ entries, diverse enough to avoid dedup hits)
// ================================================================

const FALLBACK = {
  general: [
    "bro roasted himself before I could 😭",
    "your message has the confidence of a broken charger 💀",
    "even autocorrect gave up on that one 😭",
    "that was less of a message and more of a cry for WiFi 💀",
    "you type like your keyboard filed a restraining order 😭",
    "said that like it was supposed to land 💀",
    "I've seen better arguments from a loading spinner 😭",
    "your whole vibe is a 404 error 💀",
    "talking to you is like buffering at 2% forever 😭",
    "bro typed that with their whole chest and still missed 💀",
    "the audacity is strong but the intelligence is not 😭",
    "not even spell check could save that one 💀",
    "your message is in my prayers 😭",
    "this ain't it chief — not even a little bit 💀",
    "you really sent that with no hesitation huh 😭",
    "that sentence needed a warning label 💀",
    "bro said that out loud and felt confident 😭",
    "your comment just pulled a hamstring 💀",
    "you got participation energy on a championship day 😭",
    "your message loaded. unfortunately 💀",
    "the bar was on the floor and you still tripped 😭",
    "your opinion arrived late and underdressed 💀",
    "somewhere a philosophy teacher is crying 😭",
    "you said a lot of words and meant absolutely none of them 💀",
    "your delivery was local anesthetic — numb and forgettable 😭",
    "bro submitted that like it was homework 💀",
    "you type like every sentence is a first draft 😭",
    "your confidence-to-quality ratio is genuinely terrifying 💀",
    "that message had the energy of a dying laptop fan 😭",
    "I've read cereal boxes with more depth 💀",
    "you came to battle with a water gun 😭",
    "your message is the avatar state of mid 💀",
    "nobody was waiting for that 😭",
    "you really built up to absolutely nothing 💀",
    "that reply has the range of a Nokia alarm 😭"
  ],
  angry: [
    "calm down, your caps lock is doing more damage than you are 💀",
    "you sound like your loading screen got stuck at 3% 😭",
    "that anger came with zero horsepower 💀",
    "relax, your keyboard can't keep up with the delusion 😭",
    "you're raging in standard definition 💀",
    "bro woke up and chose violence with no budget 😭",
    "all that energy and still nothing happened 💀",
    "you type angry like someone who lost at Uno 😭",
    "that frustration had the impact of a strongly worded Post-it note 💀",
    "even your anger came with a loading bar 😭",
    "you're heated but you're running on 2% battery 💀",
    "bold to be this mad about something you caused yourself 😭",
    "if anger were skill points, you'd still be bronze 💀",
    "the tantrum is noted and ignored 😭",
    "bro is furious and somehow still losing 💀"
  ],
  insult: [
    "that insult had factory settings energy 💀",
    "bro pulled that comeback from a 2012 comment section 😭",
    "you said that like it was supposed to do damage 💀",
    "called me out with the force of a wet paper towel 😭",
    "that insult has never worked once in its entire life 💀",
    "bro tried to roast me with something retired since 2014 😭",
    "your words arrived D.O.A. 💀",
    "that comeback needed a ambulance not an audience 😭",
    "you swung and hit air again 💀",
    "that insult sat in drafts too long 😭",
    "bro pulled a pre-nerfed roast and still whiffed 💀",
    "your diss had the structural integrity of wet cardboard 😭",
    "that came out like a warning shot that missed by two counties 💀",
    "you typed that with confidence and I actually feel bad for you 😭",
    "bro brought a vibe check and failed it himself 💀"
  ],
  // Targeted comebacks for specific trigger words
  fuckYou: [
    "the classics never land but you keep trying, I respect the commitment 💀",
    "that response must have taken you all of 0.3 seconds of thought 😭",
    "bro escalated to 'fuck you' before the first argument even landed 💀",
    "your conflict resolution skills are built different (badly) 😭",
    "'fuck you' — original. never heard that one. truly shaking. 💀"
  ],
  stupid: [
    "calling others stupid is the first sign you should google yourself 💀",
    "buddy you spelled stupid wrong in your head before typing it 😭",
    "that word is doing a lot of heavy lifting for someone who doesn't lift 💀",
    "bold of you to enter that conversation 😭",
    "calling me stupid while typing that sentence is peak irony 💀"
  ],
  idiot: [
    "bro pulled up to an insult battle with the word 'idiot' 💀",
    "we're calling people idiots now? refreshing to keep it 2005 😭",
    "the word 'idiot' is literally your baseline vocabulary, this checks out 💀",
    "you said 'idiot' like it was your final move 😭",
    "took all that typing energy to land on 'idiot' — genuinely impressive 💀"
  ]
};

// ================================================================
//  TRIGGER MAPS  (module-level, not rebuilt per call)
// ================================================================

const ANGRY_TRIGGERS  = [
  "fuck you", "motherfucker", " mf ", "stfu", "shut up", "shut the fuck", "i hate you", "go to hell"
];
const INSULT_TRIGGERS = [
  "bitch", "asshole", "dickless", "trash bot", "garbage bot", "useless bot", "dumbass", "moron"
];
const STUPID_TRIGGERS = ["stupid", "dumb", "brain dead", "braindead", "smooth brain", "smoothbrain"];
const IDIOT_TRIGGERS  = ["idiot", "imbecile", "clown bot", "you're an idiot", "youre an idiot"];
const FUCK_TRIGGERS   = ["fuck you", "fuck off", "get fucked"];

// ================================================================
//  GIF KEYWORD POOLS  (expanded, no Groq call needed)
// ================================================================

const GIF_KEYWORDS_GENERIC = [
  "laughing meme", "crying laughing meme", "seriously meme",
  "side eye meme", "clown meme", "emotional damage meme",
  "wut meme", "get out meme", "bruh meme", "not impressed meme",
  "dead inside meme", "facepalm meme", "this is fine meme",
  "confused meme", "well actually meme", "okay meme reaction",
  "disappointed meme", "sir this is a waffle house meme",
  "who asked meme", "touch grass meme"
];

const GIF_KEYWORDS_ROAST = [
  "savage comeback", "mic drop meme", "destroyed meme",
  "ratio meme", "roasted meme", "brutal meme",
  "awkward stare meme", "get rekt meme", "owned meme",
  "you played yourself meme", "womp womp meme",
  "skill issue meme", "not my problem meme", "L plus ratio",
  "stay mad meme", "crying laughing reaction", "walk of shame meme",
  "clowned yourself meme", "that was embarrassing meme", "next slide meme"
];

// ================================================================
//  UTILITY
// ================================================================

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Smart local comeback — checks WHAT specifically the user said
 * and returns a targeted reply rather than a generic one.
 * Returns null if no match → caller proceeds to Groq.
 */
function localComeback(content) {
  const t = content.toLowerCase();
  if (FUCK_TRIGGERS.some((x)   => t.includes(x))) return randomFrom(FALLBACK.fuckYou);
  if (IDIOT_TRIGGERS.some((x)  => t.includes(x))) return randomFrom(FALLBACK.idiot);
  if (STUPID_TRIGGERS.some((x) => t.includes(x))) return randomFrom(FALLBACK.stupid);
  if (ANGRY_TRIGGERS.some((x)  => t.includes(x))) return randomFrom(FALLBACK.angry);
  if (INSULT_TRIGGERS.some((x) => t.includes(x))) return randomFrom(FALLBACK.insult);
  return null;
}

// ================================================================
//  RECENT CHANNEL CONTEXT
//  Array.from() needed because Collection.filter() returns a
//  Collection (no .reverse()), not an Array.
// ================================================================

async function getRecentContext(message) {
  try {
    const fetched = await message.channel.messages.fetch({ limit: CONTEXT_FETCH_LIMIT });
    const lines = Array.from(fetched.values())
      .filter((m) => !m.author.bot && m.content?.trim())
      .reverse()
      .map((m) => `${m.author.username}: ${m.content.trim()}`)
      .join("\n");
    return lines || message.content;
  } catch (err) {
    console.warn("[CONTEXT] Fetch failed:", err?.message);
    return message.content;
  }
}

// ================================================================
//  GIF DETECTION
//  embed.type === "gifv" is deprecated in Discord API v10.
//  Use embed.video + URL pattern matching instead.
// ================================================================

const GIF_URL_PATTERN =
  /https?:\/\/(tenor\.com|giphy\.com|media\.giphy\.com|c\.tenor\.com)[^\s]*/i;

function messageHasGif(message) {
  if (GIF_URL_PATTERN.test(message.content)) return true;
  for (const att of message.attachments.values()) {
    if (att.url?.endsWith(".gif") || att.contentType?.includes("image/gif")) return true;
  }
  for (const embed of message.embeds) {
    if (embed.video)                              return true;
    if (embed.url && GIF_URL_PATTERN.test(embed.url)) return true;
    if (embed.thumbnail?.url?.endsWith(".gif"))   return true;
    if (embed.image?.url?.endsWith(".gif"))       return true;
  }
  return false;
}

// ================================================================
//  GIPHY FETCH
// ================================================================

async function fetchGif(query) {
  if (!process.env.GIPHY_API_KEY) return null;
  try {
    const res = await fetch(
      "https://api.giphy.com/v1/gifs/search" +
      `?api_key=${process.env.GIPHY_API_KEY}` +
      `&q=${encodeURIComponent(query)}&limit=30&rating=pg-13`
    );
    if (!res.ok) {
      console.warn(`[GIPHY] HTTP ${res.status} for "${query}"`);
      return null;
    }
    const data = await res.json();
    if (!data?.data?.length) {
      console.warn(`[GIPHY] No results for "${query}"`);
      return null;
    }
    const pool = data.data
      .map((item) => item?.images?.original?.url)
      .filter(Boolean)
      .sort(() => Math.random() - 0.5);

    for (const url of pool) {
      if (!isGifCached(url)) {
        cacheGif(url);
        console.log(`[GIPHY] Fresh GIF: "${query}"`);
        return url;
      }
    }
    console.warn(`[GIPHY] All ${pool.length} results cached for "${query}"`);
    return null;
  } catch (err) {
    console.error("[GIPHY] Error:", err?.message);
    return null;
  }
}

/**
 * Pick a reaction GIF from the static keyword pool.
 * roastRelated=true → roast-themed pool.
 * No Groq call — static pools are fast and save API quota.
 */
async function getReactionGif(roastRelated = false) {
  if (!process.env.GIPHY_API_KEY) return null;
  const keyword = randomFrom(roastRelated ? GIF_KEYWORDS_ROAST : GIF_KEYWORDS_GENERIC);
  console.log(`[GIPHY] Keyword: "${keyword}" roast=${roastRelated}`);
  return fetchGif(keyword);
}

// ================================================================
//  AI ROAST GENERATION
//  History is embedded in the system prompt (not fake message turns)
//  to avoid token waste and keep a clean 2-message API structure.
// ================================================================

async function generateRoast(type, username, messageContent, context, userId) {
  const config  = MODE_CONFIG[type] || MODE_CONFIG.ROAST;
  const history = userId ? getConversationHistory(userId) : [];

  console.log(`[GROQ] mode=${config.label} target="${username}" hist=${history.length}t`);

  const historyBlock = history.length > 0
    ? "\n\nCONVERSATION HISTORY (context only — do NOT repeat these):\n" +
      history.map((t) => `${t.role === "user" ? username : "NoMercy"}: ${t.content}`).join("\n")
    : "";

  const systemPrompt =
    `You are NoMercy — a savage, witty, unpredictable Discord roast bot with a real personality.

PERSONALITY:
- You write exactly like a real Discord user. Zero corporate tone. Zero AI stiffness.
- You are meme-literate, internet-native, sarcastic, occasionally absurd.
- You read the room: precise and cold when it lands harder, chaotic when chaos wins.
- You remember earlier things people said and use them against the person when funny.
- You can use mild language: idiot, dumbass, clown, loser, goofy, brain-dead, bitch (sparingly), stupid ass, walking L.

OUTPUT RULES:
- 1 to 3 SHORT sentences MAXIMUM. Never write a paragraph. Never write an essay.
- Vary your structure EVERY reply: mix rhetorical questions, fake sympathy, comparisons, callbacks, one-liners.
- Use Discord / internet slang naturally — don't force or over-explain it.
- Emojis: use occasionally, not on every single reply.
- Do NOT start with "${username}" — address them differently each time.
- Do NOT wrap the reply in quotation marks.
- Do NOT say "I roast" or "here's my roast" — just DO it.
- Replies should feel like a real person clapping back, not an AI generating text.

HARD RULES — NEVER BREAK THESE:
- No racism, homophobia, transphobia, or protected-class attacks of any kind.
- No sexual content, no doxxing, no credible threats, no graphic violence.
- Roast the message, the vibe, the ego, the typing, the behavior — never identity or appearance.
- If directly insulted, counter with sharper wit. Never escalate to slurs.` +
    historyBlock;

  const userPrompt =
    `ROAST MODE: ${config.label}
INTENSITY: ${config.intensity}
TARGET: ${username}

THEIR MESSAGE:
"${messageContent}"

RECENT CHANNEL CONTEXT:
${context}

Write the roast now. No preamble. No explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      temperature: GROQ_TEMPERATURE,
      max_tokens:  GROQ_MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      console.warn("[GROQ] Empty response — fallback");
      return randomFrom(FALLBACK.general);
    }

    const clean = raw.replace(/^["'`]|["'`]$/g, "").trim();
    console.log(`[GROQ] "${clean.substring(0, 90)}${clean.length > 90 ? "…" : ""}"`);
    return clean;
  } catch (err) {
    const code = err?.status || err?.statusCode || "";
    console.error(`[GROQ] Error ${code}:`, err?.message || err);
    return localComeback(messageContent) || randomFrom(FALLBACK.general);
  }
}

// ================================================================
//  UNIQUE REPLY GENERATOR
//  Retries Groq if the output is too similar to prior replies.
//  Keeps typing indicator alive across retry attempts.
// ================================================================

async function generateUniqueRoast(
  type, username, messageContent, context, userId,
  maxAttempts = MAX_RETRIES_COMMAND,
  channel = null
) {
  let reply    = "";
  let attempts = 0;

  do {
    if (channel) channel.sendTyping().catch(() => {});
    reply = await generateRoast(type, username, messageContent, context, userId);
    attempts++;
    if (!isRepeated(userId, reply)) break;
    console.log(`[RETRY] attempt ${attempts}/${maxAttempts}`);
  } while (attempts < maxAttempts);

  saveReply(userId, reply);
  if (userId) {
    saveConversationTurn(userId, "user",      messageContent);
    saveConversationTurn(userId, "assistant", reply);
  }
  return reply;
}

// ================================================================
//  SEND ROAST  — TEXT ONLY, NO GIF
//  All command-triggered roasts. Never attaches a GIF.
// ================================================================

async function sendRoast(message, target, type) {
  recordReceived(target.id,      target.username);
  recordGiven(message.author.id, message.author.username);

  console.log(`[ROAST] ${message.author.username} → ${target.username} | ${type}`);

  await message.channel.sendTyping().catch(() => {});
  const context = await getRecentContext(message);

  const reply = await generateUniqueRoast(
    type, target.username, message.content, context,
    target.id, MAX_RETRIES_COMMAND, message.channel
  );

  return message.reply({ content: `${target} ${reply}` });
}

// ================================================================
//  SEND GIF ROAST  — ROAST TEXT + ONE GIF
//  Only called when a user sends a GIF.
//  Generates a roast about the GIF + attaches a reaction GIF.
//  This is the ONLY path where text + GIF are combined.
// ================================================================

async function sendGifRoast(message, botMentioned) {
  const authorId       = message.author.id;
  const authorUsername = message.author.username;

  console.log(`[GIF_ROAST] ${authorUsername} sent GIF — mention=${botMentioned}`);

  await message.channel.sendTyping().catch(() => {});
  const context = await getRecentContext(message);

  // Generate a roast about the GIF they sent
  const roastText = await generateUniqueRoast(
    "GIF_ROAST",
    authorUsername,
    message.content || "[sent a GIF]",
    context,
    authorId,
    MAX_RETRIES_MENTION,
    message.channel
  );

  // Fetch a reaction GIF — roast-themed if they mentioned the bot
  const gif = await getReactionGif(botMentioned);

  if (gif) {
    // Reply: roast text + reaction GIF
    return message.reply({ content: roastText, files: [gif] });
  }

  // Giphy unavailable — reply text only (graceful degradation)
  console.warn("[GIF_ROAST] No GIF available — replying text only");
  return message.reply({ content: roastText });
}

// ================================================================
//  LEADERBOARD BUILDER
// ================================================================

function buildLeaderboard() {
  const entries = Object.keys(roastStats).map((id) => ({ id, ...getStats(id) }));

  if (!entries.length) {
    return "Nobody has been roasted yet 💀 Type `!roast @user` to start.";
  }

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  const topReceived = [...entries]
    .sort((a, b) => b.received - a.received)
    .slice(0, LEADERBOARD_SIZE)
    .map((e, i) =>
      `${medals[i]} **${e.displayName}** — ${e.received} roast${e.received !== 1 ? "s" : ""} received`
    ).join("\n");

  const topGiven = [...entries]
    .filter((e) => e.given > 0)
    .sort((a, b) => b.given - a.given)
    .slice(0, LEADERBOARD_SIZE)
    .map((e, i) =>
      `${medals[i]} **${e.displayName}** — ${e.given} roast${e.given !== 1 ? "s" : ""} fired`
    ).join("\n") || "No active roasters yet 👀";

  return (
    "**🏆 NoMercy Roast Leaderboard**\n\n" +
    "**Most Roasted** 💀\n" + topReceived +
    "\n\n**Most Active Roasters** 🔥\n" + topGiven
  );
}

// ================================================================
//  READY
// ================================================================

client.once("ready", () => {
  console.log(`[READY] ${client.user.tag} 🔥`);
  client.user.setPresence({
    activities: [{ name: "destroying egos 😈", type: ActivityType.Playing }],
    status: "online"
  });
});

// ================================================================
//  MESSAGE HANDLER
//
//  Branch order — strictly sequential, non-overlapping:
//
//  1.  Ignore bots
//  2.  Empty guard
//  3.  !help           → text, no AI, no cooldown
//  4.  !stats          → text, no AI, no cooldown
//  5.  !leaderboard    → text, no AI, no cooldown
//  6.  Roast commands  → TEXT ONLY (no GIF ever)
//  7.  GIF detection   → ROAST TEXT + GIF (only path with GIF output)
//  8.  Bot mention     → TEXT ONLY
//  9.  Random reply    → TEXT ONLY
//
//  GIF branch (7) is the EXCLUSIVE owner of all GIF output.
//  No other branch produces a GIF.
//  No roast command branch ever calls fetchGif or getReactionGif.
// ================================================================

client.on("messageCreate", async (message) => {
  try {

    // ── 1. IGNORE BOTS ────────────────────────────────────────────
    if (message.author.bot) return;

    // ── 2. EMPTY GUARD ────────────────────────────────────────────
    const raw     = message.content || "";
    const content = raw.toLowerCase().trim();
    if (!content && !message.attachments.size && !message.embeds.length) return;

    const authorId       = message.author.id;
    const authorUsername = message.author.username;

    // Official Discord mention check only — no substring matching.
    const botMentioned = message.mentions.has(client.user);

    // ── 3. HELP ───────────────────────────────────────────────────
    if (content.startsWith("!help")) {
      console.log(`[CMD] !help — ${authorUsername}`);
      return message.reply(
        "**NoMercy Commands** 😈\n\n" +
        "**Standard Roasts**\n" +
        "`!roast @user`      — savage roast 🔥\n" +
        "`!destroy @user`    — ego-crusher 💀\n" +
        "`!nuclear @user`    — maximum obliteration ☢️\n" +
        "`!sarcastic @user`  — deadpan sarcasm 🙄\n" +
        "`!clown @user`      — meme clowning 🤡\n" +
        "`!comeback @user`   — counter-attack 🗡️\n\n" +
        "**Special Modes**\n" +
        "`!chaos @user`      — unpredictable savage 🌀\n" +
        "`!execution @user`  — final boss roast ⚰️\n" +
        "`!judge @user`      — courtroom verdict ⚖️\n" +
        "`!cook @user`       — slow cooking session 🍳\n\n" +
        "**Info**\n" +
        "`!stats @user`      — roast stats 📊\n" +
        "`!leaderboard`      — server leaderboard 🏆\n\n" +
        "**Passive**\n" +
        "Mention me → text roast reply.\n" +
        "Send a GIF → I roast it and send one back."
      );
    }

    // ── 4. STATS ──────────────────────────────────────────────────
    if (content.startsWith("!stats")) {
      const target = message.mentions.users.first() || message.author;
      const stats  = getStats(target.id);
      console.log(`[CMD] !stats — ${target.username} rcv=${stats.received} gvn=${stats.given}`);
      return message.reply(
        `**${target.username}** has been roasted **${stats.received}** ` +
        `time${stats.received !== 1 ? "s" : ""} 💀 and fired **${stats.given}** ` +
        `roast${stats.given !== 1 ? "s" : ""} 🔥`
      );
    }

    // ── 5. LEADERBOARD ────────────────────────────────────────────
    if (content.startsWith("!leaderboard")) {
      console.log(`[CMD] !leaderboard — ${authorUsername}`);
      return message.reply(buildLeaderboard());
    }

    // ── 6. ROAST COMMANDS — TEXT ONLY ─────────────────────────────
    //  Word-boundary check: "!roast" must not be followed by a letter
    //  (prevents "!roastanything" matching "!roast").
    //  Self-roast guard: bot refuses to roast itself.
    //
    for (const [cmd, mode] of Object.entries(COMMAND_MAP)) {
      if (content.startsWith(cmd)) {
        const next = content[cmd.length];
        if (next !== undefined && next !== " ") continue;

        if (onCooldown(authorId, COOLDOWN_COMMAND_MS)) return;

        const target = message.mentions.users.first();
        if (!target) {
          return message.reply(`mention someone to ${cmd.slice(1)} 💀  e.g. \`${cmd} @user\``);
        }
        if (target.id === client.user.id) {
          return message.reply("nice try 😈 I don't roast myself.");
        }

        console.log(`[CMD] ${cmd} ${authorUsername} → ${target.username}`);
        return sendRoast(message, target, mode);
      }
    }

    // ── 7. GIF DETECTION — ROAST TEXT + GIF ───────────────────────
    //
    //  This is the ONLY branch that produces a GIF in the output.
    //  Behaviour:
    //    - Analyse the GIF (via context + mode GIF_ROAST)
    //    - Generate a roast about the GIF they sent
    //    - Fetch a matching reaction GIF from Giphy
    //    - Reply: roast text + ONE GIF
    //
    //  If Giphy is unavailable: replies with text only (graceful).
    //  Always returns — never falls through to text branches.
    //
    if (messageHasGif(message)) {
      if (onCooldown(authorId, COOLDOWN_GIF_MS)) return;
      return sendGifRoast(message, botMentioned);
    }

    // ── 8. BOT MENTION — TEXT ONLY ────────────────────────────────
    //  Only reached if the message does NOT contain a GIF.
    //  Text reply only — GIF system is never touched here.
    //
    if (botMentioned) {
      if (onCooldown(authorId, COOLDOWN_MENTION_MS)) return;

      console.log(`[MENTION] ${authorUsername}`);
      await message.channel.sendTyping().catch(() => {});

      const context = await getRecentContext(message);
      const local   = localComeback(content);
      let reply;

      if (local && !isRepeated(authorId, local)) {
        reply = local;
        saveReply(authorId, reply);
        saveConversationTurn(authorId, "user",      message.content);
        saveConversationTurn(authorId, "assistant", reply);
        console.log("[MENTION] Local comeback");
      } else {
        reply = await generateUniqueRoast(
          "MENTION", authorUsername, message.content, context,
          authorId, MAX_RETRIES_MENTION, message.channel
        );
      }

      return message.reply({ content: reply });
    }

    // ── 9. RANDOM REPLY — TEXT ONLY ───────────────────────────────
    //  2% chance (per requirements), minimum word count gate.
    //  Text only — no GIF.
    //
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount >= MIN_RANDOM_WORDS && Math.random() * 100 < RANDOM_REPLY_CHANCE) {
      if (onCooldown(authorId, COOLDOWN_RANDOM_MS)) return;

      console.log(`[RANDOM] Ambush — ${authorUsername}`);
      const context = await getRecentContext(message);

      const reply = await generateUniqueRoast(
        "RANDOM", authorUsername, message.content, context,
        authorId, MAX_RETRIES_COMMAND, message.channel
      );

      return message.reply({ content: reply });
    }

  } catch (err) {
    console.error("[MESSAGE] Error:", err?.message || err);
    try {
      await message.reply("NoMercy glitched for a sec 💀");
    } catch { /* message deleted or no perms — ignore */ }
  }
});

// ================================================================
//  LOGIN
// ================================================================

client.login(process.env.TOKEN).catch((err) => {
  console.error("[LOGIN] Failed:", err?.message);
  process.exit(1);
});
