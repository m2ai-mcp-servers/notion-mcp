/**
 * Tests for MCP Tools
 * Uses mock NotionClient for testing tool logic
 */

import { NotionClient, NotionResponse } from '../src/utils/notion-client';
import { search, SearchParams } from '../src/tools/search';
import { getPage, createPage, updatePage, getPageContent } from '../src/tools/pages';
import { appendBlocks, updateBlock, deleteBlock } from '../src/tools/blocks';
import { getDatabase, queryDatabase, createDatabase } from '../src/tools/databases';
import { listUsers, getUser } from '../src/tools/users';

// Mock NotionClient
class MockNotionClient {
  private mockResponses: Map<string, NotionResponse<unknown>> = new Map();

  setMockResponse(endpoint: string, response: NotionResponse<unknown>) {
    this.mockResponses.set(endpoint, response);
  }

  async get<T>(endpoint: string): Promise<NotionResponse<T>> {
    return (this.mockResponses.get(endpoint) || { success: false, error: 'Not mocked' }) as NotionResponse<T>;
  }

  async post<T>(endpoint: string, _body?: unknown): Promise<NotionResponse<T>> {
    return (this.mockResponses.get(endpoint) || { success: false, error: 'Not mocked' }) as NotionResponse<T>;
  }

  async patch<T>(endpoint: string, _body?: unknown): Promise<NotionResponse<T>> {
    return (this.mockResponses.get(endpoint) || { success: false, error: 'Not mocked' }) as NotionResponse<T>;
  }

  async delete<T>(endpoint: string): Promise<NotionResponse<T>> {
    return (this.mockResponses.get(endpoint) || { success: false, error: 'Not mocked' }) as NotionResponse<T>;
  }
}

describe('Search Tool', () => {
  let mockClient: MockNotionClient;

  beforeEach(() => {
    mockClient = new MockNotionClient();
  });

  it('should return search results', async () => {
    mockClient.setMockResponse('/search', {
      success: true,
      data: {
        object: 'list',
        results: [
          {
            object: 'page',
            id: 'page-123',
            url: 'https://notion.so/page-123',
            last_edited_time: '2024-01-01T00:00:00Z',
            properties: {
              title: {
                id: 'title',
                type: 'title',
                title: [{ plain_text: 'Test Page' }]
              }
            }
          }
        ],
        has_more: false
      }
    });

    const result = await search(mockClient as unknown as NotionClient, { query: 'test' });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0].title).toBe('Test Page');
    expect(result.results?.[0].type).toBe('page');
  });

  it('should suggest alternatives when no results', async () => {
    mockClient.setMockResponse('/search', {
      success: true,
      data: {
        object: 'list',
        results: [],
        has_more: false
      }
    });

    const result = await search(mockClient as unknown as NotionClient, { query: 'nonexistent' });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
    expect(result.suggestion).toContain('No results found');
  });

  it('should handle API errors', async () => {
    mockClient.setMockResponse('/search', {
      success: false,
      error: 'API Error'
    });

    const result = await search(mockClient as unknown as NotionClient, { query: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API Error');
  });
});

describe('Page Tools', () => {
  let mockClient: MockNotionClient;

  beforeEach(() => {
    mockClient = new MockNotionClient();
  });

  describe('getPage', () => {
    it('should return page details', async () => {
      mockClient.setMockResponse('/pages/test-page-id', {
        success: true,
        data: {
          object: 'page',
          id: 'test-page-id',
          url: 'https://notion.so/test-page',
          created_time: '2024-01-01T00:00:00Z',
          last_edited_time: '2024-01-02T00:00:00Z',
          archived: false,
          parent: { type: 'workspace', workspace: true },
          properties: {
            title: {
              id: 'title',
              type: 'title',
              title: [{ plain_text: 'My Page' }]
            }
          }
        }
      });

      const result = await getPage(mockClient as unknown as NotionClient, { page_id: 'test-page-id' });

      expect(result.success).toBe(true);
      expect(result.page?.title).toBe('My Page');
      expect(result.page?.id).toBe('test-page-id');
    });
  });

  describe('createPage', () => {
    it('should create a page in database', async () => {
      mockClient.setMockResponse('/pages', {
        success: true,
        data: {
          object: 'page',
          id: 'new-page-id',
          url: 'https://notion.so/new-page',
          properties: {
            Name: {
              id: 'title',
              type: 'title',
              title: [{ plain_text: 'New Page' }]
            }
          }
        }
      });

      const result = await createPage(mockClient as unknown as NotionClient, {
        parent_id: 'db-123',
        parent_type: 'database_id',
        title: 'New Page'
      });

      expect(result.success).toBe(true);
      expect(result.page?.id).toBe('new-page-id');
    });
  });

  describe('updatePage', () => {
    it('should update page properties', async () => {
      mockClient.setMockResponse('/pages/page-123', {
        success: true,
        data: {
          object: 'page',
          id: 'page-123',
          url: 'https://notion.so/page-123',
          last_edited_time: '2024-01-03T00:00:00Z',
          properties: {
            title: {
              id: 'title',
              type: 'title',
              title: [{ plain_text: 'Updated' }]
            }
          }
        }
      });

      const result = await updatePage(mockClient as unknown as NotionClient, {
        page_id: 'page-123',
        properties: { Status: { select: { name: 'Done' } } }
      });

      expect(result.success).toBe(true);
      expect(result.page?.title).toBe('Updated');
    });
  });

  describe('getPageContent', () => {
    it('should return page content as markdown', async () => {
      mockClient.setMockResponse('/blocks/page-123/children?page_size=100', {
        success: true,
        data: {
          object: 'list',
          results: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: 'Hello' } }]
              }
            }
          ],
          has_more: false
        }
      });

      const result = await getPageContent(mockClient as unknown as NotionClient, {
        page_id: 'page-123',
        format: 'markdown'
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('Hello');
      expect(result.format).toBe('markdown');
    });
  });
});

