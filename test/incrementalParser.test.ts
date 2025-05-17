import { describe, it, expect } from 'vitest';
import { incrementalJsonParser, IncrementalReader } from '../src/index';

function createReader(chunks: string[]): IncrementalReader {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    async read() {
      if (index >= chunks.length) return { done: true, value: undefined } as const;
      return { done: false, value: encoder.encode(chunks[index++]) } as const;
    },
  };
}

describe('incrementalJsonParser', () => {
  it('parses streaming json and yields snapshots', async () => {
    const json = '{"a":1,"b":[{"c":2},3]}';
    const chunks = [json.slice(0,5), json.slice(5,10), json.slice(10)];
    const reader = createReader(chunks);

    const results: any[] = [];
    for await (const obj of incrementalJsonParser(reader)) {
      results.push(obj);
    }

    expect(results.length).greaterThan(1);
    expect(results[results.length - 1]).toEqual(JSON.parse(json));
    // ensure immutability
    if (results.length >= 2) {
      expect(results[results.length - 2]).not.toBe(results[results.length - 1]);
    }
  });
});
