/**
 * Parses a JSON Pointer string according to RFC 6901 specification
 * @param pointer - JSON Pointer string (e.g., "/items/0/name")
 * @returns Array of path segments
 */
export const parseJsonPointer = (pointer: string): string[] => {
  if (!pointer) return [];
  if (pointer === '/') return [''];
  if (!pointer.startsWith('/')) {
    throw new Error('JSON Pointer must start with "/" or be empty');
  }

  return pointer
    .substring(1)
    .split('/')
    .map(segment => {
      // Decode JSON Pointer escape sequences
      return segment
        .replace(/~1/g, '/')
        .replace(/~0/g, '~');
    });
};

/**
 * Encodes a string for use in a JSON Pointer segment
 * @param segment - String to encode
 * @returns Encoded string with JSON Pointer escape sequences
 */
export const encodeJsonPointerSegment = (segment: string): string => {
  return segment
    .replace(/~/g, '~0')
    .replace(/\//g, '~1');
};