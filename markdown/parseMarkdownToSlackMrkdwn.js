const replaceRegex = function (regex, replacement) {
  return function (str) {
    return str.replace(regex, replacement);
  };
};
const boldReplacer = function (fullMatch, start, content) {
  return `*${content}*`;
};
const strikeThroughReplacer = function (fullMatch, start, content) {
  return `~${content}~`;
};
const linkReplacer = function (fullMatch, start, content) {
  return `<${content}|${start}>`;
};

const boldRegex = /(\*{1,2})(.*?)\1/g;
const strikeThroughRegex = /(~{1,2})(.*?)\1/g;
const linkRegex = /\[([^[]+)\]\(([^)]+)\)/g;

const replaceBold = replaceRegex(boldRegex, boldReplacer);
const replaceStrikeThrough = replaceRegex(
  strikeThroughRegex,
  strikeThroughReplacer
);
const replaceLink = replaceRegex(linkRegex, linkReplacer);

/**
 * Parser from Markdown -> Mrkdwn
 */
exports.parseMarkdownToSlackMrkdwn = function (str) {
  str = replaceBold(str);
  str = replaceStrikeThrough(str);
  str = replaceLink(str);
  // str = emoji.unemojify(str);
  str = str.replace(/\n\n/g, "\n");

  return str;
};
