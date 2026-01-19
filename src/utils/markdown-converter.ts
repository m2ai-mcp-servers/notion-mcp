/**
 * Markdown to Notion Block Converter
 * Converts markdown text to Notion block format
 */

export interface NotionRichText {
  type: 'text';
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: unknown;
}

// Parse inline formatting (bold, italic, code, links, strikethrough)
export function parseInlineFormatting(text: string): NotionRichText[] {
  const result: NotionRichText[] = [];
  let remaining = text;

  // Regex patterns for inline formatting
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, annotation: 'bold' },
    { regex: /\*(.+?)\*/g, annotation: 'italic' },
    { regex: /~~(.+?)~~/g, annotation: 'strikethrough' },
    { regex: /`(.+?)`/g, annotation: 'code' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, annotation: 'link' }
  ];

  // Simple approach: find the first match of any pattern
  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; content: string; annotation: string; url?: string } | null = null;

    for (const { regex, annotation } of patterns) {
      regex.lastIndex = 0;
      const match = regex.exec(remaining);
      if (match && (!earliestMatch || match.index < earliestMatch.index)) {
        if (annotation === 'link') {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            content: match[1],
            annotation,
            url: match[2]
          };
        } else {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            content: match[1],
            annotation
          };
        }
      }
    }

    if (earliestMatch) {
      // Add plain text before the match
      if (earliestMatch.index > 0) {
        result.push({
          type: 'text',
          text: { content: remaining.substring(0, earliestMatch.index) }
        });
      }

      // Add formatted text
      const richText: NotionRichText = {
        type: 'text',
        text: {
          content: earliestMatch.content,
          link: earliestMatch.url ? { url: earliestMatch.url } : null
        },
        annotations: {}
      };

      if (earliestMatch.annotation !== 'link') {
        richText.annotations = { [earliestMatch.annotation]: true };
      }

      result.push(richText);

      remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      if (remaining.length > 0) {
        result.push({
          type: 'text',
          text: { content: remaining }
        });
      }
      break;
    }
  }

  return result.length > 0 ? result : [{ type: 'text', text: { content: text } }];
}

// Convert a single line to a Notion block
function lineToBlock(line: string): NotionBlock | null {
  const trimmed = line.trim();

  if (trimmed === '') {
    return null;
  }

  // Heading 1
  if (trimmed.startsWith('# ')) {
    return {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: parseInlineFormatting(trimmed.substring(2))
      }
    };
  }

  // Heading 2
  if (trimmed.startsWith('## ')) {
    return {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: parseInlineFormatting(trimmed.substring(3))
      }
    };
  }

  // Heading 3
  if (trimmed.startsWith('### ')) {
    return {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: parseInlineFormatting(trimmed.substring(4))
      }
    };
  }

  // Checkbox / To-do
  if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
    const checked = trimmed.startsWith('- [x] ');
    const content = trimmed.substring(6);
    return {
      object: 'block',
      type: 'to_do',
      to_do: {
        rich_text: parseInlineFormatting(content),
        checked
      }
    };
  }

  // Bullet list
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: parseInlineFormatting(trimmed.substring(2))
      }
    };
  }

  // Numbered list
  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
  if (numberedMatch) {
    return {
      object: 'block',
      type: 'numbered_list_item',
      numbered_list_item: {
        rich_text: parseInlineFormatting(numberedMatch[2])
      }
    };
  }

  // Blockquote
  if (trimmed.startsWith('> ')) {
    return {
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: parseInlineFormatting(trimmed.substring(2))
      }
    };
  }

  // Horizontal rule
  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return {
      object: 'block',
      type: 'divider',
      divider: {}
    };
  }

  // Default: paragraph
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: parseInlineFormatting(trimmed)
    }
  };
}

