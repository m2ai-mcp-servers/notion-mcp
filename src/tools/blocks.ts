/**
 * Block Tools
 * append_blocks, update_block, delete_block
 */

import { NotionClient, extractNotionId } from '../utils/notion-client.js';
import { NotionBlock, PaginatedResponse } from '../utils/types.js';
import { markdownToBlocks, NotionBlock as ConverterBlock } from '../utils/markdown-converter.js';

// Append Blocks
export interface AppendBlocksParams {
  parent_id: string;
  content: string;
}

export interface AppendBlocksResult {
  success: boolean;
  blocks?: {
    id: string;
    type: string;
  }[];
  block_count?: number;
  error?: string;
}

export async function appendBlocks(client: NotionClient, params: AppendBlocksParams): Promise<AppendBlocksResult> {
  const { parent_id, content } = params;
  const parentId = extractNotionId(parent_id);

  // Convert markdown content to Notion blocks
  const blocks = markdownToBlocks(content);

  if (blocks.length === 0) {
    return {
      success: false,
      error: 'No valid content to append'
    };
  }

  const response = await client.patch<PaginatedResponse<NotionBlock>>(
    `/blocks/${parentId}/children`,
    { children: blocks }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to append blocks'
    };
  }

  return {
    success: true,
    blocks: response.data.results.map(block => ({
      id: block.id,
      type: block.type
    })),
    block_count: response.data.results.length
  };
}

// Update Block
export interface UpdateBlockParams {
  block_id: string;
  content: string;
}

export interface UpdateBlockResult {
  success: boolean;
  block?: {
    id: string;
    type: string;
    last_edited_time: string;
  };
  error?: string;
}

export async function updateBlock(client: NotionClient, params: UpdateBlockParams): Promise<UpdateBlockResult> {
  const { block_id, content } = params;
  const blockId = extractNotionId(block_id);

  // First, get the current block to determine its type
  const getResponse = await client.get<NotionBlock>(`/blocks/${blockId}`);

  if (!getResponse.success || !getResponse.data) {
    return {
      success: false,
      error: getResponse.error || 'Failed to get block for update'
    };
  }

  const currentBlock = getResponse.data;
  const blockType = currentBlock.type;

  // Convert the new content to a block and extract the content part
  const newBlocks = markdownToBlocks(content);

  if (newBlocks.length === 0) {
    return {
      success: false,
      error: 'Invalid content provided'
    };
  }

  // Use the first block's content for the update
  const newBlock = newBlocks[0] as ConverterBlock;

  // Build update body based on block type
  const updateBody: Record<string, unknown> = {};

  // Handle common block types
  if (blockType === 'paragraph' && newBlock.type === 'paragraph') {
    updateBody.paragraph = (newBlock as Record<string, unknown>).paragraph;
  } else if (blockType === 'heading_1' && newBlock.type === 'heading_1') {
    updateBody.heading_1 = (newBlock as Record<string, unknown>).heading_1;
  } else if (blockType === 'heading_2' && newBlock.type === 'heading_2') {
    updateBody.heading_2 = (newBlock as Record<string, unknown>).heading_2;
  } else if (blockType === 'heading_3' && newBlock.type === 'heading_3') {
    updateBody.heading_3 = (newBlock as Record<string, unknown>).heading_3;
  } else if (blockType === 'bulleted_list_item' && newBlock.type === 'bulleted_list_item') {
    updateBody.bulleted_list_item = (newBlock as Record<string, unknown>).bulleted_list_item;
  } else if (blockType === 'numbered_list_item' && newBlock.type === 'numbered_list_item') {
    updateBody.numbered_list_item = (newBlock as Record<string, unknown>).numbered_list_item;
  } else if (blockType === 'to_do' && newBlock.type === 'to_do') {
    updateBody.to_do = (newBlock as Record<string, unknown>).to_do;
  } else if (blockType === 'quote' && newBlock.type === 'quote') {
    updateBody.quote = (newBlock as Record<string, unknown>).quote;
  } else if (blockType === 'code' && newBlock.type === 'code') {
    updateBody.code = (newBlock as Record<string, unknown>).code;
  } else {
    // For type mismatch or unsupported types, update as paragraph with rich text
    updateBody[blockType] = {
      rich_text: [{ type: 'text', text: { content } }]
    };
  }

  const response = await client.patch<NotionBlock>(`/blocks/${blockId}`, updateBody);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to update block'
    };
  }

  return {
    success: true,
    block: {
      id: response.data.id,
      type: response.data.type,
      last_edited_time: response.data.last_edited_time
    }
  };
}

// Delete Block
export interface DeleteBlockParams {
  block_id: string;
}

export interface DeleteBlockResult {
  success: boolean;
  deleted_id?: string;
  error?: string;
}

export async function deleteBlock(client: NotionClient, params: DeleteBlockParams): Promise<DeleteBlockResult> {
  const { block_id } = params;
  const blockId = extractNotionId(block_id);

  const response = await client.delete<NotionBlock>(`/blocks/${blockId}`);

  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to delete block'
    };
  }

  return {
    success: true,
    deleted_id: blockId
  };
}
