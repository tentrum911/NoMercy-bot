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

