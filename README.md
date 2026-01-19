# Notion MCP Server

An MCP (Model Context Protocol) server that provides AI assistants with full access to Notion workspaces. Enables Claude to search, read, create, and update pages, databases, and blocks.

## Features

- **Search & Discovery**: Search across all pages and databases in your workspace
- **Page Operations**: Create, read, update, and archive pages
- **Content Management**: Add, update, and delete content blocks with markdown support
- **Database Operations**: Query databases with filters and sorts, create new databases
- **User Management**: List workspace users and get user details
- **Rate Limiting**: Built-in rate limiting to respect Notion API limits (3 req/sec)
- **Markdown Conversion**: Automatic conversion between markdown and Notion blocks

## Installation

```bash
npm install
npm run build
```

## Configuration

### 1. Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Select "Internal integration"
4. Grant required capabilities:
   - Read content
   - Update content
   - Insert content
   - Read user information (optional)
5. Copy the "Internal Integration Token"

### 2. Share Content with Integration

For the integration to access pages and databases:
1. Open the page or database in Notion
2. Click the "..." menu in the top right
3. Click "Add connections"
4. Select your integration

### 3. Set Environment Variable

```bash
export NOTION_API_KEY=secret_your_integration_token_here
```

Or create a `.env` file:
```
NOTION_API_KEY=secret_your_integration_token_here
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/path/to/notion-mcp/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "secret_your_token_here"
      }
    }
  }
}
```

## Available Tools

### Search & Discovery

| Tool | Description |
|------|-------------|
| `search` | Search across all pages and databases by keyword or title |

### Page Operations

| Tool | Description |
|------|-------------|
| `get_page` | Retrieve a page's properties and metadata |
| `create_page` | Create a new page in a database or as child of another page |
| `update_page` | Update a page's properties (not content blocks) |
| `get_page_content` | Retrieve all content blocks from a page |

### Block Operations

| Tool | Description |
|------|-------------|
| `append_blocks` | Add new content blocks to a page (supports markdown) |
| `update_block` | Update an existing block's content |
| `delete_block` | Delete (archive) a block |

### Database Operations

| Tool | Description |
|------|-------------|
| `get_database` | Retrieve database schema and properties |
| `query_database` | Query a database with filters and sorts |
| `create_database` | Create a new database as child of a page |

### User Operations

| Tool | Description |
|------|-------------|
| `list_users` | List all users in the workspace |
| `get_user` | Get details about a specific user |

## Markdown Support

The server supports conversion of common markdown to Notion blocks:

- Headings (H1, H2, H3)
- Bold, italic, strikethrough, inline code
- Bullet and numbered lists
- Checkboxes / todo items
- Code blocks with language
- Links
- Blockquotes
- Horizontal rules

### Example

```markdown
# My Page Title

This is a paragraph with **bold** and *italic* text.

- Bullet item 1
- Bullet item 2

1. Numbered item
2. Another item

- [ ] Todo item
- [x] Completed item

> A blockquote

\`\`\`javascript
const greeting = "Hello, World!";
\`\`\`
```

## Examples

### Search for Pages

```json
{
  "query": "meeting notes",
  "filter_type": "page",
  "page_size": 10
}
```

### Create a Page in a Database

```json
{
  "parent_id": "database-id-here",
  "parent_type": "database_id",
  "title": "New Task",
  "properties": {
    "Status": { "select": { "name": "In Progress" } }
  },
  "content": "## Task Description\n\nThis is the task content."
}
```

### Query a Database

```json
{
  "database_id": "database-id-here",
  "filter": {
    "property": "Status",
    "select": { "equals": "Done" }
  },
  "sorts": [
    { "property": "Due Date", "direction": "ascending" }
  ]
}
```

### Append Content to a Page

```json
{
  "parent_id": "page-id-here",
  "content": "## New Section\n\nAdding more content to this page.\n\n- Item 1\n- Item 2"
}
```

## Known Limitations

- Cannot access pages not shared with the integration
- File/image uploads not supported (use URLs instead)
- Comments API limited
- Synced blocks are read-only

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## License

MIT

## Author

Me, Myself Plus AI LLC
