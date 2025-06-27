import { describe, it, expect } from "vitest";
import { JSONPointerParser } from "./json-pointer-parser";
import { isComplete } from "./utils/completeness-checker";

describe("JSONPointerParser", () => {
  describe("parsePointer", () => {
    it("should parse simple paths", () => {
      const parser = new JSONPointerParser("/items");
      expect(parser["parsedPath"]).toEqual(["items"]);
    });

    it("should parse nested paths", () => {
      const parser = new JSONPointerParser("/data/users/0/name");
      expect(parser["parsedPath"]).toEqual(["data", "users", "0", "name"]);
    });

    it("should handle empty pointer", () => {
      const parser = new JSONPointerParser("");
      expect(parser["parsedPath"]).toEqual([]);
    });

    it("should handle root pointer", () => {
      const parser = new JSONPointerParser("/");
      expect(parser["parsedPath"]).toEqual([""]);
    });

    it("should decode escape sequences", () => {
      const parser = new JSONPointerParser("/foo~1bar/baz~0qux");
      expect(parser["parsedPath"]).toEqual(["foo/bar", "baz~qux"]);
    });

    it("should throw error for invalid pointer", () => {
      expect(() => new JSONPointerParser("invalid")).toThrow(
        'JSON Pointer must start with "/" or be empty'
      );
    });
  });

  describe("extractValues", () => {
    const testData = {
      items: [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ],
      metadata: {
        count: 3,
        tags: ["a", "b", "c"],
      },
    };

    it("should extract array elements with wildcard", () => {
      const parser = new JSONPointerParser("/items/*");
      const values = parser.extractValues(testData);

      expect(values).toHaveLength(3);
      expect(values[0]).toEqual({ id: 1, name: "Item 1" });
      expect(values[1]).toEqual({ id: 2, name: "Item 2" });
      expect(values[2]).toEqual({ id: 3, name: "Item 3" });
    });

    it("should extract specific array element", () => {
      const parser = new JSONPointerParser("/items/1");
      const values = parser.extractValues(testData);

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual({ id: 2, name: "Item 2" });
    });

    it("should extract nested values", () => {
      const parser = new JSONPointerParser("/items/*/name");
      const values = parser.extractValues(testData);

      expect(values).toEqual(["Item 1", "Item 2", "Item 3"]);
    });

    it("should extract object properties", () => {
      const parser = new JSONPointerParser("/metadata/count");
      const values = parser.extractValues(testData);

      expect(values).toEqual([3]);
    });

    it("should handle missing paths", () => {
      const parser = new JSONPointerParser("/nonexistent/path");
      const values = parser.extractValues(testData);

      expect(values).toEqual([]);
    });

    it("should handle partial data", () => {
      const partialData = {
        items: [
          { id: 1 }, // Missing 'name'
          undefined, // Undefined element
          { id: 3, name: "Item 3" },
        ],
      };

      const parser = new JSONPointerParser("/items/*");
      const values = parser.extractValues(partialData);

      expect(values).toHaveLength(2);
      expect(values[0]).toEqual({ id: 1 });
      expect(values[1]).toEqual({ id: 3, name: "Item 3" });
    });
  });

  describe("getNewCompletedValues", () => {
    it("should track newly completed array items (default behavior)", () => {
      const parser = new JSONPointerParser("/items/*");

      // First update: one complete item
      const data1 = {
        items: [
          { id: 1, name: "Item 1" },
          { id: 2 }, // Complete because all present fields have values
        ],
      };

      const values1 = parser.getNewCompletedValues(data1);
      // Note: { id: 2 } is considered complete because all present fields have values
      expect(values1).toHaveLength(2);
      expect(values1[0]).toEqual({ id: 1, name: "Item 1" });
      expect(values1[1]).toEqual({ id: 2 });

      // Second update: add a third item
      const data2 = {
        items: [
          { id: 1, name: "Item 1" },
          { id: 2 },
          { id: 3, name: "Item 3" }, // New complete item
        ],
      };

      const values2 = parser.getNewCompletedValues(data2);
      expect(values2).toHaveLength(1);
      expect(values2[0]).toEqual({ id: 3, name: "Item 3" });

      // Third update: no new complete items
      const values3 = parser.getNewCompletedValues(data2);
      expect(values3).toHaveLength(0);
    });

    it("should track newly completed array items with structural completion option", () => {
      const parser = new JSONPointerParser("/items/*", { waitForStructuralCompletion: true });

      // First update: one complete item
      const data1 = {
        items: [
          { id: 1, name: "Item 1" },
          { id: 2 }, // Incomplete - missing required fields
        ],
      };

      // Without marking structures as closed, should return empty
      const values1 = parser.getNewCompletedValues(data1);
      expect(values1).toHaveLength(0);

      // Mark structures as closed to indicate they are structurally complete
      parser.markStructureClosed(data1.items[0]);
      parser.markStructureClosed(data1.items[1]);
      parser.markStructureClosed(data1.items);
      parser.markStructureClosed(data1);

      const values2 = parser.getNewCompletedValues(data1);
      expect(values2).toHaveLength(2);
      expect(values2[0]).toEqual({ id: 1, name: "Item 1" });
      expect(values2[1]).toEqual({ id: 2 });
    });

    it("should handle deeply nested completion (default behavior)", () => {
      const parser = new JSONPointerParser("/data/users/*");

      const data1 = {
        data: {
          users: [
            { profile: { name: "Alice", age: 30 } },
            { profile: { name: "Bob" } }, // This is still complete (all present fields have values)
          ],
        },
      };

      const values1 = parser.getNewCompletedValues(data1);
      expect(values1).toHaveLength(2);
      expect(values1[0]).toEqual({ profile: { name: "Alice", age: 30 } });
      expect(values1[1]).toEqual({ profile: { name: "Bob" } });

      const data2 = {
        data: {
          users: [
            { profile: { name: "Alice", age: 30 } },
            { profile: { name: "Bob" } },
            { profile: { name: "Charlie", age: 35 } }, // New user
          ],
        },
      };

      const values2 = parser.getNewCompletedValues(data2);
      expect(values2).toHaveLength(1);
      expect(values2[0]).toEqual({ profile: { name: "Charlie", age: 35 } });
    });

    it("should handle deeply nested completion with structural completion", () => {
      const parser = new JSONPointerParser("/data/users/*", { waitForStructuralCompletion: true });

      const data1 = {
        data: {
          users: [
            { profile: { name: "Alice", age: 30 } },
            { profile: { name: "Bob" } },
          ],
        },
      };

      // Without marking structures as closed, should return empty
      const values1 = parser.getNewCompletedValues(data1);
      expect(values1).toHaveLength(0);

      // Mark all nested structures as closed
      parser.markStructureClosed(data1.data.users[0].profile);
      parser.markStructureClosed(data1.data.users[0]);
      parser.markStructureClosed(data1.data.users[1].profile);
      parser.markStructureClosed(data1.data.users[1]);
      parser.markStructureClosed(data1.data.users);
      parser.markStructureClosed(data1.data);
      parser.markStructureClosed(data1);

      const values2 = parser.getNewCompletedValues(data1);
      expect(values2).toHaveLength(2);
      expect(values2[0]).toEqual({ profile: { name: "Alice", age: 30 } });
      expect(values2[1]).toEqual({ profile: { name: "Bob" } });
    });
  });

  describe("isComplete utility", () => {
    it("should recognize primitive values as complete", () => {
      expect(isComplete("string")).toBe(true);
      expect(isComplete(123)).toBe(true);
      expect(isComplete(true)).toBe(true);
      expect(isComplete(null)).toBe(false);
      expect(isComplete(undefined)).toBe(false);
    });

    it("should recognize complete objects", () => {
      expect(isComplete({ a: 1, b: "test" })).toBe(true);
      expect(isComplete({ a: 1, b: undefined })).toBe(false);
    });

    it("should recognize complete arrays", () => {
      expect(isComplete([1, 2, 3])).toBe(true);
      expect(isComplete([1, undefined, 3])).toBe(true); // Sparse arrays are ok
      expect(isComplete([{ a: 1 }, { b: undefined }])).toBe(false);
    });

    it("should handle nested structures", () => {
      expect(
        isComplete({
          a: { b: { c: 1 } },
          d: [1, 2, { e: "test" }],
        })
      ).toBe(true);

      expect(
        isComplete({
          a: { b: { c: undefined } },
          d: [1, 2, 3],
        })
      ).toBe(false);
    });
  });
});
