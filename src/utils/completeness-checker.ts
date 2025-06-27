/**
 * Context for tracking structural completeness
 */
export interface StructuralContext {
  closedStructures: Set<any>;
  closedPaths: Set<string>;
  stackDepth: number;
}

/**
 * Recursively checks if a JSON value is complete (no undefined values in nested structures)
 * 
 * This function only checks if all present properties have values (no undefined).
 * It does NOT check if the structure has been fully parsed/closed by the JSON parser.
 * 
 * Examples:
 * - `{id: 1}` → true (no undefined values)
 * - `{id: 1, name: undefined}` → false (has undefined)
 * - `{id: 1}` during parsing before `}` is encountered → still true
 */
export const isComplete = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value !== 'object') {
    return true;
  }
  
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== undefined && !isComplete(item)) {
        return false;
      }
    }
    return true;
  }
  
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      if (!isComplete(value[key])) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Checks if a value is structurally complete (has been fully parsed and closed)
 * 
 * This function checks if the JSON parser has actually encountered and processed
 * the closing delimiters (`}` for objects, `]` for arrays) for this structure.
 * 
 * The difference from isComplete():
 * - isComplete: `{id: 1}` → true (no undefined values)
 * - isStructurallyComplete: `{id: 1}` → false until `}` is parsed
 * 
 * Examples during streaming parse of `{"items": [{"id": 1}, {"id": 2}]}`:
 * 1. After parsing `{"id": 1` (before `}`):
 *    - isComplete({id: 1}) → true
 *    - isStructurallyComplete({id: 1}) → false
 * 2. After parsing `{"id": 1}` (after `}`):
 *    - isComplete({id: 1}) → true  
 *    - isStructurallyComplete({id: 1}) → true
 */
export const isStructurallyComplete = (value: any, context: StructuralContext): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value !== 'object') {
    return true;
  }
  
  // Check if this structure has been explicitly closed
  if (!context.closedStructures.has(value)) {
    return false;
  }
  
  // Recursively check nested structures
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== undefined && !isStructurallyComplete(item, context)) {
        return false;
      }
    }
    return true;
  }
  
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      if (!isStructurallyComplete(value[key], context)) {
        return false;
      }
    }
  }
  
  return true;
};