// Handle code blocks
function parseCodeBlocks(markdown: string): { content: string; isCode: boolean; language?: string }[] {
  const parts: { content: string; isCode: boolean; language?: string }[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';
  let textContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        parts.push({
          content: codeContent.join('\n'),
          isCode: true,
          language: codeLanguage || 'plain text'
        });
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Start of code block
        if (textContent.length > 0) {
          parts.push({
            content: textContent.join('\n'),
            isCode: false
          });
          textContent = [];
        }
        codeLanguage = line.substring(3).trim();
        inCodeBlock = true;
      }
    } else if (inCodeBlock) {
      codeContent.push(line);
    } else {
      textContent.push(line);
    }
  }

  // Handle remaining content
  if (textContent.length > 0) {
    parts.push({
      content: textContent.join('\n'),
      isCode: false
    });
  }
  if (codeContent.length > 0) {
    parts.push({
      content: codeContent.join('\n'),
      isCode: true,
      language: codeLanguage || 'plain text'
    });
  }

  return parts;
}

// Main conversion function
export function markdownToBlocks(markdown: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const parts = parseCodeBlocks(markdown);

  for (const part of parts) {
    if (part.isCode) {
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: part.content } }],
          language: part.language || 'plain text'
        }
      });
    } else {
      const lines = part.content.split('\n');
      for (const line of lines) {
        const block = lineToBlock(line);
        if (block) {
          blocks.push(block);
        }
      }
    }
  }

  return blocks;
}

// Convert Notion blocks to markdown
export function blocksToMarkdown(blocks: unknown[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const type = b.type as string;

    switch (type) {
      case 'paragraph':
        lines.push(richTextToMarkdown((b.paragraph as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'heading_1':
        lines.push('# ' + richTextToMarkdown((b.heading_1 as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'heading_2':
        lines.push('## ' + richTextToMarkdown((b.heading_2 as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'heading_3':
        lines.push('### ' + richTextToMarkdown((b.heading_3 as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'bulleted_list_item':
        lines.push('- ' + richTextToMarkdown((b.bulleted_list_item as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'numbered_list_item':
        lines.push('1. ' + richTextToMarkdown((b.numbered_list_item as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'to_do': {
        const todo = b.to_do as Record<string, unknown>;
        const checked = todo.checked ? 'x' : ' ';
        lines.push(`- [${checked}] ` + richTextToMarkdown(todo.rich_text as NotionRichText[]));
        break;
      }
      case 'quote':
        lines.push('> ' + richTextToMarkdown((b.quote as Record<string, unknown>).rich_text as NotionRichText[]));
        break;
      case 'code': {
        const code = b.code as Record<string, unknown>;
        const lang = code.language || '';
        lines.push('```' + lang);
        lines.push(richTextToMarkdown(code.rich_text as NotionRichText[]));
        lines.push('```');
        break;
      }
      case 'divider':
        lines.push('---');
        break;
      default:
        // For unsupported blocks, try to extract any rich_text
        if (b[type] && (b[type] as Record<string, unknown>).rich_text) {
          lines.push(richTextToMarkdown((b[type] as Record<string, unknown>).rich_text as NotionRichText[]));
        }
    }
  }

  return lines.join('\n\n');
}

// Convert rich text array to markdown string
function richTextToMarkdown(richText: NotionRichText[]): string {
  if (!richText || !Array.isArray(richText)) return '';

  return richText.map(rt => {
    let text = rt.text?.content || '';
    const annotations = rt.annotations;

    if (annotations?.code) {
      text = `\`${text}\``;
    }
    if (annotations?.bold) {
      text = `**${text}**`;
    }
    if (annotations?.italic) {
      text = `*${text}*`;
    }
    if (annotations?.strikethrough) {
      text = `~~${text}~~`;
    }
    if (rt.text?.link?.url) {
      text = `[${text}](${rt.text.link.url})`;
    }

    return text;
  }).join('');
}

// Convert blocks to plain text
export function blocksToPlainText(blocks: unknown[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const type = b.type as string;
    const blockContent = b[type] as Record<string, unknown>;

    if (blockContent?.rich_text) {
      const richText = blockContent.rich_text as NotionRichText[];
      const text = richText.map(rt => rt.text?.content || '').join('');
      if (text) lines.push(text);
    }
  }

  return lines.join('\n');
}
