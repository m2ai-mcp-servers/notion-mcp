/**
 * Notion API Types
 */

// Common types
export interface NotionUser {
  object: 'user';
  id: string;
  type?: 'person' | 'bot';
  name?: string;
  avatar_url?: string | null;
  person?: {
    email?: string;
  };
}

export interface NotionParent {
  type: 'database_id' | 'page_id' | 'workspace';
  database_id?: string;
  page_id?: string;
  workspace?: boolean;
}

export interface NotionRichTextItem {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text?: string;
  href?: string | null;
}

// Page types
export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  parent: NotionParent;
  archived: boolean;
  properties: Record<string, NotionProperty>;
  url: string;
  icon?: NotionIcon | null;
  cover?: NotionFile | null;
}

export interface NotionIcon {
  type: 'emoji' | 'external' | 'file';
  emoji?: string;
  external?: { url: string };
  file?: { url: string };
}

export interface NotionFile {
  type: 'external' | 'file';
  external?: { url: string };
  file?: { url: string; expiry_time: string };
}

// Property types
export interface NotionProperty {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface TitleProperty extends NotionProperty {
  type: 'title';
  title: NotionRichTextItem[];
}

export interface RichTextProperty extends NotionProperty {
  type: 'rich_text';
  rich_text: NotionRichTextItem[];
}

export interface NumberProperty extends NotionProperty {
  type: 'number';
  number: number | null;
}

export interface SelectProperty extends NotionProperty {
  type: 'select';
  select: { id: string; name: string; color: string } | null;
}

export interface MultiSelectProperty extends NotionProperty {
  type: 'multi_select';
  multi_select: { id: string; name: string; color: string }[];
}

export interface DateProperty extends NotionProperty {
  type: 'date';
  date: { start: string; end?: string | null; time_zone?: string | null } | null;
}

export interface CheckboxProperty extends NotionProperty {
  type: 'checkbox';
  checkbox: boolean;
}

export interface UrlProperty extends NotionProperty {
  type: 'url';
  url: string | null;
}

export interface EmailProperty extends NotionProperty {
  type: 'email';
  email: string | null;
}

export interface PhoneProperty extends NotionProperty {
  type: 'phone_number';
  phone_number: string | null;
}

export interface PeopleProperty extends NotionProperty {
  type: 'people';
  people: NotionUser[];
}

// Database types
export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  last_edited_time: string;
  title: NotionRichTextItem[];
  description: NotionRichTextItem[];
  properties: Record<string, DatabaseProperty>;
  parent: NotionParent;
  url: string;
  archived: boolean;
  is_inline: boolean;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

// Block types
export interface NotionBlock {
  object: 'block';
  id: string;
  parent: NotionParent;
  type: string;
  created_time: string;
  last_edited_time: string;
  created_by: NotionUser;
  last_edited_by: NotionUser;
  has_children: boolean;
  archived: boolean;
  [key: string]: unknown;
}

// Search types
export interface SearchRequest {
  query?: string;
  filter?: {
    value: 'page' | 'database';
    property: 'object';
  };
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time';
  };
  start_cursor?: string;
  page_size?: number;
}

export interface SearchResponse {
  object: 'list';
  results: (NotionPage | NotionDatabase)[];
  next_cursor: string | null;
  has_more: boolean;
}

// Query types
export interface DatabaseQueryRequest {
  filter?: NotionFilter;
  sorts?: NotionSort[];
  start_cursor?: string;
  page_size?: number;
}

export interface NotionFilter {
  and?: NotionFilter[];
  or?: NotionFilter[];
  property?: string;
  [key: string]: unknown;
}

export interface NotionSort {
  property?: string;
  timestamp?: 'created_time' | 'last_edited_time';
  direction: 'ascending' | 'descending';
}

export interface PaginatedResponse<T> {
  object: 'list';
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
}

// User list response
export interface UsersListResponse extends PaginatedResponse<NotionUser> {}

// Helper to extract title from page
export function getPageTitle(page: NotionPage): string {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title') {
      const titleProp = prop as TitleProperty;
      return titleProp.title.map(t => t.plain_text || t.text?.content || '').join('');
    }
  }
  return 'Untitled';
}

// Helper to extract title from database
export function getDatabaseTitle(database: NotionDatabase): string {
  return database.title.map(t => t.plain_text || t.text?.content || '').join('') || 'Untitled';
}
