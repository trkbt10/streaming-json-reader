import type { StreamChunk } from '../types';

/**
 * Converts a StreamChunk (Uint8Array | string) to string
 */
export const decodeStreamChunk = (value: StreamChunk, decoder: InstanceType<typeof TextDecoder>): string => {
  return typeof value === 'string' ? value : decoder.decode(value, { stream: true });
};

/**
 * Creates a new TextDecoder instance for stream processing
 */
export const createStreamDecoder = (): InstanceType<typeof TextDecoder> => {
  return new TextDecoder();
};