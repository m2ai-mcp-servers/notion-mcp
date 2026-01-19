/**
 * Tests for Markdown Converter
 */

import {
  parseInlineFormatting,
  markdownToBlocks,
  blocksToMarkdown,
  blocksToPlainText
} from '../src/utils/markdown-converter';

describe('parseInlineFormatting', () => {
  it('should handle plain text', () => {
    const result = parseInlineFormatting('Hello world');
    expect(result).toHaveLength(1);
    expect(result[0].text.content).toBe('Hello world');
  });

  it('should handle bold text', () => {
    const result = parseInlineFormatting('This is **bold** text');
    expect(result).toHaveLength(3);
    expect(result[0].text.content).toBe('This is ');
    expect(result[1].text.content).toBe('bold');
    expect(result[1].annotations?.bold).toBe(true);
    expect(result[2].text.content).toBe(' text');
  });

  it('should handle italic text', () => {
    const result = parseInlineFormatting('This is *italic* text');
    expect(result).toHaveLength(3);
    expect(result[1].text.content).toBe('italic');
    expect(result[1].annotations?.italic).toBe(true);
  });

  it('should handle inline code', () => {
    const result = parseInlineFormatting('Use `code` here');
    expect(result).toHaveLength(3);
    expect(result[1].text.content).toBe('code');
    expect(result[1].annotations?.code).toBe(true);
  });

  it('should handle strikethrough', () => {
    const result = parseInlineFormatting('This is ~~deleted~~ text');
    expect(result).toHaveLength(3);
    expect(result[1].text.content).toBe('deleted');
    expect(result[1].annotations?.strikethrough).toBe(true);
  });

  it('should handle links', () => {
    const result = parseInlineFormatting('Click [here](https://example.com) now');
    expect(result).toHaveLength(3);
    expect(result[1].text.content).toBe('here');
    expect(result[1].text.link?.url).toBe('https://example.com');
  });

  it('should handle multiple formatting in sequence', () => {
    const result = parseInlineFormatting('**bold** and *italic*');
    expect(result.length).toBeGreaterThan(2);
  });
});

describe('markdownToBlocks', () => {
  it('should convert heading 1', () => {
    const blocks = markdownToBlocks('# Heading 1');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_1');
  });

  it('should convert heading 2', () => {
    const blocks = markdownToBlocks('## Heading 2');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_2');
  });

  it('should convert heading 3', () => {
    const blocks = markdownToBlocks('### Heading 3');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading_3');
  });

  it('should convert bullet list', () => {
    const blocks = markdownToBlocks('- Item 1\n- Item 2');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('bulleted_list_item');
    expect(blocks[1].type).toBe('bulleted_list_item');
  });

  it('should convert numbered list', () => {
    const blocks = markdownToBlocks('1. First\n2. Second');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('numbered_list_item');
    expect(blocks[1].type).toBe('numbered_list_item');
  });

  it('should convert checkbox unchecked', () => {
    const blocks = markdownToBlocks('- [ ] Todo item');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('to_do');
    expect((blocks[0].to_do as { checked: boolean }).checked).toBe(false);
  });

  it('should convert checkbox checked', () => {
    const blocks = markdownToBlocks('- [x] Done item');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('to_do');
    expect((blocks[0].to_do as { checked: boolean }).checked).toBe(true);
  });

  it('should convert blockquote', () => {
    const blocks = markdownToBlocks('> This is a quote');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('quote');
  });

  it('should convert divider', () => {
    const blocks = markdownToBlocks('---');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('divider');
  });

  it('should convert paragraph', () => {
    const blocks = markdownToBlocks('This is a paragraph');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('paragraph');
  });

  it('should convert code block', () => {
    const blocks = markdownToBlocks('```javascript\nconst x = 1;\n```');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('code');
    expect((blocks[0].code as { language: string }).language).toBe('javascript');
  });

  it('should handle multiple elements', () => {
    const markdown = `# Title

This is a paragraph.

- List item 1
- List item 2

> A quote`;

    const blocks = markdownToBlocks(markdown);
    expect(blocks.length).toBeGreaterThan(4);
    expect(blocks[0].type).toBe('heading_1');
  });

  it('should handle empty input', () => {
    const blocks = markdownToBlocks('');
    expect(blocks).toHaveLength(0);
  });
});

describe('blocksToMarkdown', () => {
  it('should convert paragraph block to markdown', () => {
    const blocks = [{
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: 'Hello' } }]
      }
    }];
    const result = blocksToMarkdown(blocks);
    expect(result).toBe('Hello');
  });

  it('should convert heading blocks to markdown', () => {
    const blocks = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: 'Title' } }]
        }
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Subtitle' } }]
        }
      }
    ];
    const result = blocksToMarkdown(blocks);
    expect(result).toContain('# Title');
    expect(result).toContain('## Subtitle');
  });

  it('should convert list items to markdown', () => {
    const blocks = [
      {
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: 'Item' } }]
        }
      }
    ];
    const result = blocksToMarkdown(blocks);
    expect(result).toContain('- Item');
  });

  it('should convert todo items to markdown', () => {
    const blocks = [
      {
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: 'Task' } }],
          checked: true
        }
      }
    ];
    const result = blocksToMarkdown(blocks);
    expect(result).toContain('- [x] Task');
  });

  it('should handle formatted text', () => {
    const blocks = [{
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'bold' }, annotations: { bold: true } }
        ]
      }
    }];
    const result = blocksToMarkdown(blocks);
    expect(result).toBe('**bold**');
  });
});

describe('blocksToPlainText', () => {
  it('should extract plain text from blocks', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'Hello' } }]
        }
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: 'World' } }]
        }
      }
    ];
    const result = blocksToPlainText(blocks);
    expect(result).toBe('Hello\nWorld');
  });

  it('should handle empty blocks', () => {
    const result = blocksToPlainText([]);
    expect(result).toBe('');
  });
});
