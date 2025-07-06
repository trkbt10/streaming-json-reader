import { IncrementalParser, incrementalJsonParser } from './incremental-json-parser';
import type { DeepPartial } from './types';
import { JSONPointerParser, type JSONPointerOptions } from './json-pointer-parser';
import { decodeStreamChunk, createStreamDecoder } from './utils/text-decoder';
import { normalizeError } from './utils/error-utils';

/**
 * Represents a JSON node in the streaming parser with navigation capabilities
 */
export class StreamingJsonNode<T = any> {
  public readonly path: string;
  public readonly type: 'object' | 'array' | 'primitive' | 'unknown';
  
  private parser: StreamingJsonParser<T>;
  private valuePath: string;
  
  constructor(parser: StreamingJsonParser<T>, path: string, type: 'object' | 'array' | 'primitive' | 'unknown' = 'unknown') {
    this.parser = parser;
    this.path = path;
    this.type = type;
    this.valuePath = path;
  }
  
  /**
   * AsyncIterator implementation - yields values as they stream
   */
  async *[Symbol.asyncIterator](): AsyncIterator<{value: any, done: boolean}> {
    // For primitive values, yield once with done=true
    if (this.type === 'primitive') {
      const value = await this.getValue();
      yield { value, done: true };
      return;
    }
    
    // For objects/arrays, watch for completion
    const fullValue = await this.getValue();
    yield { value: fullValue, done: true };
  }
  
  /**
   * Select child nodes matching the pointer
   */
  async *select(pointer: string): AsyncGenerator<StreamingJsonNode<T>> {
    // Combine current path with the new pointer
    const combinedPath = this.path + pointer;
    
    for await (const node of this.parser.select(combinedPath)) {
      yield node;
    }
  }
  
  /**
   * Get the complete value at this node
   */
  async getValue(): Promise<any> {
    const fullResponse = await this.parser.getFullResponse();
    
    if (this.path === '') {
      return fullResponse;
    }
    
    // Extract value at the path
    const pointerParser = new JSONPointerParser<T>(this.path);
    const values = pointerParser.extractValues(fullResponse as DeepPartial<T>);
    
    return values.length > 0 ? values[0] : undefined;
  }
}

/**
 * A utility class for reading and parsing JSON streams with support for JSON Pointers.
 * Provides convenient methods for watching specific paths and getting full responses.
 */
export class StreamingJsonParser<T = any> {
  private reader: ReadableStreamDefaultReader<Uint8Array | string>;
  private fullResponse: T | null = null;
  private currentSnapshot: DeepPartial<T> | null = null;
  private completed: boolean = false;
  private error: Error | null = null;
  private consumePromise: Promise<void> | null = null;
  private activeWatch: boolean = false;

  constructor(reader: ReadableStreamDefaultReader<Uint8Array | string>) {
    this.reader = reader;
  }

  /**
   * Watches a specific JSON Pointer path and yields values as they become complete.
   * 
   * Uses "immediate completion" - yields objects/arrays as soon as they have no undefined values,
   * even if the parser hasn't encountered the closing delimiters (} or ]) yet.
   * 
   * @param pointer - JSON Pointer string (e.g., "/items/*" or "/data/0/name")
   * @param options - Options for controlling completion behavior
   * @yields Completed values at the specified path
   * 
   * @example
   * ```typescript
   * // Yields {id: 1} as soon as the value is set, before } is parsed
   * for await (const item of streamReader.watch('/items/*')) {
   *   console.log('New item:', item);
   * }
   * ```
   */
  async *watch(pointer: string, options?: JSONPointerOptions): AsyncGenerator<any, void, unknown> {
    const pointerParser = new JSONPointerParser<T>(pointer, options);
    
    // Mark as active watch to prevent concurrent background consumption
    this.activeWatch = true;
    
    try {
      // Create a new parser for this watch operation
      const parser = new IncrementalParser();
      const decoder = createStreamDecoder();
      
      while (true) {
        const { done, value } = await this.reader.read();
        
        if (done) {
          parser.end();
          const updates = parser.collectUpdates();
          if (updates.length > 0) {
            this.currentSnapshot = updates[updates.length - 1];
          }
          // Set fullResponse to the current snapshot (should be complete now)
          if (this.currentSnapshot !== null) {
            this.fullResponse = this.currentSnapshot as T;
          }
          this.completed = true;
          break;
        }
        
        const chunk = decodeStreamChunk(value, decoder);
        parser.feed(chunk);
        
        const updates = parser.collectUpdates();
        const closedStructures = parser.collectClosedStructures();
        
        // Notify the pointer parser about closed structures
        for (const closedStructure of closedStructures) {
          pointerParser.markStructureClosed(closedStructure);
        }
        
        for (const update of updates) {
          this.currentSnapshot = update;
          const newValues = pointerParser.getNewCompletedValues(update);
          for (const newValue of newValues) {
            yield newValue;
          }
        }
      }
    } catch (error) {
      this.error = normalizeError(error);
      throw this.error;
    } finally {
      this.activeWatch = false;
    }
  }

