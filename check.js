const fs = require("node:fs");
const path = require("node:path");

const input = "./input/after-before";

function check() {
  const list = fs.readdirSync(input);
  const threads = list.filter((file) => file.indexOf("thread") !== -1);

  threads.forEach((channelThreads) => {
    const filePath = path.join(input, channelThreads);
    const file = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(file);

    console.log(filePath, json.length);

    json.forEach((thread) => {
      const threadChannelPath = path.join(input, `channel_${thread.id}.json`);
      const threadChannelStat = fs.statSync(threadChannelPath, {
        throwIfNoEntry: false,
      });

      if (!threadChannelStat) {
        console.log(threadChannelPath);
      }
    });
  });
}

check();
