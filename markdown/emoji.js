const { getEmoji } = require("./discord_emoji");

function parseEmoji(text) {
  if (typeof text === "string") {
    const emojisRegExp = /:(\w+):/g;
    const emojisList = text.match(emojisRegExp);
    if (emojisList) {
      emojisList.forEach((emojiCode) => {
        const emoji = getEmoji(emojiCode);
        if (emoji) {
          const regEx = new RegExp(emojiCode);
          text = text.replace(regEx, emoji);
        }
      });
    }
    return text;
  }

  return text;
}

exports.parseEmoji = parseEmoji;

// console.log(parseEmoji(":third_place: With *a bit more* steps"));
