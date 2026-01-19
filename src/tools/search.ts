/**
 * Search Tool
 * Search across all pages and databases in the workspace
 */

import { NotionClient } from '../utils/notion-client.js';
import { SearchResponse, getPageTitle, getDatabaseTitle, NotionPage, NotionDatabase } from '../utils/types.js';

export interface SearchParams {
  query: string;
  filter_type?: 'page' | 'database';
  sort_direction?: 'ascending' | 'descending';
  page_size?: number;
}

export interface SearchResult {
  id: string;
  type: 'page' | 'database';
  title: string;
  url: string;
  last_edited_time: string;
}

export interface SearchToolResult {
  success: boolean;
  results?: SearchResult[];
  total_count?: number;
  has_more?: boolean;
  error?: string;
  suggestion?: string;
}

export async function search(client: NotionClient, params: SearchParams): Promise<SearchToolResult> {
  const { query, filter_type, sort_direction = 'descending', page_size = 10 } = params;

  const requestBody: Record<string, unknown> = {
    query,
    page_size: Math.min(Math.max(page_size, 1), 100)
  };

  if (filter_type) {
    requestBody.filter = {
      value: filter_type,
      property: 'object'
    };
  }

  requestBody.sort = {
    direction: sort_direction,
    timestamp: 'last_edited_time'
  };

  const response = await client.post<SearchResponse>('/search', requestBody);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to search'
    };
  }

  const results: SearchResult[] = response.data.results.map(item => {
    if (item.object === 'page') {
      const page = item as NotionPage;
      return {
        id: page.id,
        type: 'page' as const,
        title: getPageTitle(page),
        url: page.url,
        last_edited_time: page.last_edited_time
      };
    } else {
      const database = item as NotionDatabase;
      return {
        id: database.id,
        type: 'database' as const,
        title: getDatabaseTitle(database),
        url: database.url,
        last_edited_time: database.last_edited_time
      };
    }
  });

  const result: SearchToolResult = {
    success: true,
    results,
    total_count: results.length,
    has_more: response.data.has_more
  };

  if (results.length === 0) {
    result.suggestion = `No results found for "${query}". Try alternative search terms or check that the content is shared with the integration.`;
  }

  return result;
}
