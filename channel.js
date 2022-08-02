const fs = require("fs");
const { URL, URLSearchParams } = require("url");
const { execSync } = require("child_process");
const { convertMessage, getUser } = require("./message");
const moment = require("moment");

// Discord's token, read here how to obtain it https://github.com/Tyrrrz/DiscordChatExporter/wiki/Obtaining-Token-and-Channel-IDs
const TOKEN = "token";

function getOutputDir(dateAfter, dateBefore) {
  return `./input/${dateAfter?.replaceAll(" ", "_") ?? "after"}-${
    dateBefore?.replaceAll(" ", "_") ?? "before"
  }`;
}

function fetchChannel(channelId, dateAfter, dateBefore) {
  const channelFile = `${getOutputDir(
    dateAfter,
    dateBefore
  )}/channel_${channelId}.json`;

  const channelTmpFile = `${getOutputDir(
    dateAfter,
    dateBefore
  )}/channel_${channelId}_tmp.json`;

  const stat = fs.statSync(channelFile, { throwIfNoEntry: false });
  if (!stat) {
    console.log("fetching channel...", channelId, channelFile);
    fs.rmSync(channelTmpFile, { force: true });

    execSync(
      `dotnet ./DiscordChatExporter/DiscordChatExporter.Cli.dll export -t "${TOKEN}" -c ${channelId} ${
        dateAfter ? `--after "${dateAfter}"` : ""
      } ${
        dateBefore ? `--before "${dateBefore}"` : ""
      } -f Json -o "${channelTmpFile}"`,
      { stdio: "inherit" }
    );

    fs.renameSync(channelTmpFile, channelFile);
  }
}

async function exportChannel(channelId, dateAfter, dateBefore) {
  try {
    await fetchChannel(channelId, dateAfter, dateBefore);
  } catch (e) {
    console.log(e);
  }

  try {
    await fetchChannelThreads(channelId, dateAfter, dateBefore);
  } catch (e) {
    console.log(e);
  }
}

async function fetchChannelThreads(channelId, dateAfter, dateBefore) {
  const channelThreadsFile = `${getOutputDir(
    dateAfter,
    dateBefore
  )}/channel_${channelId}_threads.json`;

  let threads;

  const stat = fs.statSync(channelThreadsFile, { throwIfNoEntry: false });
  if (!stat) {
    console.log("fetch channel threads...", channelId);
    threads = await requestChannelThreads(channelId);
    fs.writeFileSync(channelThreadsFile, JSON.stringify(threads, null, 4));
  } else {
    const threadsRaw = fs.readFileSync(channelThreadsFile, "utf8");
    threads = JSON.parse(threadsRaw);
  }

  if (threads) {
    console.log(`fetched channel threads (${channelId}):`, threads.length);

    for (const thread of threads) {
      await fetchChannel(thread.id, dateAfter, dateBefore);
    }
  }
}

async function requestChannelThreads(
  channelId,
  offset = 0,
  limit = 25,
  retryAfter = 2000
) {
  await new Promise(function (resolve) {
    setTimeout(resolve, retryAfter);
  });

  var url = new URL(
    `https://discord.com/api/v9/channels/${channelId}/threads/search`
  );

  var params = {
    archived: false,
    sort_by: "last_message_time",
    sort_order: "desc",
    limit: limit,
    offset: offset,
  };

  url.search = new URLSearchParams(params).toString();

  const response = await fetch(url, {
    headers: {
      authorization: TOKEN,
    },
  });
  const content = await response.text();
  const json = JSON.parse(content);

  if (!json.threads && json.retry_after) {
    console.log(JSON.stringify(json, null, 4));
    console.log(`retrying in ${json.retry_after + 1}...`);
    return await requestChannelThreads(
      channelId,
      offset,
      limit,
      (json.retry_after + 1) * 1000
    );
  }

  let threads = json.threads;

  if (json.has_more) {
    moreThreads = await requestChannelThreads(channelId, offset + limit);
    if (moreThreads && moreThreads.length > 0) {
      threads = threads.concat(moreThreads);
    }
  }

  return threads;
}

function readChannel(channelId, dateAfter, dateBefore) {
  const channelFile = `${getOutputDir(
    dateAfter,
    dateBefore
  )}/channel_${channelId}.json`;

  const channelRaw = fs.readFileSync(channelFile, "utf8");
  return JSON.parse(channelRaw);
}