describe('Block Tools', () => {
  let mockClient: MockNotionClient;

  beforeEach(() => {
    mockClient = new MockNotionClient();
  });

  describe('appendBlocks', () => {
    it('should append blocks to page', async () => {
      mockClient.setMockResponse('/blocks/page-123/children', {
        success: true,
        data: {
          object: 'list',
          results: [
            { id: 'block-1', type: 'paragraph' }
          ]
        }
      });

      const result = await appendBlocks(mockClient as unknown as NotionClient, {
        parent_id: 'page-123',
        content: 'New content'
      });

      expect(result.success).toBe(true);
      expect(result.block_count).toBe(1);
    });

    it('should fail with empty content', async () => {
      const result = await appendBlocks(mockClient as unknown as NotionClient, {
        parent_id: 'page-123',
        content: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid content');
    });
  });

  describe('deleteBlock', () => {
    it('should delete a block', async () => {
      mockClient.setMockResponse('/blocks/block-123', {
        success: true,
        data: { archived: true }
      });

      const result = await deleteBlock(mockClient as unknown as NotionClient, {
        block_id: 'block-123'
      });

      expect(result.success).toBe(true);
      expect(result.deleted_id).toBe('block-123');
    });
  });
});

describe('Database Tools', () => {
  let mockClient: MockNotionClient;

  beforeEach(() => {
    mockClient = new MockNotionClient();
  });

  describe('getDatabase', () => {
    it('should return database schema', async () => {
      mockClient.setMockResponse('/databases/db-123', {
        success: true,
        data: {
          object: 'database',
          id: 'db-123',
          title: [{ plain_text: 'Tasks' }],
          description: [],
          url: 'https://notion.so/db-123',
          created_time: '2024-01-01T00:00:00Z',
          last_edited_time: '2024-01-01T00:00:00Z',
          properties: {
            Name: { id: 'title', name: 'Name', type: 'title' },
            Status: { id: 'status', name: 'Status', type: 'select' }
          },
          is_inline: false,
          archived: false
        }
      });

      const result = await getDatabase(mockClient as unknown as NotionClient, {
        database_id: 'db-123'
      });

      expect(result.success).toBe(true);
      expect(result.database?.title).toBe('Tasks');
      expect(result.database?.properties).toHaveProperty('Name');
      expect(result.database?.properties).toHaveProperty('Status');
    });
  });

  describe('queryDatabase', () => {
    it('should return database entries', async () => {
      mockClient.setMockResponse('/databases/db-123/query', {
        success: true,
        data: {
          object: 'list',
          results: [
            {
              object: 'page',
              id: 'entry-1',
              url: 'https://notion.so/entry-1',
              created_time: '2024-01-01T00:00:00Z',
              last_edited_time: '2024-01-01T00:00:00Z',
              properties: {
                Name: {
                  id: 'title',
                  type: 'title',
                  title: [{ plain_text: 'Task 1' }]
                }
              }
            }
          ],
          has_more: false
        }
      });

      const result = await queryDatabase(mockClient as unknown as NotionClient, {
        database_id: 'db-123'
      });

      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(1);
      expect(result.pages?.[0].title).toBe('Task 1');
    });
  });

  describe('createDatabase', () => {
    it('should create a new database', async () => {
      mockClient.setMockResponse('/databases', {
        success: true,
        data: {
          object: 'database',
          id: 'new-db-id',
          title: [{ plain_text: 'New Database' }],
          url: 'https://notion.so/new-db'
        }
      });

      const result = await createDatabase(mockClient as unknown as NotionClient, {
        parent_page_id: 'page-123',
        title: 'New Database',
        properties: {
          Status: { type: 'select', select: { options: [] } }
        }
      });

      expect(result.success).toBe(true);
      expect(result.database?.id).toBe('new-db-id');
    });
  });
});

describe('User Tools', () => {
  let mockClient: MockNotionClient;

  beforeEach(() => {
    mockClient = new MockNotionClient();
  });

  describe('listUsers', () => {
    it('should return list of users', async () => {
      mockClient.setMockResponse('/users?page_size=100', {
        success: true,
        data: {
          object: 'list',
          results: [
            {
              object: 'user',
              id: 'user-1',
              type: 'person',
              name: 'John Doe',
              avatar_url: 'https://example.com/avatar.jpg',
              person: { email: 'john@example.com' }
            }
          ],
          has_more: false
        }
      });

      const result = await listUsers(mockClient as unknown as NotionClient);

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users?.[0].name).toBe('John Doe');
      expect(result.users?.[0].email).toBe('john@example.com');
    });
  });

  describe('getUser', () => {
    it('should return user details', async () => {
      mockClient.setMockResponse('/users/user-123', {
        success: true,
        data: {
          object: 'user',
          id: 'user-123',
          type: 'person',
          name: 'Jane Doe',
          avatar_url: null,
          person: { email: 'jane@example.com' }
        }
      });

      const result = await getUser(mockClient as unknown as NotionClient, {
        user_id: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Jane Doe');
    });
  });
});
