import { describe, it, expect } from "vitest";
import { StreamingJsonParser } from "./streaming-json-parser";
import { createJSONReadableStreamDefaultReader } from "./utils/test-helpers/create-json-readable-stream-default-reader";

describe("StreamingJsonParser watchComplete", () => {
  it("should wait for complete JSON before yielding values", async () => {
    const json = '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}';
    const reader = createJSONReadableStreamDefaultReader(json, 5);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const item of parser.watchComplete('/items/*')) {
      results.push(item);
    }
    
    // Should yield complete objects only
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1, name: "Item 1" });
    expect(results[1]).toEqual({ id: 2, name: "Item 2" });
  });

  it("should handle nested objects correctly", async () => {
    const json = '{"users": [{"profile": {"name": "Alice", "age": 30}}, {"profile": {"name": "Bob", "age": 25}}]}';
    const reader = createJSONReadableStreamDefaultReader(json, 8);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const user of parser.watchComplete('/users/*')) {
      results.push(user);
    }
    
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ profile: { name: "Alice", age: 30 } });
    expect(results[1]).toEqual({ profile: { name: "Bob", age: 25 } });
  });

  it("should handle arrays with different chunk sizes", async () => {
    const json = '{"numbers": [1, 2, 3, 4, 5]}';
    const reader = createJSONReadableStreamDefaultReader(json, 3);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const number of parser.watchComplete('/numbers/*')) {
      results.push(number);
    }
    
    expect(results).toEqual([1, 2, 3, 4, 5]);
  });

  it("should handle empty arrays", async () => {
    const json = '{"items": []}';
    const reader = createJSONReadableStreamDefaultReader(json, 2);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const item of parser.watchComplete('/items/*')) {
      results.push(item);
    }
    
    expect(results).toHaveLength(0);
  });

  it("should handle single object", async () => {
    const json = '{"user": {"id": 1, "name": "John"}}';
    const reader = createJSONReadableStreamDefaultReader(json, 4);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const user of parser.watchComplete('/user')) {
      results.push(user);
    }
    
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ id: 1, name: "John" });
  });

  it("should handle complex nested structures", async () => {
    const json = JSON.stringify({
      data: {
        posts: [
          { id: 1, title: "Post 1", comments: [{ text: "Great!" }, { text: "Nice!" }] },
          { id: 2, title: "Post 2", comments: [{ text: "Awesome!" }] }
        ]
      }
    });
    
    const reader = createJSONReadableStreamDefaultReader(json, 10);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const post of parser.watchComplete('/data/posts/*')) {
      results.push(post);
    }
    
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 1,
      title: "Post 1",
      comments: [{ text: "Great!" }, { text: "Nice!" }]
    });
    expect(results[1]).toEqual({
      id: 2,
      title: "Post 2",
      comments: [{ text: "Awesome!" }]
    });
  });

  it("should extract nested array elements", async () => {
    const json = '{"posts": [{"comments": [{"id": 1}, {"id": 2}]}, {"comments": [{"id": 3}]}]}';
    const reader = createJSONReadableStreamDefaultReader(json, 6);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const comment of parser.watchComplete('/posts/*/comments/*')) {
      results.push(comment);
    }
    
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
    expect(results[2]).toEqual({ id: 3 });
  });

  it("should handle non-existent paths gracefully", async () => {
    const json = '{"items": [{"id": 1}, {"id": 2}]}';
    const reader = createJSONReadableStreamDefaultReader(json, 5);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const item of parser.watchComplete('/nonexistent/*')) {
      results.push(item);
    }
    
    expect(results).toHaveLength(0);
  });

  it("should handle large JSON data", async () => {
    const largeArray = Array.from({ length: 100 }, (_, i) => ({ 
      id: i, 
      name: `Item ${i}`,
      metadata: { created: `2023-01-${String((i % 30) + 1).padStart(2, '0')}` }
    }));
    const json = JSON.stringify({ items: largeArray });
    
    const reader = createJSONReadableStreamDefaultReader(json, 50);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const item of parser.watchComplete('/items/*')) {
      results.push(item);
    }
    
    expect(results).toHaveLength(100);
    expect(results[0]).toEqual({ 
      id: 0, 
      name: "Item 0", 
      metadata: { created: "2023-01-01" } 
    });
    expect(results[99]).toEqual({ 
      id: 99, 
      name: "Item 99", 
      metadata: { created: "2023-01-10" } 
    });
  });

  it("should handle mixed data types in arrays", async () => {
    const json = '{"mixed": [1, "string", {"obj": true}, [1, 2, 3], null]}';
    const reader = createJSONReadableStreamDefaultReader(json, 4);
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    for await (const item of parser.watchComplete('/mixed/*')) {
      results.push(item);
    }
    
    expect(results).toHaveLength(5);
    expect(results[0]).toBe(1);
    expect(results[1]).toBe("string");
    expect(results[2]).toEqual({ obj: true });
    expect(results[3]).toEqual([1, 2, 3]);
    expect(results[4]).toBeNull();
  });
});