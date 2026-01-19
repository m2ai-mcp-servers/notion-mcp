/**
 * Page Tools
 * get_page, create_page, update_page, get_page_content
 */

import { NotionClient, extractNotionId } from '../utils/notion-client.js';
import { NotionPage, NotionBlock, PaginatedResponse, getPageTitle } from '../utils/types.js';
import { markdownToBlocks, blocksToMarkdown, blocksToPlainText } from '../utils/markdown-converter.js';

// Get Page
export interface GetPageParams {
  page_id: string;
}

export interface GetPageResult {
  success: boolean;
  page?: {
    id: string;
    title: string;
    url: string;
    created_time: string;
    last_edited_time: string;
    archived: boolean;
    properties: Record<string, unknown>;
    parent: {
      type: string;
      id?: string;
    };
  };
  error?: string;
}

export async function getPage(client: NotionClient, params: GetPageParams): Promise<GetPageResult> {
  const pageId = extractNotionId(params.page_id);
  const response = await client.get<NotionPage>(`/pages/${pageId}`);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to get page'
    };
  }

  const page = response.data;
  return {
    success: true,
    page: {
      id: page.id,
      title: getPageTitle(page),
      url: page.url,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      archived: page.archived,
      properties: page.properties,
      parent: {
        type: page.parent.type,
        id: page.parent.database_id || page.parent.page_id
      }
    }
  };
}

// Create Page
export interface CreatePageParams {
  parent_id: string;
  parent_type: 'database_id' | 'page_id';
  title: string;
  properties?: Record<string, unknown>;
  content?: string;
}

export interface CreatePageResult {
  success: boolean;
  page?: {
    id: string;
    url: string;
    title: string;
  };
  error?: string;
}

export async function createPage(client: NotionClient, params: CreatePageParams): Promise<CreatePageResult> {
  const { parent_id, parent_type, title, properties = {}, content } = params;
  const parentId = extractNotionId(parent_id);

  // Build parent object
  const parent: Record<string, string> = {};
  parent[parent_type] = parentId;

  // Build properties - always include title
  const pageProperties: Record<string, unknown> = { ...properties };

  // For database parents, title is usually a property called "Name" or "Title"
  // For page parents, we need to set the title via page properties
  if (parent_type === 'database_id') {
    // If no title property is set, try "Name" first, then "Title"
    if (!pageProperties['Name'] && !pageProperties['Title'] && !pageProperties['title']) {
      pageProperties['Name'] = {
        title: [{ type: 'text', text: { content: title } }]
      };
    }
  } else {
    // For page parents, set title property
    pageProperties['title'] = {
      title: [{ type: 'text', text: { content: title } }]
    };
  }

  // Build request body
  const requestBody: Record<string, unknown> = {
    parent,
    properties: pageProperties
  };

  // Add content as children blocks if provided
  if (content) {
    requestBody.children = markdownToBlocks(content);
  }

  const response = await client.post<NotionPage>('/pages', requestBody);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to create page'
    };
  }

  return {
    success: true,
    page: {
      id: response.data.id,
      url: response.data.url,
      title: getPageTitle(response.data)
    }
  };
}

// Update Page
export interface UpdatePageParams {
  page_id: string;
  properties: Record<string, unknown>;
  archived?: boolean;
}

export interface UpdatePageResult {
  success: boolean;
  page?: {
    id: string;
    url: string;
    title: string;
    last_edited_time: string;
  };
  error?: string;
}

export async function updatePage(client: NotionClient, params: UpdatePageParams): Promise<UpdatePageResult> {
  const { page_id, properties, archived } = params;
  const pageId = extractNotionId(page_id);

  const requestBody: Record<string, unknown> = {
    properties
  };

  if (archived !== undefined) {
    requestBody.archived = archived;
  }

  const response = await client.patch<NotionPage>(`/pages/${pageId}`, requestBody);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to update page'
    };
  }

  return {
    success: true,
    page: {
      id: response.data.id,
      url: response.data.url,
      title: getPageTitle(response.data),
      last_edited_time: response.data.last_edited_time
    }
  };
}

// Get Page Content
export interface GetPageContentParams {
  page_id: string;
  format?: 'markdown' | 'blocks' | 'plain_text';
}

export interface GetPageContentResult {
  success: boolean;
  content?: string | unknown[];
  format?: string;
  block_count?: number;
  error?: string;
}

export async function getPageContent(client: NotionClient, params: GetPageContentParams): Promise<GetPageContentResult> {
  const { page_id, format = 'markdown' } = params;
  const pageId = extractNotionId(page_id);

  // Fetch all blocks (with pagination)
  const allBlocks: NotionBlock[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const endpoint = cursor
      ? `/blocks/${pageId}/children?start_cursor=${cursor}&page_size=100`
      : `/blocks/${pageId}/children?page_size=100`;

    const response = await client.get<PaginatedResponse<NotionBlock>>(endpoint);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to get page content'
      };
    }

    allBlocks.push(...response.data.results);
    hasMore = response.data.has_more;
    cursor = response.data.next_cursor || undefined;
  }

  // Convert blocks to requested format
  let content: string | unknown[];

  switch (format) {
    case 'blocks':
      content = allBlocks;
      break;
    case 'plain_text':
      content = blocksToPlainText(allBlocks);
      break;
    case 'markdown':
    default:
      content = blocksToMarkdown(allBlocks);
      break;
  }

  return {
    success: true,
    content,
    format,
    block_count: allBlocks.length
  };
}
