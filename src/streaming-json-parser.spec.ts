import { describe, it, expect } from "vitest";
import { incrementalJsonParser } from "./incremental-json-parser";
import { createJSONReadableStreamDefaultReader } from "./utils/test-helpers/create-json-readable-stream-default-reader";

describe("streaming json parser", () => {
  it("should handle streaming JSON data", async () => {
    const json = '{"name": "streaming", "data": [1, 2, 3]}';
    const readable = createJSONReadableStreamDefaultReader(json, 3);
    const parser = incrementalJsonParser(readable);
    
    const snapshots: any[] = [];
    for await (const update of parser) {
      snapshots.push(update);
    }
    
    expect(snapshots.length > 1).toBe(true);
    expect(snapshots[snapshots.length - 1]).toEqual(JSON.parse(json));
  });

  it("should handle large streaming payloads", async () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const json = JSON.stringify({ items: largeArray });
    const reader = createJSONReadableStreamDefaultReader(json, 50);

    const results: any[] = [];
    for await (const obj of incrementalJsonParser(reader)) {
      results.push(obj);
    }

    expect(results.length > 1).toBe(true);
    expect(results[results.length - 1]).toEqual(JSON.parse(json));
    expect(results[results.length - 1].items).toHaveLength(1000);
  });

  it("should handle streaming with partial tokens", async () => {
    const json = '{"message": "これは日本語のテストです", "numbers": [100, 200, 300]}';
    const reader = createJSONReadableStreamDefaultReader(json, 7);

    const snapshots: any[] = [];
    for await (const update of incrementalJsonParser(reader)) {
      snapshots.push(update);
    }

    expect(snapshots.length > 1).toBe(true);
    expect(snapshots[snapshots.length - 1]).toEqual(JSON.parse(json));
  });
});