function readChannelThreads(channelId, dateAfter, dateBefore) {
  const channelThreadsFile = `${getOutputDir(
    dateAfter,
    dateBefore
  )}/channel_${channelId}_threads.json`;

  const stat = fs.statSync(channelThreadsFile, { throwIfNoEntry: false });
  if (stat) {
    const threadsRaw = fs.readFileSync(channelThreadsFile, "utf8");
    return JSON.parse(threadsRaw);
  }

  return [];
}

function convertChannel(channelId, dateAfter, dateBefore) {
  try {
    let { channel, messages } = readChannel(channelId, dateAfter, dateBefore);
    const threads = readChannelThreads(channelId, dateAfter, dateBefore);

    const channelExport = {
      id: channel.id,
      name: channel.name
        .replaceAll("_", "-")
        .replaceAll(" ", "-")
        .toLowerCase(),
      is_archived: false,
      is_general: channel.name === "general",
      ...(channel.topic
        ? {
            topic: {
              value: channel.topic,
              creator: "",
              last_set: 0,
            },
          }
        : {}),
    };

    const users = {};
    const days = {};

    const messagesMap = {};
    const threadIds = threads.map((thread) => thread.id);
    const pins = [];

    messages.forEach(function (discordMessage) {
      const { id, type } = discordMessage;
      if (threadIds.includes(id) || type === "ChannelPinnedMessage") {
        pins.push(discordMessage);
      }
    });

    let i = 0;
    while (i < messages.length) {
      discordMessage = messages[i];

      const { id, author } = discordMessage;
      if (author && !users[author.id]) {
        users[author.id] = author;
      }

      messagesMap[id] = discordMessage;

      const message = convertMessage(discordMessage, messagesMap, threadIds);
      if (message) {
        const ts = moment.utc(moment.unix(message.ts));
        const day = ts.format("YYYY-MM-DD");

        if (!days[day]) {
          days[day] = [];
        }

        days[day].push(message);
      }

      if (threadIds.includes(id)) {
        const { messages: threadMessages } = readChannel(
          id,
          dateAfter,
          dateBefore
        );
        messages = mergeMessages(messages, threadMessages, i);
      }

      i++;
    }

    channelExport.pins = pins.map(function (discordMessage) {
      const { id, type, reference } = discordMessage;
      let pinMessage = discordMessage;

      if (type === "ChannelPinnedMessage" && reference?.messageId) {
        pinMessage = messagesMap[reference.messageId];
      } else if (threadIds.includes(id)) {
        pinMessage = messagesMap[id];
      }

      const createdTs = Math.ceil(
        new Date(discordMessage.timestamp).getTime() / 1000
      );
      const pinTs = new Date(pinMessage.timestamp).getTime() / 1000;
      const user = getUser(discordMessage.author);
      const isBot = pinMessage?.author?.isBot;

      return {
        id: pinTs.toString(),
        type: "C",
        created: createdTs,
        user: user,
        owner: isBot ? "USLACKBOT" : user,
      };
    });

    channelExport.members = Object.entries(users)
      .filter(([_, user]) => !user.isBot)
      .map(([_, user]) => getUser(user));

    fs.rmSync(`./output/${channelExport.name}`, {
      force: true,
      recursive: true,
    });

    fs.mkdirSync(`./output/${channelExport.name}`, { recursive: true });

    Object.entries(days).map(function ([key, data]) {
      fs.writeFileSync(
        `./output/${channelExport.name}/${key}.json`,
        JSON.stringify(data, null, 4)
      );
    });

    return { channel: channelExport, users: users };
  } catch (e) {
    console.log(e);
  }
}

function mergeMessages(msgs1, msgs2, startIndex = 0) {
  const res = msgs1.slice(0, startIndex);
  let i = startIndex;
  let j = 0;
  const startDate = new Date(msgs1[startIndex].timestamp);
  const threadTs = moment(startDate).valueOf() / 1000;
  while (i < msgs1.length && j < msgs2.length) {
    msgs2[j].thread_ts = threadTs;
    const msgDate1 = new Date(msgs1[i].timestamp);
    const msgDate2 = new Date(msgs2[j].timestamp);
    if (msgDate2 < startDate) {
      j++;
    } else if (msgDate1 < msgDate2) {
      res.push(msgs1[i]);
      i++;
    } else {
      res.push(msgs2[j]);
      j++;
    }
  }
  while (i < msgs1.length) {
    res.push(msgs1[i]);
    i++;
  }
  while (j < msgs2.length) {
    msgs2[j].thread_ts = threadTs;
    res.push(msgs2[j]);
    j++;
  }
  return res;
}

exports.exportChannel = exportChannel;
exports.convertChannel = convertChannel;