  /**
   * Watches a specific JSON Pointer path and yields values only when they are structurally complete.
   * 
   * Uses "structural completion" - waits for the entire JSON stream to complete before yielding values.
   * This ensures objects/arrays are truly complete and won't receive additional properties.
   * 
   * @param pointer - JSON Pointer string (e.g., "/items/*" or "/data/0/name")
   * @yields Structurally completed values at the specified path
   * 
   * @example
   * ```typescript
   * // Only yields complete objects after the entire JSON stream is parsed
   * for await (const item of streamReader.watchComplete('/items/*')) {
   *   console.log('Complete item:', item);
   * }
   * ```
   */
  async *watchComplete(pointer: string): AsyncGenerator<any, void, unknown> {
    // For simplicity, wait for the entire JSON to complete and then extract values
    const fullResponse = await this.getFullResponse();
    
    // Now extract all values using the pointer
    const pointerParser = new JSONPointerParser<T>(pointer);
    const values = pointerParser.extractValues(fullResponse as DeepPartial<T>);
    
    // Yield all complete values
    for (const value of values) {
      yield value;
    }
  }

  /**
   * Alias for watch() method - monitors a specific path for changes
   */
  observe(pointer: string, options?: JSONPointerOptions): AsyncGenerator<any, void, unknown> {
    return this.watch(pointer, options);
  }

  /**
   * Selects JSON nodes matching the given pointer path
   * Returns StreamingJsonNode objects that can be further navigated or iterated
   * 
   * @param pointer - JSON Pointer string (e.g., "/items/*" or "/data/0/name")
   * @yields StreamingJsonNode objects for matching paths
   */
  async *select(pointer: string): AsyncGenerator<StreamingJsonNode<T>> {
    // Special case for empty pointer (root)
    if (pointer === '') {
      const fullResponse = await this.getFullResponse();
      const type = this.determineNodeType(fullResponse, '');
      yield new StreamingJsonNode<T>(this, '', type);
      return;
    }
    
    // For wildcard paths, we need to enumerate all matching paths
    const fullResponse = await this.getFullResponse();
    const paths = this.extractMatchingPaths(fullResponse, pointer);
    
    // Yield a node for each matching path
    for (const path of paths) {
      const type = this.determineNodeType(fullResponse, path);
      yield new StreamingJsonNode<T>(this, path, type);
    }
  }
  
  /**
   * Returns the first node matching the given pointer path
   * 
   * @param pointer - JSON Pointer string
   * @returns First matching StreamingJsonNode or null
   */
  async querySelector(pointer: string): Promise<StreamingJsonNode<T> | null> {
    for await (const node of this.select(pointer)) {
      return node;
    }
    return null;
  }
  
  /**
   * Alias for select() - returns all nodes matching the pointer
   */
  querySelectorAll(pointer: string): AsyncGenerator<StreamingJsonNode<T>> {
    return this.select(pointer);
  }

  /**
   * Reads the entire JSON stream and yields partial updates as they arrive.
   * 
   * @yields Partial JSON objects as they are built up
   * 
   * @example
   * ```typescript
   * for await (const partial of streamReader.readPartial()) {
   *   console.log('Current state:', partial);
   * }
   * ```
   */
  async *readPartial(): AsyncGenerator<DeepPartial<T>, void, unknown> {
    // Mark as active watch to prevent concurrent background consumption
    this.activeWatch = true;
    
    try {
      for await (const update of incrementalJsonParser<T>(this.reader)) {
        this.currentSnapshot = update;
        this.fullResponse = this.currentSnapshot as T;
        yield update;
      }
      this.completed = true;
    } catch (error) {
      this.error = normalizeError(error);
      throw this.error;
    } finally {
      this.activeWatch = false;
    }
  }

  /**
   * Gets the complete response after the stream has finished.
   * Waits for the stream to complete if it hasn't already.
   * 
   * @returns Promise that resolves to the complete JSON object
   * @throws Error if the stream encounters an error or invalid JSON
   * 
   * @example
   * ```typescript
   * const fullData = await streamReader.getFullResponse();
   * console.log('Complete response:', fullData);
   * ```
   */
  async getFullResponse(): Promise<T> {
    if (this.completed && this.fullResponse !== null) {
      return this.fullResponse;
    }
    
    if (this.error) {
      throw this.error;
    }
    
    // Ensure the stream is being consumed
    this.ensureConsuming();
    
    // Wait for consumption to complete
    if (this.consumePromise) {
      await this.consumePromise;
    }
    
    if (this.error) {
      throw this.error;
    }
    
    if (this.fullResponse === null) {
      throw new Error('Failed to get full response');
    }
    
    return this.fullResponse;
  }

