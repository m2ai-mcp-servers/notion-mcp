/**
 * Tests for Notion Client
 */

import { extractNotionId } from '../src/utils/notion-client';

describe('extractNotionId', () => {
  describe('UUID format handling', () => {
    it('should return normalized UUID with dashes when given 32 char hex', () => {
      const input = '1234567890abcdef1234567890abcdef';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should keep UUID format with dashes unchanged', () => {
      const input = '12345678-90ab-cdef-1234-567890abcdef';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should normalize mixed case UUID', () => {
      const input = 'ABCDEF12-3456-7890-ABCD-EF1234567890';
      const result = extractNotionId(input);
      expect(result).toBe('abcdef12-3456-7890-abcd-ef1234567890');
    });
  });

  describe('URL extraction', () => {
    it('should extract ID from notion.so page URL', () => {
      const input = 'https://www.notion.so/myworkspace/Page-Title-1234567890abcdef1234567890abcdef';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should extract ID from notion.site URL', () => {
      const input = 'https://example.notion.site/Page-1234567890abcdef1234567890abcdef';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should extract ID from URL with query parameters', () => {
      const input = 'https://www.notion.so/Page-1234567890abcdef1234567890abcdef?v=abc123';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });

    it('should extract ID from URL with dashes in the ID', () => {
      const input = 'https://www.notion.so/workspace/12345678-90ab-cdef-1234-567890abcdef';
      const result = extractNotionId(input);
      expect(result).toBe('12345678-90ab-cdef-1234-567890abcdef');
    });
  });

  describe('edge cases', () => {
    it('should return input as-is if no pattern matches', () => {
      const input = 'invalid-id';
      const result = extractNotionId(input);
      expect(result).toBe('invalid-id');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = extractNotionId(input);
      expect(result).toBe('');
    });
  });
});
