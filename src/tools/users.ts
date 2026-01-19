/**
 * User Tools
 * list_users, get_user
 */

import { NotionClient, extractNotionId } from '../utils/notion-client.js';
import { NotionUser, PaginatedResponse } from '../utils/types.js';

// List Users
export interface ListUsersParams {
  page_size?: number;
}

export interface UserInfo {
  id: string;
  type: 'person' | 'bot' | undefined;
  name: string | undefined;
  avatar_url: string | null | undefined;
  email?: string;
}

export interface ListUsersResult {
  success: boolean;
  users?: UserInfo[];
  total_count?: number;
  has_more?: boolean;
  error?: string;
}

export async function listUsers(client: NotionClient, params: ListUsersParams = {}): Promise<ListUsersResult> {
  const { page_size = 100 } = params;

  const endpoint = `/users?page_size=${Math.min(Math.max(page_size, 1), 100)}`;
  const response = await client.get<PaginatedResponse<NotionUser>>(endpoint);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to list users'
    };
  }

  const users: UserInfo[] = response.data.results.map(user => ({
    id: user.id,
    type: user.type,
    name: user.name,
    avatar_url: user.avatar_url,
    email: user.person?.email
  }));

  return {
    success: true,
    users,
    total_count: users.length,
    has_more: response.data.has_more
  };
}

// Get User
export interface GetUserParams {
  user_id: string;
}

export interface GetUserResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

export async function getUser(client: NotionClient, params: GetUserParams): Promise<GetUserResult> {
  const userId = extractNotionId(params.user_id);
  const response = await client.get<NotionUser>(`/users/${userId}`);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to get user'
    };
  }

  const user = response.data;

  return {
    success: true,
    user: {
      id: user.id,
      type: user.type,
      name: user.name,
      avatar_url: user.avatar_url,
      email: user.person?.email
    }
  };
}
