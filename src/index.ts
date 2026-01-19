#!/usr/bin/env node

/**
 * Notion MCP Server
 *
 * Provides AI assistants with full access to Notion workspaces.
 * Enables Claude to search, read, create, and update pages,
 * databases, and blocks.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { NotionClient } from './utils/notion-client.js';
import {
  search,
  SearchParams,
  getPage,
  GetPageParams,
  createPage,
  CreatePageParams,
  updatePage,
  UpdatePageParams,
  getPageContent,
  GetPageContentParams,
  appendBlocks,
  AppendBlocksParams,
  updateBlock,
  UpdateBlockParams,
  deleteBlock,
  DeleteBlockParams,
  getDatabase,
  GetDatabaseParams,
  queryDatabase,
  QueryDatabaseParams,
  createDatabase,
  CreateDatabaseParams,
  listUsers,
  ListUsersParams,
  getUser,
  GetUserParams
} from './tools/index.js';

// Get API key from environment
const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY environment variable is required');
  console.error('Get your API key from https://www.notion.so/my-integrations');
  process.exit(1);
}

// Initialize Notion client
const notionClient = new NotionClient({ apiKey: NOTION_API_KEY });

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'search',
    description: 'Search across all pages and databases in the workspace. Use when user wants to find content by keyword or title.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text'
        },
        filter_type: {
          type: 'string',
          enum: ['page', 'database'],
          description: 'Filter by object type'
        },
        sort_direction: {
          type: 'string',
          enum: ['ascending', 'descending'],
          description: 'Sort by last edited time'
        },
        page_size: {
          type: 'number',
          description: 'Number of results (max 100)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_page',
    description: 'Retrieve a page\'s properties and metadata. Use when user wants to view page details or check properties.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Notion page ID or URL'
        }
      },
      required: ['page_id']
    }
  },
  {
    name: 'create_page',
    description: 'Create a new page in a database or as a child of another page. Use when user wants to add new content to Notion.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: {
          type: 'string',
          description: 'Parent database ID or page ID'
        },
        parent_type: {
          type: 'string',
          enum: ['database_id', 'page_id'],
          description: 'Type of parent'
        },
        title: {
          type: 'string',
          description: 'Page title'
        },
        properties: {
          type: 'object',
          description: 'Database properties (for database parents)'
        },
        content: {
          type: 'string',
          description: 'Initial page content in markdown format'
        }
      },
      required: ['parent_id', 'parent_type', 'title']
    }
  },
  {
    name: 'update_page',
    description: 'Update a page\'s properties (not content blocks). Use when user wants to modify page metadata or database properties.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Page ID to update'
        },
        properties: {
          type: 'object',
          description: 'Properties to update'
        },
        archived: {
          type: 'boolean',
          description: 'Archive or unarchive the page'
        }
      },
      required: ['page_id', 'properties']
    }
  },
  {
    name: 'get_page_content',
    description: 'Retrieve all content blocks from a page. Use when user wants to read the full content of a page.',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Page ID to get content from'
        },
        format: {
          type: 'string',
          enum: ['markdown', 'blocks', 'plain_text'],
          description: 'Output format'
        }
      },
      required: ['page_id']
    }
  },
  {
    name: 'append_blocks',
    description: 'Add new content blocks to a page or block. Use when user wants to add content to an existing page.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: {
          type: 'string',
          description: 'Page or block ID to append to'
        },
        content: {
          type: 'string',
          description: 'Content to add (supports markdown)'
        }
      },
      required: ['parent_id', 'content']
    }
  },
  {
    name: 'update_block',
    description: 'Update an existing block\'s content. Use when user wants to modify specific content.',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: {
          type: 'string',
          description: 'Block ID to update'
        },
        content: {
          type: 'string',
          description: 'New content for the block'
        }
      },
      required: ['block_id', 'content']
    }
  },
  {
    name: 'delete_block',
    description: 'Delete a block (archive it). Use when user wants to remove content from a page.',
    inputSchema: {
      type: 'object',
      properties: {
        block_id: {
          type: 'string',
          description: 'Block ID to delete'
        }
      },
      required: ['block_id']
    }
  },
  {
    name: 'get_database',
    description: 'Retrieve database schema and properties. Use when user wants to understand database structure.',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'Database ID'
        }
      },
      required: ['database_id']
    }
  },
  {
    name: 'query_database',
    description: 'Query a database with optional filters and sorts. Use when user wants to retrieve specific entries from a database.',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'Database ID to query'
        },
        filter: {
          type: 'object',
          description: 'Notion filter object'
        },
        sorts: {
          type: 'array',
          description: 'Sort configuration'
        },
        page_size: {
          type: 'number',
          description: 'Results per page (max 100)'
        }
      },
      required: ['database_id']
    }
  },
  {
    name: 'create_database',
    description: 'Create a new database as a child of a page. Use when user wants to set up a new structured data collection.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_page_id: {
          type: 'string',
          description: 'Parent page ID'
        },
        title: {
          type: 'string',
          description: 'Database title'
        },
        properties: {
          type: 'object',
          description: 'Database properties schema'
        }
      },
      required: ['parent_page_id', 'title', 'properties']
    }
  },
  {
    name: 'list_users',
    description: 'List all users in the workspace. Use when user needs to reference team members.',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: {
          type: 'number',
          description: 'Number of users to return'
        }
      }
    }
  },
  {
    name: 'get_user',
    description: 'Get details about a specific user. Use when user needs info about a team member.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID'
        }
      },
      required: ['user_id']
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'notion-mcp',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case 'search':
        result = await search(notionClient, args as unknown as SearchParams);
        break;

      case 'get_page':
        result = await getPage(notionClient, args as unknown as GetPageParams);
        break;

      case 'create_page':
        result = await createPage(notionClient, args as unknown as CreatePageParams);
        break;

      case 'update_page':
        result = await updatePage(notionClient, args as unknown as UpdatePageParams);
        break;

      case 'get_page_content':
        result = await getPageContent(notionClient, args as unknown as GetPageContentParams);
        break;

      case 'append_blocks':
        result = await appendBlocks(notionClient, args as unknown as AppendBlocksParams);
        break;

      case 'update_block':
        result = await updateBlock(notionClient, args as unknown as UpdateBlockParams);
        break;

      case 'delete_block':
        result = await deleteBlock(notionClient, args as unknown as DeleteBlockParams);
        break;

      case 'get_database':
        result = await getDatabase(notionClient, args as unknown as GetDatabaseParams);
        break;

      case 'query_database':
        result = await queryDatabase(notionClient, args as unknown as QueryDatabaseParams);
        break;

      case 'create_database':
        result = await createDatabase(notionClient, args as unknown as CreateDatabaseParams);
        break;

      case 'list_users':
        result = await listUsers(notionClient, args as unknown as ListUsersParams);
        break;

      case 'get_user':
        result = await getUser(notionClient, args as unknown as GetUserParams);
        break;

      default:
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: `Unknown tool: ${name}` })
          }],
          isError: true
        };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: errorMessage })
      }],
      isError: true
    };
  }
});

// Run server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Notion MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
