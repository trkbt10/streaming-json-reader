import type { StreamChunk } from '../types';

/**
 * Type guard to check if a value is a string
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Type guard to check if a value is a Uint8Array
 */
export const isUint8Array = (value: unknown): value is Uint8Array => {
  return value instanceof Uint8Array;
};

/**
 * Type guard to check if a value is a valid StreamChunk
 */
export const isStreamChunk = (value: unknown): value is StreamChunk => {
  return isString(value) || isUint8Array(value);
};

/**
 * Type guard to check if a value is an array
 */
export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * Type guard to check if a value is an object (excluding null and arrays)
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};