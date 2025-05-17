# Incremental JSON Parser

This repository provides an example implementation of a streaming JSON parser
that can consume partial JSON data and yield immutable snapshots of the object
as more data arrives.  It is useful when working with APIs that return JSON in a
streaming manner, such as OpenAI's structured output.

## Usage

```typescript
import { incrementalJsonParser } from './dist/incremental-json-parser.es.js';
import { Readable } from 'stream';

async function main() {
  const data = '{"foo":1,"bar":[{"baz":2},3]}';
  const chunks = [data.slice(0,5), data.slice(5,10), data.slice(10)];
  const stream = Readable.from(chunks.map(c => Buffer.from(c)));
  const reader = stream[Symbol.asyncIterator]();

  for await (const obj of incrementalJsonParser({
    async read() {
      const r = await reader.next();
      if (r.done) return { done: true };
      return { done: false, value: r.value };
    }
  })) {
    console.log(obj);
  }
}

main();
```

## Development

Install dependencies and run tests:

```bash
npm install
npm test
```

Build the library:

```bash
npm run build
```

The parser reads from an object implementing the same interface as
`ReadableStreamDefaultReader` and yields each time the root object is updated.
