# Streaming JSON Reader

A streaming JSON parser that lets you process large JSON responses without waiting for completion. Parse data as it arrives and extract specific values using JSON Pointers.

## Installation

```bash
npm install streaming-json-reader
```

## Usage

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

// Extract specific data using JSON Pointers
for await (const user of parser.watch("/users/*")) {
  console.log("New user:", user);
}

// Get complete response when finished
const fullData = await parser.getFullResponse();
```

## API Reference

### `incrementalJsonParser(reader)`

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

#### `watch(pointer: string)`
Monitor a JSON Pointer path and yield values as they complete.

```typescript
// Watch array elements
for await (const item of parser.watch("/items/*")) {
  console.log("Item:", item);
}

// Watch nested properties
for await (const name of parser.watch("/users/*/name")) {
  console.log("Name:", name);
}
```

#### `observe(pointer: string)`
Alias for `watch()`. Same functionality.

#### `select(pointer: string)`
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

## Server-Sent Events (SSE) Support

```typescript
import { parseSSEStream, createSSEStreamingParser } from "streaming-json-reader";

// Parse SSE stream
const response = await fetch("/api/events");
for await (const message of parseSSEStream(response.body!.getReader())) {
  console.log("Event:", message.event, "Data:", message.data);
}

// Parse JSON data from SSE
const parser = createSSEStreamingParser(response.body!.getReader());
for await (const data of parser.watch("/items/*")) {
  console.log("Item:", data);
}
```

## Examples

### Processing Large JSON Arrays

```typescript
import { StreamingJsonParser } from "streaming-json-reader";

const response = await fetch("/api/large-dataset");
const parser = new StreamingJsonParser(response.body!.getReader());

// Process items one by one without loading entire response
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
npx tsx demo/cli.ts
```

Available demos:
- Basic incremental parsing
- JSON Pointer usage
- OpenAI-style streaming
- Nested data extraction
- Performance testing
- Unicode support
- SSE stream processing

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Run demos
npx tsx demo/cli.ts
```

## License

UNLICENSED