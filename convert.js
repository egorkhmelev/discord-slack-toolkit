// This script helps to prepare output dir

const fs = require("fs");
const { convertChannel } = require("./channel");
const { getUser } = require("./message");
const { default: ShortUniqueId } = require("short-unique-id");

const uid = new ShortUniqueId({ length: 12 });
const uidApp = new ShortUniqueId({ length: 9 });

fs.rmSync("./output", {
  force: true,
  recursive: true,
});

const excludedGroups = ["Some Group", "Another Group"];

const channelsRaw = fs.readFileSync("./input/channels.txt", "utf8");
const channels = channelsRaw
  .split(/\r?\n/)
  .map((line) => {
    const data = line.split(" | ");
    const info = data[1]?.split(" / ") ?? [];
    return {
      id: data[0],
      group: info[0],
      name: info[1],
    };
  })
  .filter((channel) => {
    return !excludedGroups.includes(channel.group);
  });

const dateAfter = undefined; // "2022-01-01 00:00";
const dateBefore = undefined; //"2022-07-28 00:00";

const channelIds = channels.map((channel) => channel.id);

convertChannels(channelIds, dateAfter, dateBefore);

function convertChannels(channels, dateAfter, dateBefore) {
  const channelList = [];
  const usersMap = {};

  channels.forEach(function (channelName) {
    try {
      const { channel, users } = convertChannel(
        channelName,
        dateAfter,
        dateBefore
      );

      channelList.push(channel);
      Object.assign(usersMap, users);
    } catch (e) {
      console.log("skipping...", channelName);
    }
  });

  writeChannels(channelList);
  writeUsers(usersMap);
}

function writeChannels(channels) {
  const channelsFile = `./output/channels.json`;

  fs.rmSync(channelsFile, {
    force: true,
    recursive: true,
  });

  fs.writeFileSync(channelsFile, JSON.stringify(channels, null, 4));
}

function writeUsers(rawUsers) {
  const users = Object.entries(rawUsers)
    .filter(([_, user]) => !user.isBot)
    .map(function ([_, user]) {
      return {
        id: getUser(user),
        team_id: "TTEAM",
        name: user.name,
        deleted: false,
        real_name: user.nickname,
        profile: {
          title: "",
          phone: "",
          skype: "",
          real_name: user.name,
          real_name_normalized: user.name,
          display_name: user.nickname,
          display_name_normalized: user.nickname,
          fields: {},
          status_text: "",
          status_emoji: "",
          status_emoji_display_info: [],
          status_expiration: 0,
          avatar_hash: uid(),
          image_original: user.avatarUrl,
          is_custom_image: true,
          first_name:
            user.nickname?.split(" ")[0] ?? user.name?.split(" ")[0] ?? "",
          last_name:
            user.nickname?.split(" ")[1] ?? user.name?.split(" ")[1] ?? "",
          image_24: user.avatarUrl,
          image_32: user.avatarUrl,
          image_48: user.avatarUrl,
          image_72: user.avatarUrl,
          image_192: user.avatarUrl,
          image_512: user.avatarUrl,
          image_1024: user.avatarUrl,
          status_text_canonical: "",
          team: "TTEAM",
          ...(user.isBot
            ? {
                bot_id: getUser(user, "B"),
                always_active: true,
                api_app_id: uidApp(),
              }
            : {}),
        },
        is_bot: user.isBot,
        is_app_user: false,
      };
    });
  const usersFile = `./output/users.json`;

  fs.rmSync(usersFile, {
    force: true,
    recursive: true,
  });

  fs.writeFileSync(usersFile, JSON.stringify(users, null, 4));
}
