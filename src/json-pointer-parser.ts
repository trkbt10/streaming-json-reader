import type { DeepPartial } from './types';
import { parseJsonPointer } from './utils/json-pointer';
import { isComplete } from './utils/completeness-checker';
import { createJsonPointerError } from './utils/error-utils';

/**
 * Parses JSON Pointers (RFC 6901) and extracts values from JSON objects.
 * Supports wildcards (*) for array elements.
 */
export class JSONPointerParser<T = any> {
  private pointer: string;
  private parsedPath: string[];
  private lastReturnedValues: any[] = [];

  constructor(pointer: string) {
    this.pointer = pointer;
    this.parsedPath = this.parsePointer(pointer);
  }

  /**
   * Parses a JSON Pointer string into an array of path segments
   * @param pointer - JSON Pointer string (e.g., "/items/0/name" or "/items/*")
   */
  private parsePointer(pointer: string): string[] {
    try {
      return parseJsonPointer(pointer);
    } catch (error) {
      throw createJsonPointerError(pointer, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Extracts all matching values from the data based on the pointer
   * @param data - The data to extract from
   * @returns Array of extracted values
   */
  extractValues(data: DeepPartial<T>): any[] {
    if (!data || typeof data !== 'object') return [];
    
    const results: any[] = [];
    this.extractRecursive(data, this.parsedPath, 0, results);
    return results;
  }

  /**
   * Recursively extracts values following the path
   */
  private extractRecursive(
    current: any,
    path: string[],
    pathIndex: number,
    results: any[]
  ): void {
    if (pathIndex >= path.length) {
      // We've reached the end of the path
      if (current !== undefined) {
        results.push(current);
      }
      return;
    }

    const segment = path[pathIndex];
    
    if (segment === '*' && Array.isArray(current)) {
      // Wildcard for array elements
      for (let i = 0; i < current.length; i++) {
        if (current[i] !== undefined) {
          this.extractRecursive(current[i], path, pathIndex + 1, results);
        }
      }
    } else if (Array.isArray(current) && /^\d+$/.test(segment)) {
      // Array index
      const index = parseInt(segment, 10);
      if (index < current.length && current[index] !== undefined) {
        this.extractRecursive(current[index], path, pathIndex + 1, results);
      }
    } else if (current && typeof current === 'object' && segment in current) {
      // Object property
      this.extractRecursive(current[segment], path, pathIndex + 1, results);
    }
  }

  /**
   * Gets new completed values since last check
   * @param data - Current data state
   * @returns Array of newly completed values
   */
  getNewCompletedValues(data: DeepPartial<T>): any[] {
    if (!data || typeof data !== 'object') return [];
    
    // Get all currently complete values
    const allValues = this.extractValues(data);
    const completeValues = allValues.filter(v => isComplete(v));
    
    // Find truly new values (not previously returned)
    const newValues: any[] = [];
    
    for (let i = 0; i < completeValues.length; i++) {
      const currentValue = completeValues[i];
      
      // Check if we have a corresponding previously returned value
      const previousValue = this.lastReturnedValues[i];
      
      // If no previous value exists, or the current value is different (more complete)
      if (!previousValue || JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
        newValues.push(currentValue);
        
        // Update the stored value
        this.lastReturnedValues[i] = JSON.parse(JSON.stringify(currentValue));
      }
    }
    
    return newValues;
  }

}