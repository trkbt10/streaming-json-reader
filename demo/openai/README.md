# OpenAI Streaming Demos

This directory contains demonstrations of streaming JSON parsing with OpenAI APIs using the `streaming-json-reader` library.

## Setup

1. **Get an OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new API key

2. **Set Environment Variables**
   ```bash
   export OPENAI_API_KEY='your-api-key-here'
   export OPENAI_MODEL='gpt-4o-mini'  # Optional, defaults to gpt-4o-mini
   ```

3. **Or create a .env file**
   ```bash
   cp ../../.env.example ../../.env
   # Edit .env with your API key
   ```

## Available Demos

### 1. Chat Completions (`chat-completions.ts`)

Demonstrates streaming chat completions with structured JSON output:

- **Story Generation**: Creates structured stories with text and emotions
- **Real-time Streaming**: Watch items appear as they're generated
- **Completion Watching**: Wait for fully formed items
- **Error Handling**: Robust error handling and setup guidance

```bash
npx tsx demo/openai/chat-completions.ts
```

**Features:**
- Uses `ObjectStreamExtractors.openAIChatCompletions`
- JSON Schema with strict mode
- Type-safe story items with emotions
- Demonstrates both `watch()` and `watchComplete()` methods

### 2. Agent Responses (`responses.ts`)

Demonstrates agent-like behavior with step-by-step reasoning:

- **Step-by-step Analysis**: Agent breaks down complex problems
- **Real-time Thinking**: Stream reasoning steps as they arrive
- **Confidence Levels**: Optional confidence scoring for each step
- **Multiple Scenarios**: Business analysis and debugging sessions

```bash
npx tsx demo/openai/responses.ts
```

**Features:**
- Agent-style JSON schema with reasoning steps
- Real-time partial response streaming
- Different step types (reasoning, action, observation, answer)
- Live debugging session simulation

## Interactive Demo Runner

Use the interactive demo runner to select and run demos:

```bash
npx tsx demo/openai/index.ts
```

Or run a specific demo by number:

```bash
npx tsx demo/openai/index.ts 1  # Chat Completions
npx tsx demo/openai/index.ts 2  # Agent Responses
```

## Code Structure

```
demo/openai/
├── index.ts              # Interactive demo runner
├── chat-completions.ts   # Basic chat completions streaming
├── responses.ts          # Agent-style response streaming
└── README.md            # This file
```

## Key Concepts Demonstrated

### ObjectStreamExtractors

All demos use `ObjectStreamExtractors.openAIChatCompletions` which extracts content from OpenAI's parsed response objects:

```typescript
import { createObjectStreamingParser, ObjectStreamExtractors } from "../../src/index";

const parser = createObjectStreamingParser(
  response, // OpenAI AsyncIterable<ChatCompletionChunk>
  ObjectStreamExtractors.openAIChatCompletions
);
```

### JSON Schema Integration

Demos show how to use OpenAI's JSON Schema feature for structured output:

```typescript
response_format: {
  type: "json_schema",
  json_schema: {
    name: "story_response",
    schema: { /* your schema */ },
    strict: true
  }
}
```

### Streaming Patterns

- **`watch()`**: Get items as they become available
- **`watchComplete()`**: Wait for structurally complete items
- **`readPartial()`**: Monitor the entire parsing process

### Type Safety

All demos include TypeScript interfaces for response structures:

```typescript
interface StoryItem {
  text: string;
  emotion: "happy" | "sad" | "angry" | "surprised" | "neutral";
}

interface AgentStep {
  type: "reasoning" | "action" | "observation" | "answer";
  content: string;
  confidence?: number;
}
```

## Cost Optimization

All demos use `gpt-4o-mini` by default (configurable via `OPENAI_MODEL`) to minimize API costs while demonstrating functionality.

## Troubleshooting

### Common Issues

1. **Missing API Key**
   ```
   ⚠️ OPENAI_API_KEY environment variable not found
   ```
   Solution: Set your API key as shown in the setup section.

2. **Invalid Model**
   ```
   Error: The model 'xyz' does not exist
   ```
   Solution: Use a valid model like `gpt-4o-mini` or `gpt-4`.

3. **Rate Limits**
   ```
   Error: Rate limit exceeded
   ```
   Solution: Wait a moment and try again, or upgrade your OpenAI plan.

### Debug Mode

Set `DEBUG=1` for more verbose output:

```bash
DEBUG=1 npx tsx demo/openai/chat-completions.ts
```