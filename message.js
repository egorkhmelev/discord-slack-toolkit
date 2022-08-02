const Autolinker = require("autolinker");
const fs = require("fs");

const {
  makeAuthorSection,
  makeMainSection,
  makeFieldsSections,
  makeImageSection,
  makeFooterSection,
} = require("./attachments");
const { markdown2mrkdwn } = require("./markdown");

const externals = (function () {
  const externalRaw = fs.readFileSync("./input/external.txt", "utf8");
  return externalRaw.split("\n");
})();

function convertMessage(data, messagesMap, threadIds) {
  const { id, type, content, timestamp, reference, thread_ts } = data;
  const { isBot, name, nickname, avatarUrl } = data.author;

  const messageTs = new Date(timestamp).getTime() / 1000;
  const isThread = threadIds.includes(id);

  if (
    type === "ChannelPinnedMessage" ||
    type === "21" ||
    (type === "18" && reference.channelId && reference.channelId !== id)
  ) {
    return;
  }

  const message = {
    type: "message",
    text: markdown2mrkdwn(content),
    ts: messageTs.toString(),
    ...(thread_ts ? { thread_ts: thread_ts.toString() } : {}),
    ...(isThread ? { thread_ts: messageTs.toString() } : {}),
  };

  parseLinks(message, data);
  parseMentions(message, data);
  parseAttachments(message, data);
  parseEmbeds(message, data);

  if (type === "Reply") {
    const parentMessage = messagesMap[reference?.messageId];
    if (parentMessage) {
      quoteParentMessage(message, data, parentMessage);
    }
  }

  if (isBot) {
    message["subtype"] = "bot_message";
    message.username = nickname;
    message.bot_id = getUser(data.author, "B");

    message.icons = {
      image_36: avatarUrl,
      image_48: avatarUrl,
      image_72: avatarUrl,
    };
  } else {
    message.user = getUser(data.author);
    message.team = "TTEAM";
    message.user_profile = {
      image_72: avatarUrl,
      first_name: nickname?.split(" ")[0] ?? name?.split(" ")[0] ?? "",
      real_name: name,
      display_name: nickname,
      team: "TTEAM",
      name: name,
      is_restricted: false,
      is_ultra_restricted: false,
    };
  }

  return message;
}

function parseLinks(message) {
  message.text = Autolinker.link(message.text, {
    email: false,
    phone: false,
    replaceFn: function (match) {
      switch (match.getType()) {
        case "url":
          return `<${match.getUrl()}>`;
        default:
          return false;
      }
    },
  });
}

function parseMentions(slackMessage, discordMessage) {
  let result = slackMessage.text;

  discordMessage.mentions
    .filter(
      (mention) =>
        !externals.includes(`${mention.name}#${mention.discriminator}`)
    )
    .forEach(function (mention) {
      result = result.replaceAll(`@${mention.name}`, `<@${getUser(mention)}>`);
    });

  slackMessage.text = result;
  return result;
}

// Add attachments as links, images will be unwrapped by Slack,
// other files will be just links
function parseAttachments(slackMessage, discordMessage) {
  const result = [];

  if (slackMessage.text) {
    result.push(slackMessage.text);
  }

  const urls = discordMessage.attachments.map(function (attachment) {
    return `<${attachment.url}>`;
  });

  result.push(...urls);

  slackMessage.text = result.join("\n");
}

function parseEmbeds(slackMessage, discordMessage) {
  if (!slackMessage.attachments) {
    slackMessage.attachments = [];
  }

  discordMessage.embeds.map(function (embed, index) {
    // Skip already unwrapped links
    if (slackMessage.text.indexOf(embed.url) !== -1) {
      return;
    }

    const blocks = [];

    blocks.push(...makeAuthorSection(embed));
    blocks.push(...makeMainSection(embed));
    blocks.push(...makeFieldsSections(embed));
    blocks.push(...makeImageSection(embed));
    blocks.push(...makeFooterSection(embed));

    slackMessage.attachments.push({
      color: embed.color ?? undefined,
      id: index + 1,
      blocks: blocks,
      fallback: "[no preview available]",
    });
  });
}

// Work around with quotes as Slack does not support replies, only threads
function quoteParentMessage(slackMessage, _, discordParentMessage) {
  slackMessage.text = `> ${parseMentions(
    { text: markdown2mrkdwn(discordParentMessage.content) },
    discordParentMessage
  )
    .split("\n")
    .join("\n> ")}\n${slackMessage.text}`;

  // Correctly support of multiple quotation levels
  slackMessage.text = slackMessage.text.replaceAll(
    /^([ >]+)/gim,
    function (text) {
      return text.replaceAll(" ", "").replaceAll(">", "&gt;") + " ";
    }
  );

  return;
}

// User ID should only contain numbers and letters, otherwise @mention won't work
function getUser(user, type = "U") {
  return `${type}${user.name.replaceAll(" ", "")}${user.discriminator}`
    .replaceAll(/[^a-zA-Z0-9]/gi, "")
    .toUpperCase();
}

exports.convertMessage = convertMessage;
exports.getUser = getUser;
