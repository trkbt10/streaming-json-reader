/**
 * Common type definitions for incremental-json-parser
 */

/**
 * Represents a deeply partial version of type T, where all properties are optional
 * and nested objects/arrays are also deeply partial.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P];
};

/**
 * Context type for parsing JSON structures
 */
export type ContextType = "object" | "array";

/**
 * Parser state for tracking position within JSON structure
 */
export type ContextState =
  | "expectKeyOrEnd"
  | "expectKey"
  | "expectColon"
  | "expectValue"
  | "expectValueOrEnd"
  | "expectCommaOrEnd";

/**
 * Parser state types
 */
export type ParserState = "default" | "string" | "number" | "literal";

/**
 * JSON value types
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

/**
 * Stream reader type that can contain either string or binary data
 */
export type StreamChunk = Uint8Array | string;