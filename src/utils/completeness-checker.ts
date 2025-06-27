/**
 * Recursively checks if a JSON value is complete (no undefined values in nested structures)
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