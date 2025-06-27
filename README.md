# Streaming JSON Reader

A streaming JSON parser that lets you process large JSON responses without waiting for completion. Parse data as it arrives and extract specific values using JSON Pointers. Includes specialized support for Server-Sent Events (SSE) with nested JSON content.

## Use Cases

Suitable for:

- **AI/LLM Streaming**: OpenAI, Anthropic, and other LLM APIs that stream JSON responses
- **Large Dataset Processing**: Handle large JSON files incrementally
- **Real-time APIs**: Process live data feeds and event streams
- **Server-Sent Events**: Parse SSE streams with nested JSON content
- **Progressive Loading**: Start processing data before the response completes
- **Memory Optimization**: Reduce memory usage for large JSON responses

## Features

- **Streaming JSON Parser**: Parse JSON as it arrives
- **JSON Pointer Support**: Extract specific paths using RFC 6901 syntax
- **SSE Integration**: Server-Sent Events support with configurable extractors
- **TypeScript**: Type definitions included
- **Memory Efficient**: Incremental processing to reduce memory usage
- **No Runtime Dependencies**: No external dependencies required
- **Cross-platform**: Works in browsers and Node.js
- **Pre-built Extractors**: Common API configurations included

## Installation

```bash
npm install streaming-json-reader
```

## Quick Start

### Basic Incremental Parsing

```typescript
import { incrementalJsonParser } from "streaming-json-reader";

// Parse JSON data as it arrives
const response = await fetch("https://api.example.com/data");
const reader = response.body!.getReader();

for await (const partialData of incrementalJsonParser(reader)) {
  console.log("Current state:", partialData);
}
```

### Streaming with JSON Pointers

```typescript
import { StreamingJsonParser } from "streaming-json-reader";

const response = await fetch("https://api.example.com/users");
const reader = response.body!.getReader();
const parser = new StreamingJsonParser(reader);

// Extract specific data using JSON Pointers as data arrives
for await (const user of parser.watch("/users/*")) {
  console.log("New user:", user);
}

// Or wait for complete data
for await (const user of parser.watchComplete("/users/*")) {
  console.log("Complete user:", user);
}
```

### SSE JSON Streaming (OpenAI, Anthropic, etc.)

```typescript
import { createSSEJsonStreamingParser, SSEJsonExtractors } from "streaming-json-reader";

// OpenAI ChatCompletions streaming
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [{ role: "user", content: "Tell me a story" }],
    stream: true,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_response",
        schema: {
          type: "object",
          properties: { story: { type: "string" } },
          required: ["story"],
          additionalProperties: false
        }
      }
    }
  }),
});

const parser = createSSEJsonStreamingParser(response.body!, SSEJsonExtractors.openAIChatCompletions);

// Watch for complete story as it's assembled from fragments
for await (const story of parser.watchComplete("/story")) {
  console.log("Complete story:", story);
}
```

## API Reference

### Core Functions

#### `incrementalJsonParser(reader)`

Core function that yields partial JSON objects as they are parsed.

**Parameters:**
- `reader: ReadableStreamDefaultReader<string | Uint8Array>` - Stream reader

**Returns:** `AsyncGenerator<DeepPartial<T>, void, unknown>`

### `StreamingJsonParser<T>`

Class for advanced streaming with JSON Pointer support.

**Constructor:**
```typescript
new StreamingJsonParser<T>(reader: ReadableStreamDefaultReader<string | Uint8Array>)
```

**Methods:**

#### `watch(pointer: string, options?)`
Monitor a JSON Pointer path and yield values as they become available (immediate completion).

```typescript
// Watch array elements as they're parsed
for await (const item of parser.watch("/items/*")) {
  console.log("Item:", item);
}

// Watch nested properties
for await (const name of parser.watch("/users/*/name")) {
  console.log("Name:", name);
}
```

#### `watchComplete(pointer: string)`
Monitor a JSON Pointer path and yield values only when structurally complete.

```typescript
// Wait for complete objects after entire stream finishes
for await (const item of parser.watchComplete("/items/*")) {
  console.log("Complete item:", item);
}
```

#### `observe(pointer: string, options?)`
Alias for `watch()`. Same functionality.

#### `select(pointer: string, options?)`
Alias for `watch()`. Same functionality.

#### `readPartial()`
Get all incremental updates as they arrive.

```typescript
for await (const partial of parser.readPartial()) {
  console.log("Current state:", partial);
}
```

#### `getFullResponse()`
Get the complete response after streaming finishes.

```typescript
const fullData = await parser.getFullResponse();
```

#### `getCurrentSnapshot()`
Get the current partial state.

```typescript
const current = parser.getCurrentSnapshot();
```

### SSE JSON Streaming

#### `createSSEJsonStreamingParser(sseStream, options)`

Creates a StreamingJsonParser from an SSE stream with configurable JSON content extraction.

**Parameters:**
- `sseStream: ReadableStream<Uint8Array>` - SSE stream
- `options: SSEJsonExtractorOptions` - Extraction configuration

