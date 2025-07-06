import { describe, it, expect, vi } from "vitest";
import { StreamingJsonParser } from "./streaming-json-parser";
import { createJSONReadableStreamDefaultReader } from "./utils/test-helpers/create-json-readable-stream-default-reader";

describe("StreamingJsonParser selector API", () => {
  describe("select() method", () => {
    it("should select root object", async () => {
      const json = '{"name": "test", "value": 42}';
      const reader = createJSONReadableStreamDefaultReader(json, 5);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].path).toBe('');
      expect(nodes[0].type).toBe('object');
    });

    it("should select array elements with wildcard", async () => {
      const json = '{"items": [1, 2, 3]}';
      const reader = createJSONReadableStreamDefaultReader(json, 4);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('/items/*')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(3);
      expect(nodes[0].path).toBe('/items/0');
      expect(nodes[1].path).toBe('/items/1');
      expect(nodes[2].path).toBe('/items/2');
    });

    it("should select nested objects", async () => {
      const json = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
      const reader = createJSONReadableStreamDefaultReader(json, 6);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('/users/*/name')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(2);
      expect(nodes[0].path).toBe('/users/0/name');
      expect(nodes[1].path).toBe('/users/1/name');
    });

    it("should handle empty arrays", async () => {
      const json = '{"items": []}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('/items/*')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(0);
    });

    it("should handle non-existent paths", async () => {
      const json = '{"foo": "bar"}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('/missing')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(0);
    });
  });

  describe("querySelector() method", () => {
    it("should return first matching node", async () => {
      const json = '{"items": [1, 2, 3]}';
      const reader = createJSONReadableStreamDefaultReader(json, 4);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/items/*');
      
      expect(node).toBeDefined();
      expect(node?.path).toBe('/items/0');
    });

    it("should return null for non-existent path", async () => {
      const json = '{"foo": "bar"}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/missing');
      
      expect(node).toBeNull();
    });
  });

  describe("StreamingJsonNode AsyncIterator", () => {
    it("should iterate primitive values", async () => {
      const json = '{"value": 42}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/value');
      expect(node).toBeDefined();
      
      const values: any[] = [];
      for await (const { value, done } of node!) {
        values.push({ value, done });
      }
      
      expect(values).toHaveLength(1);
      expect(values[0]).toEqual({ value: 42, done: true });
    });

    it("should iterate string values", async () => {
      const json = '{"message": "Hello, World!"}';
      const reader = createJSONReadableStreamDefaultReader(json, 5);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/message');
      const values: any[] = [];
      
      for await (const { value } of node!) {
        values.push(value);
      }
      
      expect(values).toEqual(["Hello, World!"]);
    });

    it("should iterate array values", async () => {
      const json = '{"numbers": [1, 2, 3]}';
      const reader = createJSONReadableStreamDefaultReader(json, 4);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/numbers');
      const values: any[] = [];
      
      for await (const { value, done } of node!) {
        values.push({ value, done });
      }
      
      // Should yield the complete array
      expect(values).toHaveLength(1);
      expect(values[0].value).toEqual([1, 2, 3]);
      expect(values[0].done).toBe(true);
    });

    it("should iterate object values", async () => {
      const json = '{"user": {"name": "Alice", "age": 30}}';
      const reader = createJSONReadableStreamDefaultReader(json, 6);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/user');
      const values: any[] = [];
      
      for await (const { value, done } of node!) {
        values.push({ value, done });
      }
      
      expect(values).toHaveLength(1);
      expect(values[0].value).toEqual({ name: "Alice", age: 30 });
      expect(values[0].done).toBe(true);
    });

    it("should handle mixed array example from requirements", async () => {
      const json = '{"mixed": [1, "string", {"obj": true}, [1, 2, 3], null]}';
      const reader = createJSONReadableStreamDefaultReader(json, 4);
      const parser = new StreamingJsonParser(reader);
      
      const allValues: any[] = [];
      
      for await (const node of parser.select('/mixed/*')) {
        for await (const { value } of node) {
          allValues.push(value);
        }
      }
      
      expect(allValues).toEqual([1, "string", {"obj": true}, [1, 2, 3], null]);
    });

    it("should support streaming partial updates", async () => {
      const json = '{"data": {"nested": {"value": "streaming"}}}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/data');
      const updates: any[] = [];
      
      for await (const { value, done } of node!) {
        updates.push({ value: JSON.parse(JSON.stringify(value)), done });
      }
      
      // Should show progressive building of the object
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1].done).toBe(true);
      expect(updates[updates.length - 1].value).toEqual({
        nested: { value: "streaming" }
      });
    });
  });

  describe("StreamingJsonNode methods", () => {
    it("should support getValue() for immediate access", async () => {
      const json = '{"value": 42}';
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/value');
      const value = await node!.getValue();
      
      expect(value).toBe(42);
    });

    it("should support nested select()", async () => {
      const json = '{"users": [{"profile": {"name": "Alice"}}, {"profile": {"name": "Bob"}}]}';
      const reader = createJSONReadableStreamDefaultReader(json, 8);
      const parser = new StreamingJsonParser(reader);
      
      const userNodes: any[] = [];
      for await (const userNode of parser.select('/users/*')) {
        for await (const profileNode of userNode.select('/profile')) {
          userNodes.push(profileNode);
        }
      }
      
      expect(userNodes).toHaveLength(2);
      expect(userNodes[0].path).toBe('/users/0/profile');
      expect(userNodes[1].path).toBe('/users/1/profile');
    });

    it("should detect node types correctly", async () => {
      const json = '{"obj": {}, "arr": [], "str": "text", "num": 42, "bool": true, "nil": null}';
      const reader = createJSONReadableStreamDefaultReader(json, 10);
      const parser = new StreamingJsonParser(reader);
      
      const objNode = await parser.querySelector('/obj');
      const arrNode = await parser.querySelector('/arr');
      const strNode = await parser.querySelector('/str');
      const numNode = await parser.querySelector('/num');
      const boolNode = await parser.querySelector('/bool');
      const nilNode = await parser.querySelector('/nil');
      
      expect(objNode?.type).toBe('object');
      expect(arrNode?.type).toBe('array');
      expect(strNode?.type).toBe('primitive');
      expect(numNode?.type).toBe('primitive');
      expect(boolNode?.type).toBe('primitive');
      expect(nilNode?.type).toBe('primitive');
    });
  });

  describe("querySelectorAll() alias", () => {
    it("should work as an alias for select()", async () => {
      const json = '{"items": [1, 2, 3]}';
      const reader = createJSONReadableStreamDefaultReader(json, 4);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.querySelectorAll('/items/*')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("should handle deeply nested structures", async () => {
      const json = '{"a": {"b": {"c": {"d": {"e": "deep"}}}}}';
      const reader = createJSONReadableStreamDefaultReader(json, 5);
      const parser = new StreamingJsonParser(reader);
      
      const node = await parser.querySelector('/a/b/c/d/e');
      const value = await node!.getValue();
      
      expect(value).toBe("deep");
    });

    it("should handle large arrays", async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i);
      const json = JSON.stringify({ items: largeArray });
      const reader = createJSONReadableStreamDefaultReader(json, 20);
      const parser = new StreamingJsonParser(reader);
      
      const nodes: any[] = [];
      for await (const node of parser.select('/items/*')) {
        nodes.push(node);
      }
      
      expect(nodes).toHaveLength(100);
    });

    it("should handle unicode properly", async () => {
      const json = '{"emoji": "🎉", "japanese": "こんにちは"}';
      const reader = createJSONReadableStreamDefaultReader(json, 5);
      const parser = new StreamingJsonParser(reader);
      
      const emojiNode = await parser.querySelector('/emoji');
      const japaneseNode = await parser.querySelector('/japanese');
      
      expect(await emojiNode!.getValue()).toBe("🎉");
      expect(await japaneseNode!.getValue()).toBe("こんにちは");
    });

    it("should handle errors gracefully", async () => {
      const json = '{"broken": '; // Incomplete JSON
      const reader = createJSONReadableStreamDefaultReader(json, 3);
      const parser = new StreamingJsonParser(reader);
      
      await expect(async () => {
        for await (const node of parser.select('/broken')) {
          // Should throw before yielding anything
        }
      }).rejects.toThrow();
    });
  });
});