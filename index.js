require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const roasts = [
  "Your brain runs on airplane mode.",
  "You're proof that confidence doesn't need intelligence.",
  "Even autocorrect gave up on you.",
  "You talk like a tutorial nobody asked for.",
  "You're the reason mute buttons exist.",
  "If stupidity burned calories you'd disappear.",
  "You're built like a failed software update.",
  "Your opinions should come with trigger warnings for IQ loss."
];

client.once('ready', () => {
  console.log(`${client.user.tag} is online.`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!roast')) {
    const roast =
      roasts[Math.floor(Math.random() * roasts.length)];

    message.reply(roast);
  }
});

client.login(process.env.TOKEN);