**Returns:** `StreamingJsonParser`

```typescript
// Custom extractor
const parser = createSSEJsonStreamingParser(stream, {
  extractContent: (chunk) => chunk.data?.content || null,
  shouldEnd: (chunk) => chunk.type === 'done'
});
```

#### `SSEJsonExtractors`

Pre-built extractors for common APIs:

```typescript
// OpenAI ChatCompletions
SSEJsonExtractors.openAIChatCompletions

// Anthropic Claude (example)
SSEJsonExtractors.anthropicClaude

// Generic format
SSEJsonExtractors.generic
```

#### `SSEJsonExtractorOptions`

Configuration interface for content extraction:

```typescript
interface SSEJsonExtractorOptions {
  extractContent: (sseMessage: any) => string | null;
  shouldEnd?: (sseMessage: any) => boolean;
}
```

## JSON Pointer Syntax

Supports RFC 6901 JSON Pointer syntax:

```typescript
""           // Root object
"/users"     // Property 'users'
"/users/0"   // First element in users array
"/users/*"   // All elements in users array (wildcard)
"/users/*/name"  // Name property of all users
"/data/items/*/price"  // Price of all items
```

## Examples

### Processing Large JSON Arrays

```typescript
import { StreamingJsonParser } from "streaming-json-reader";

const response = await fetch("/api/large-dataset");
const parser = new StreamingJsonParser(response.body!.getReader());

// Process items incrementally
for await (const item of parser.watch("/data/*")) {
  if (item.status === "error") {
    console.log("Error item:", item.id);
  }
}
```

### Real-time Data Processing

```typescript
import { StreamingJsonParser } from "streaming-json-reader";

const response = await fetch("/api/live-feed");
const parser = new StreamingJsonParser(response.body!.getReader());

// Process events as they arrive
for await (const event of parser.watch("/events/*")) {
  switch (event.type) {
    case "user_action":
      handleUserAction(event);
      break;
    case "system_alert":
      handleAlert(event);
      break;
  }
}
```

### OpenAI Streaming with JSON Schema

```typescript
import { createSSEJsonStreamingParser, SSEJsonExtractors } from "streaming-json-reader";

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [{ role: "user", content: "Write a short story" }],
    stream: true,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "story_response",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            genre: { type: "string" }
          },
          required: ["title", "content", "genre"],
          additionalProperties: false
        }
      }
    }
  }),
});

const parser = createSSEJsonStreamingParser(response.body!, SSEJsonExtractors.openAIChatCompletions);

// Watch specific fields as they complete
for await (const title of parser.watchComplete("/title")) {
  console.log("Story title:", title);
}

for await (const content of parser.watchComplete("/content")) {
  console.log("Story content:", content);
}
```

### Custom SSE Format

```typescript
import { createSSEJsonStreamingParser } from "streaming-json-reader";

// For custom APIs that send different SSE formats
const customExtractor = {
  extractContent: (chunk) => {
    // Extract from your custom format
    if (chunk.event === "data" && chunk.payload?.text) {
      return chunk.payload.text;
    }
    return null;
  },
  shouldEnd: (chunk) => {
    return chunk.event === "complete";
  }
};

const parser = createSSEJsonStreamingParser(response.body!, customExtractor);

for await (const result of parser.watchComplete("/result")) {
  console.log("Final result:", result);
}
```

### Server-Sent Events (SSE) Utilities

```typescript
import { parseSSEStream, parseSSEMessages } from "streaming-json-reader";

// Parse raw SSE messages
const response = await fetch("/api/events");
const jsonStream = parseSSEStream(response.body!);
const reader = jsonStream.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const data = JSON.parse(value);
  console.log("Parsed data:", data);
}

// Or parse into SSE message objects
const messageStream = parseSSEMessages(response.body!);
const messageReader = messageStream.getReader();

while (true) {
  const { done, value } = await messageReader.read();
  if (done) break;
  
  console.log("Event:", value.event, "Data:", value.data, "ID:", value.id);
}
```

## TypeScript Support

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse {
  users: User[];
  total: number;
}

const parser = new StreamingJsonParser<ApiResponse>(reader);

// Type-safe iteration
for await (const user of parser.watch("/users/*")) {
  // user is typed as User
  console.log(user.name, user.email);
}
```

## Demo Examples

Run interactive demos:

```bash
# Install dependencies
npm install

# Run demos
npx tsx demo/cli.ts
```

Available demos:
- Basic incremental parsing
- JSON Pointer usage  
- OpenAI streaming with JSON schema
- Custom SSE format handling
- Nested data extraction
- Performance examples
- Unicode text support

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode  
npm run test:watch

# Build
npm run build

# Run type checking
npm run type-check

# Run demos
npx tsx demo/cli.ts

# Run specific demo
npx tsx demo/openai-request.ts  # (requires .env with OPENAI_API_KEY)
```

## License

UNLICENSED