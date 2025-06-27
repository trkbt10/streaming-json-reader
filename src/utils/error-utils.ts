/**
 * Creates a standardized JSON parsing error
 */
export const createParseError = (message: string, position?: number): Error => {
  const fullMessage = position !== undefined 
    ? `${message} at position ${position}`
    : message;
  return new Error(fullMessage);
};

/**
 * Creates a JSON Pointer validation error
 */
export const createJsonPointerError = (pointer: string, reason: string): Error => {
  return new Error(`Invalid JSON Pointer "${pointer}": ${reason}`);
};

/**
 * Safely handles error instances and converts unknown errors to Error objects
 */
export const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};