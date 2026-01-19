/**
 * Notion API Client
 * Handles all HTTP communication with Notion API
 */

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionClientConfig {
  apiKey: string;
}

export interface NotionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  minDelayMs: number;
}

export class NotionClient {
  private apiKey: string;
  private lastRequestTime: number = 0;
  private rateLimitConfig: RateLimitConfig = {
    requestsPerSecond: 3,
    minDelayMs: 334 // ~3 requests per second
  };

  constructor(config: NotionClientConfig) {
    this.apiKey = config.apiKey;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitConfig.minDelayMs) {
      const delay = this.rateLimitConfig.minDelayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    };
  }

  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<NotionResponse<T>> {
    await this.rateLimit();

    const url = `${NOTION_API_BASE}${endpoint}`;

    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders()
      };

      if (body && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        return {
          success: false,
          error: (data.message as string) || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status
        };
      }

      return {
        success: true,
        data: data as T,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async get<T>(endpoint: string): Promise<NotionResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<NotionResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<NotionResponse<T>> {
    return this.request<T>('PATCH', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<NotionResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }
}

// Helper to format ID with dashes
function formatWithDashes(id: string): string {
  const clean = id.toLowerCase().replace(/-/g, '');
  return clean.replace(
    /([a-f0-9]{8})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{4})([a-f0-9]{12})/,
    '$1-$2-$3-$4-$5'
  );
}

// Extract page/database ID from URL if provided
export function extractNotionId(input: string): string {
  // If it's already a UUID format (with or without dashes)
  const uuidPattern = /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i;

  if (uuidPattern.test(input)) {
    return formatWithDashes(input);
  }

  // Check if it's just a 32-char hex string
  if (/^[a-f0-9]{32}$/i.test(input)) {
    return formatWithDashes(input);
  }

  // Try to extract ID from Notion URL - look for 32 hex chars at end of path
  // Pattern: matches ID that appears after a dash following text (like "Page-Title-abc123...")
  const urlWithTitlePattern = /[/-]([a-f0-9]{32})(?:\?|$|#)/i;
  const urlMatch = input.match(urlWithTitlePattern);

  if (urlMatch) {
    return formatWithDashes(urlMatch[1]);
  }

  // Try pattern with dashes in URL (like /12345678-90ab-cdef-1234-567890abcdef)
  const urlPatternDashes = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const dashMatch = input.match(urlPatternDashes);

  if (dashMatch) {
    return formatWithDashes(dashMatch[1]);
  }

  // Return as-is if no pattern matches (will fail at API level)
  return input;
}
