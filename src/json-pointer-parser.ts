import type { DeepPartial } from './types';
import { parseJsonPointer } from './utils/json-pointer';
import { isComplete, isStructurallyComplete, type StructuralContext } from './utils/completeness-checker';
import { createJsonPointerError } from './utils/error-utils';

/**
 * Options for controlling JSONPointerParser behavior
 */
export interface JSONPointerOptions {
  /**
   * Whether to wait for structural completion before yielding values.
   * - true: Only yield objects/arrays when they are structurally closed (} or ])
   * - false: Yield objects/arrays as soon as they have no undefined nested values (default behavior)
   * @default false
   */
  waitForStructuralCompletion?: boolean;
}

/**
 * Parses JSON Pointers (RFC 6901) and extracts values from JSON objects.
 * Supports wildcards (*) for array elements.
 */
export class JSONPointerParser<T = any> {
  private pointer: string;
  private parsedPath: string[];
  private lastReturnedValues: any[] = [];
  private structuralContext: StructuralContext = {
    closedStructures: new Set(),
    stackDepth: 0
  };
  private options: JSONPointerOptions;

  constructor(pointer: string, options: JSONPointerOptions = {}) {
    this.pointer = pointer;
    this.parsedPath = this.parsePointer(pointer);
    this.options = {
      waitForStructuralCompletion: false,
      ...options
    };
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
   * Updates the structural context when structures are closed
   * @param closedStructure - The structure that was closed
   */
  markStructureClosed(closedStructure: any): void {
    if (closedStructure && typeof closedStructure === 'object') {
      this.structuralContext.closedStructures.add(closedStructure);
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
    
    // Apply completion strategy based on options
    const completeValues = this.options.waitForStructuralCompletion
      // Structural completion: Wait for parser to encounter closing delimiters (} or ])
      ? allValues.filter(v => isComplete(v) && isStructurallyComplete(v, this.structuralContext))
      // Immediate completion: Yield as soon as no undefined values exist
      : allValues.filter(v => isComplete(v));
    
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