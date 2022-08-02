const { default: ShortUniqueId } = require("short-unique-id");
const { markdown2mrkdwn, removeMarkdown } = require("./markdown");

const uid = new ShortUniqueId({ length: 6 });

function makeAuthorSection(embed) {
  const author = embed.author;
  if (author?.name) {
    const elements = [];

    if (author.iconUrl) {
      elements.push({
        type: "image",
        image_url: author.iconUrl,
        alt_text: author.name,
      });
    }

    const authorName = author.url
      ? `<${author.url}|${author.name}>`
      : author.name;

    elements.push({
      type: "mrkdwn",
      text: `*${authorName}*`,
      verbatim: false,
    });

    return [
      {
        block_id: uid(),
        type: "context",
        elements: elements,
      },
    ];
  }

  return [];
}

function makeMainSection(embed) {
  const section = {
    block_id: uid(),
    type: "section",
  };

  const parts = [];

  if (embed.title) {
    const title = embed.url
      ? `<${embed.url}|${markdown2mrkdwn(embed.title)}>`
      : markdown2mrkdwn(embed.title);
    parts.push(`*${title}*`);
  }

  if (embed.description) {
    parts.push(markdown2mrkdwn(embed.description));
  }

  if (parts.length > 0) {
    section.text = {
      type: "mrkdwn",
      text: parts.join("\n"),
      verbatim: false,
    };
  }

  if (embed.thumbnail?.url) {
    section.accessory = {
      type: "image",
      image_url: embed.thumbnail?.url,
      alt_text: embed.title ? embed.title : "alt",
    };
  }

  if (section.text || section.accessory) {
    return [section];
  }

  return [];
}

function makeFooterSection(embed) {
  if (embed.timestamp || embed.footer?.text) {
    const elements = [];

    if (embed.footer?.iconUrl) {
      elements.push({
        type: "image",
        image_url: embed.footer.iconUrl,
        alt_text: embed.footer?.text ? embed.footer?.text : "alt",
      });
    }

    const textParts = [];
    if (embed.footer?.text) {
      textParts.push(embed.footer?.text);
    }

    if (embed.timestamp) {
      const date = new Date(embed.timestamp);
      textParts.push(
        `<!date^${Math.round(
          date.getTime() / 1000
        )}^{date}|${date.toLocaleDateString()}>`
      );
    }

    elements.push({
      type: "mrkdwn",
      text: textParts.join(" • "),
      verbatim: false,
    });

    return [
      {
        block_id: uid(),
        type: "context",
        elements: elements,
      },
    ];
  }

  return [];
}

function makeFieldsSections(embed) {
  const sections = [];

  embed.fields.forEach(function (field) {
    const lastSection = sections[sections.length - 1];
    if (!lastSection) {
      sections.push({
        inline: field.isInline,
        fields: [field],
      });
    } else if (lastSection.inline && field.isInline) {
      lastSection.fields.push(field);
    } else {
      sections.push({
        inline: field.isInline,
        fields: [field],
      });
    }
  });

  return sections.map(function (section) {
    function convertField(field) {
      const parts = [];

      if (field.name) {
        parts.push(`*${removeMarkdown(field.name)}*`);
      }

      if (field.value) {
        parts.push(markdown2mrkdwn(field.value));
      }

      return {
        type: "mrkdwn",
        text: parts.join("\n"),
        verbatim: false,
      };
    }

    if (section.inline && section.fields.length > 1) {
      return {
        block_id: uid(),
        type: "section",
        fields: section.fields.map(convertField),
      };
    } else {
      return {
        block_id: uid(),
        type: "section",
        text: convertField(section.fields[0]),
      };
    }
  });
}

function makeImageSection(embed) {
  if (embed.image?.url) {
    return [
      {
        block_id: uid(),
        type: "image",
        image_url: embed.image.url,
        alt_text: "alt",
      },
    ];
  }

  return [];
}

exports.makeAuthorSection = makeAuthorSection;
exports.makeMainSection = makeMainSection;
exports.makeFooterSection = makeFooterSection;
exports.makeFieldsSections = makeFieldsSections;
exports.makeImageSection = makeImageSection;
