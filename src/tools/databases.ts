/**
 * Database Tools
 * get_database, query_database, create_database
 */

import { NotionClient, extractNotionId } from '../utils/notion-client.js';
import { NotionDatabase, NotionPage, PaginatedResponse, getPageTitle, getDatabaseTitle, NotionFilter, NotionSort } from '../utils/types.js';

// Get Database
export interface GetDatabaseParams {
  database_id: string;
}

export interface GetDatabaseResult {
  success: boolean;
  database?: {
    id: string;
    title: string;
    description: string;
    url: string;
    created_time: string;
    last_edited_time: string;
    properties: Record<string, {
      id: string;
      name: string;
      type: string;
    }>;
    is_inline: boolean;
    archived: boolean;
  };
  error?: string;
}

export async function getDatabase(client: NotionClient, params: GetDatabaseParams): Promise<GetDatabaseResult> {
  const databaseId = extractNotionId(params.database_id);
  const response = await client.get<NotionDatabase>(`/databases/${databaseId}`);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to get database'
    };
  }

  const db = response.data;

  // Simplify properties schema
  const properties: Record<string, { id: string; name: string; type: string }> = {};
  for (const [name, prop] of Object.entries(db.properties)) {
    properties[name] = {
      id: prop.id,
      name: prop.name,
      type: prop.type
    };
  }

  return {
    success: true,
    database: {
      id: db.id,
      title: getDatabaseTitle(db),
      description: db.description.map(d => d.plain_text || d.text?.content || '').join(''),
      url: db.url,
      created_time: db.created_time,
      last_edited_time: db.last_edited_time,
      properties,
      is_inline: db.is_inline,
      archived: db.archived
    }
  };
}

// Query Database
export interface QueryDatabaseParams {
  database_id: string;
  filter?: NotionFilter;
  sorts?: NotionSort[];
  page_size?: number;
}

export interface QueryDatabaseResult {
  success: boolean;
  pages?: {
    id: string;
    title: string;
    url: string;
    created_time: string;
    last_edited_time: string;
    properties: Record<string, unknown>;
  }[];
  total_count?: number;
  has_more?: boolean;
  next_cursor?: string | null;
  error?: string;
}

export async function queryDatabase(client: NotionClient, params: QueryDatabaseParams): Promise<QueryDatabaseResult> {
  const { database_id, filter, sorts, page_size = 100 } = params;
  const databaseId = extractNotionId(database_id);

  const requestBody: Record<string, unknown> = {
    page_size: Math.min(Math.max(page_size, 1), 100)
  };

  if (filter) {
    requestBody.filter = filter;
  }

  if (sorts && sorts.length > 0) {
    requestBody.sorts = sorts;
  }

  const response = await client.post<PaginatedResponse<NotionPage>>(
    `/databases/${databaseId}/query`,
    requestBody
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to query database'
    };
  }

  const pages = response.data.results.map(page => ({
    id: page.id,
    title: getPageTitle(page),
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    properties: page.properties
  }));

  return {
    success: true,
    pages,
    total_count: pages.length,
    has_more: response.data.has_more,
    next_cursor: response.data.next_cursor
  };
}

// Create Database
export interface CreateDatabaseParams {
  parent_page_id: string;
  title: string;
  properties: Record<string, DatabasePropertySchema>;
}

export interface DatabasePropertySchema {
  type: string;
  [key: string]: unknown;
}

export interface CreateDatabaseResult {
  success: boolean;
  database?: {
    id: string;
    title: string;
    url: string;
  };
  error?: string;
}

export async function createDatabase(client: NotionClient, params: CreateDatabaseParams): Promise<CreateDatabaseResult> {
  const { parent_page_id, title, properties } = params;
  const pageId = extractNotionId(parent_page_id);

  // Ensure there's at least a title property
  const dbProperties: Record<string, unknown> = { ...properties };

  // Every database needs a title property
  let hasTitleProperty = false;
  for (const prop of Object.values(dbProperties)) {
    if ((prop as Record<string, unknown>).type === 'title') {
      hasTitleProperty = true;
      break;
    }
  }

  if (!hasTitleProperty) {
    dbProperties['Name'] = { title: {} };
  }

  const requestBody = {
    parent: {
      type: 'page_id',
      page_id: pageId
    },
    title: [
      {
        type: 'text',
        text: { content: title }
      }
    ],
    properties: dbProperties
  };

  const response = await client.post<NotionDatabase>('/databases', requestBody);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to create database'
    };
  }

  return {
    success: true,
    database: {
      id: response.data.id,
      title: getDatabaseTitle(response.data),
      url: response.data.url
    }
  };
}
