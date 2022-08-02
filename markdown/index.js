const { parseEmoji } = require("./emoji");
const { parseMarkdownToSlackMrkdwn } = require("./parseMarkdownToSlackMrkdwn");
const { removeMarkdown } = require("./removeMarkdown");

function markdown2mrkdwn(markdown) {
  if (typeof markdown === "string") {
    return parseEmoji(parseMarkdownToSlackMrkdwn(markdown));
  }

  return markdown;
}

function removeMarkdownFn(markdown) {
  if (typeof markdown === "string") {
    return parseEmoji(removeMarkdown(markdown, { replaceLinksWithURL: true }));
  }

  return markdown;
}

exports.markdown2mrkdwn = markdown2mrkdwn;
exports.removeMarkdown = removeMarkdownFn;

// const markdown =
//   "**134 steps** by Maier (maierru), **296 steps** by Ramil (ramilminibaev), **409 steps** by Potateш (potatesh), **959 steps** by Claud (claudmcdougall)\n:wavy_dash:";

// console.log(markdown);
// console.log("--");
// console.log(markdown2mrkdwn(markdown));
// console.log(parseMarkdownToSlackMrkdwn(markdown));