  /**
   * Gets the current partial state of the JSON being parsed.
   * Returns null if no data has been parsed yet.
   * 
   * @returns The current partial JSON object or null
   * 
   * @example
   * ```typescript
   * const current = streamReader.getCurrentSnapshot();
   * if (current) {
   *   console.log('Data so far:', current);
   * }
   * ```
   */
  getCurrentSnapshot(): DeepPartial<T> | null {
    return this.currentSnapshot;
  }

  /**
   * Ensures the stream is being consumed in the background
   * Only starts background consumption if no active consumption is happening
   */
  private ensureConsuming(): void {
    // Don't start background consumption if we're already consuming or completed
    if (!this.consumePromise && !this.completed && !this.activeWatch) {
      this.consumePromise = this.consumeInBackground();
    }
  }

  /**
   * Consumes the stream in the background to build the full response
   */
  private async consumeInBackground(): Promise<void> {
    try {
      const parser = new IncrementalParser();
      const decoder = createStreamDecoder();
      
      while (true) {
        const { done, value } = await this.reader.read();
        
        if (done) {
          parser.end();
          const updates = parser.collectUpdates();
          if (updates.length > 0) {
            this.currentSnapshot = updates[updates.length - 1];
          }
          // Set fullResponse to the current snapshot (should be complete now)
          if (this.currentSnapshot !== null) {
            this.fullResponse = this.currentSnapshot as T;
          }
          this.completed = true;
          break;
        }
        
        const chunk = decodeStreamChunk(value, decoder);
        parser.feed(chunk);
        
        const updates = parser.collectUpdates();
        if (updates.length > 0) {
          this.currentSnapshot = updates[updates.length - 1];
        }
      }
    } catch (error) {
      this.error = normalizeError(error);
      throw this.error;
    }
  }

  /**
   * Creates a cloned reader for parallel consumption
   * Note: This is a simplified implementation. In a real-world scenario,
   * you would need a more sophisticated approach to handle multiple consumers.
   */
  private async getClonedReader(): Promise<ReadableStreamDefaultReader<Uint8Array | string>> {
    // For now, we'll throw an error indicating this needs to be implemented
    // based on the specific use case (e.g., using a BroadcastChannel, 
    // buffering, or requiring the source to be tee-able)
    
    // In practice, you might want to:
    // 1. Buffer all chunks as they arrive
    // 2. Create new readers that replay the buffered chunks
    // 3. Or require the input to be a tee-able stream
    
    // For the initial implementation, we'll return the original reader
    // This means only one consumer can be active at a time
    return this.reader;
  }
  
  /**
   * Extracts all paths matching the given pointer pattern
   */
  private extractMatchingPaths(data: any, pointer: string): string[] {
    const paths: string[] = [];
    const segments = pointer.split('/').filter(s => s !== '');
    
    const traverse = (current: any, currentPath: string[], pointerIndex: number) => {
      if (pointerIndex >= segments.length) {
        // We've matched all segments
        paths.push('/' + currentPath.join('/'));
        return;
      }
      
      const segment = segments[pointerIndex];
      
      if (segment === '*') {
        // Wildcard - match all array elements or object keys
        if (Array.isArray(current)) {
          for (let i = 0; i < current.length; i++) {
            traverse(current[i], [...currentPath, i.toString()], pointerIndex + 1);
          }
        } else if (current && typeof current === 'object') {
          for (const key of Object.keys(current)) {
            traverse(current[key], [...currentPath, key], pointerIndex + 1);
          }
        }
      } else {
        // Exact match
        if (Array.isArray(current)) {
          const index = parseInt(segment, 10);
          if (!isNaN(index) && index >= 0 && index < current.length) {
            traverse(current[index], [...currentPath, segment], pointerIndex + 1);
          }
        } else if (current && typeof current === 'object' && segment in current) {
          traverse(current[segment], [...currentPath, segment], pointerIndex + 1);
        }
      }
    };
    
    traverse(data, [], 0);
    return paths;
  }
  
  /**
   * Determines the type of a node at the given path
   */
  private determineNodeType(data: any, path: string): 'object' | 'array' | 'primitive' | 'unknown' {
    if (path === '') {
      // Root path
      if (Array.isArray(data)) return 'array';
      if (data && typeof data === 'object') return 'object';
      return 'primitive';
    }
    
    // Navigate to the value at the path
    const segments = path.split('/').filter(s => s !== '');
    let current = data;
    
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        return 'unknown';
      }
      
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10);
        if (isNaN(index) || index < 0 || index >= current.length) {
          return 'unknown';
        }
        current = current[index];
      } else {
        if (!(segment in current)) {
          return 'unknown';
        }
        current = current[segment];
      }
    }
    
    // Determine type of the final value
    if (Array.isArray(current)) return 'array';
    if (current && typeof current === 'object') return 'object';
    return 'primitive';
  }
}