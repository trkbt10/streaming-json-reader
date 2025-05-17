# Incremental JSON Parser

This repository provides an example implementation of a streaming JSON parser
that can consume partial JSON data and yield immutable snapshots of the object
as more data arrives. It is useful when working with APIs that return JSON in a
streaming manner, such as OpenAI's structured output.

## Installation

Install the package directly from GitHub:

```bash
npm install github:trkbt10/incremental-json-parser
```

## Usage

```typescript
import { incrementalJsonParser } from "@trkbt10/incremental-json-parser";
import { Readable } from "stream";

async function main() {
  const data = '{"foo":1,"bar":[{"baz":2},3]}';
  const chunks = [data.slice(0, 5), data.slice(5, 10), data.slice(10)];
  const stream = Readable.from(chunks.map((c) => Buffer.from(c)));
  const reader = stream[Symbol.asyncIterator]();

  for await (const obj of incrementalJsonParser({
    async read() {
      const r = await reader.next();
      if (r.done) return { done: true };
      return { done: false, value: r.value };
    },
  })) {
    console.log(obj);
  }
}

main();
```

## OpenAI Streaming Example

The following example shows how to parse an incremental JSON response
from the OpenAI API using the library:

```typescript
import { incrementalJsonParser } from "@trkbt10/incremental-json-parser";
import type { JSONSchemaType } from "ajv";
import type OpenAI from "openai";

export async function* structuredRequestStream<T extends object>(
  client: OpenAI,
  request: OpenAI.Chat.ChatCompletionCreateParamsStreaming,
  structure: {
    name: string;
    description?: string;
    schema: JSONSchemaType<T>;
  },
) {
  const res = await client.chat.completions.create({
    ...request,
    stream: true,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: structure.name,
        description: structure.description,
        schema: structure.schema,
      },
    },
    messages: request.messages,
  });

  const decoder = new TextDecoder("utf-8");
  // Reader for OpenAI's streaming response
  const chunkReader = res.toReadableStream().getReader();
  // Reader that feeds incremental JSON data to the parser
  const jsonReader = new ReadableStream({
    async pull(controller) {
      const { done, value } = await chunkReader.read();
      if (done) {
        controller.close();
        return;
      }
      const text = decoder.decode(value);
      const parsed = JSON.parse(text);
      if (parsed.choices) {
        const firstChoice = parsed.choices[0];
        controller.enqueue(firstChoice.delta?.content ?? "");
      }
    },
  });

  const parser = incrementalJsonParser(jsonReader.getReader());
  for await (const chunk of parser) {
    yield chunk;
  }
}
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
