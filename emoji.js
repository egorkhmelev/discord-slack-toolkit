const fs = require("node:fs");
const path = require("node:path");

const emojiDir = "./emoji";

// Put emoji.json file in this dir, this response from Discord's API request to get list of custom emoji

async function run() {
  const folder = path.join(emojiDir, "images");
  const file = fs.readFileSync(path.join(emojiDir, "emoji.json"), "utf-8");
  const json = JSON.parse(file);

  fs.rmSync(folder, { force: true, recursive: true });
  fs.mkdirSync(folder, { recursive: true });

  for (const emoji of json) {
    const ext = emoji.animated ? "gif" : "png";
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=1024&quality=lossless`;
    await downloadFile(
      emojiUrl,
      path.join(emojiDir, "images", `${emoji.name}.${ext}`)
    );
  }
}

async function downloadFile(url, path) {
  console.log(url, path);
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(path, Buffer.from(buffer));
}

run();
