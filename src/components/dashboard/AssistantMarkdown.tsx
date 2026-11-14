import { Fragment } from "react";

function renderInlineMarkdown(text: string) {
  const tokenPattern =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<]+)/g;
  const parts = text.split(tokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i);
    if (markdownLink) {
      return (
        <a href={markdownLink[2]} key={index} rel="noreferrer" target="_blank">
          {markdownLink[1]}
        </a>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      return (
        <a href={part} key={index} rel="noreferrer" target="_blank">
          {part}
        </a>
      );
    }
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function AssistantMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: Array<{ kind: "paragraph" | "ul" | "ol" | "heading"; lines: string[] }> = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", lines: paragraph });
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const unorderedItem = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);

    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", lines: [heading[1]] });
    } else if (unorderedItem || orderedItem) {
      flushParagraph();
      const kind = unorderedItem ? "ul" : "ol";
      const item = (unorderedItem ?? orderedItem)?.[1] ?? line;
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.kind === kind) lastBlock.lines.push(item);
      else blocks.push({ kind, lines: [item] });
    } else {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.kind === "ul" || lastBlock?.kind === "ol") flushParagraph();
      paragraph.push(line);
    }
  }
  flushParagraph();

  return (
    <div className="si-markdown">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return <h3 key={index}>{renderInlineMarkdown(block.lines[0])}</h3>;
        }
        if (block.kind === "ul" || block.kind === "ol") {
          const List = block.kind;
          return (
            <List key={index}>
              {block.lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(line)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInlineMarkdown(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
