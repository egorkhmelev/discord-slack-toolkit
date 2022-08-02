// This scripts helps to export data from Discord

const fs = require("fs");
const { exportChannel } = require("./channel");

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

const dateAfter = undefined; //"2022-01-01 00:00";
const dateBefore = undefined; //"2022-07-28 00:00";

// Instead, list of specific channel ids can be used here
const channelIds = channels.map((channel) => channel.id);

exportChannels(channelIds, dateAfter, dateBefore);

async function exportChannels(channels, dateAfter, dateBefore) {
  for (const channel of channels) {
    await exportChannel(channel, dateAfter, dateBefore);
  }
}
