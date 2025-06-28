import { createObjectStreamingParser, ObjectStreamExtractors } from "./index";
import type { ChatCompletionChunk } from "openai/resources/index.mjs";

// Define the expected story structure
interface StoryItem {
  text: string;
  emotion: "happy" | "sad" | "angry" | "surprised" | "neutral";
}

interface StoryResponse {
  items: StoryItem[];
}

// Create a mock OpenAI streaming response using official types
function createMockOpenAIStream(): AsyncIterable<ChatCompletionChunk> {
  const storyParts = [
    '{"items": [',
    '{"text": "In a small workshop,", "emotion": "neutral"},',
    '{"text": "a little robot named Bolt woke up for the first time.", "emotion": "surprised"},',
    '{"text": "He looked around with glowing blue eyes,", "emotion": "happy"},',
    '{"text": "discovering the colorful world around him.", "emotion": "happy"},',
    '{"text": "Bolt took his first wobbly steps,", "emotion": "neutral"},',
    '{"text": "and felt pure joy in his circuits.", "emotion": "happy"}',
    ']}'
  ];

  return {
    async *[Symbol.asyncIterator]() {
      for (const part of storyParts) {
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{
            index: 0,
            delta: { content: part },
            finish_reason: null
          }]
        } as ChatCompletionChunk;
        // Simulate streaming delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Final chunk with finish_reason
      yield {
        id: "chatcmpl-mock",
        object: "chat.completion.chunk", 
        created: Date.now(),
        model: "gpt-4",
        choices: [{
          index: 0,
          delta: {},
          finish_reason: "stop"
        }]
      } as ChatCompletionChunk;
    }
  };
}
describe("OpenAI Streaming Parser Adapter", () => {
  it("should parse OpenAI streaming response with watch", async () => {
    const mockResponse = createMockOpenAIStream();
    const parser = createObjectStreamingParser(
      mockResponse,
      ObjectStreamExtractors.openAIChatCompletions
    );

    const items: StoryItem[] = [];
    for await (const item of parser.watch("/items/*")) {
      if (item) {
        items.push(item as StoryItem);
        console.log("Watched item:", item);
      }
    }

    // Verify that we got all expected items
    console.log(`Total items watched: ${items.length}`);
    console.log("All items:", items);
  });

  it("should parse OpenAI streaming response with watchComplete", async () => {
    const mockResponse = createMockOpenAIStream();
    const parser = createObjectStreamingParser(
      mockResponse,
      ObjectStreamExtractors.openAIChatCompletions
    );

    console.log("\nUsing watchComplete to watch /items/* field...\n");

    const completeItems: StoryItem[] = [];
    for await (const item of parser.watchComplete("/items/*")) {
      if (item) {
        completeItems.push(item as StoryItem);
        console.log("Complete item:", item);
      }
    }

    console.log(`Total complete items: ${completeItems.length}`);
  });

  it("should handle empty content chunks gracefully", async () => {
    const mockResponseWithEmptyChunks: AsyncIterable<ChatCompletionChunk> = {
      async *[Symbol.asyncIterator]() {
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{ index: 0, delta: { content: '{"items": [' }, finish_reason: null }]
        } as ChatCompletionChunk;
        
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{ index: 0, delta: {}, finish_reason: null }] // Empty content
        } as ChatCompletionChunk;
        
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{ index: 0, delta: { content: '{"text": "Hello", "emotion": "happy"}' }, finish_reason: null }]
        } as ChatCompletionChunk;
        
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{ index: 0, delta: { content: ']}' }, finish_reason: null }]
        } as ChatCompletionChunk;
        
        yield {
          id: "chatcmpl-mock",
          object: "chat.completion.chunk",
          created: Date.now(),
          model: "gpt-4",
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
        } as ChatCompletionChunk;
      }
    };

    const parser = createObjectStreamingParser(
      mockResponseWithEmptyChunks,
      ObjectStreamExtractors.openAIChatCompletions
    );

    const items: StoryItem[] = [];
    for await (const item of parser.watch("/items/*")) {
      if (item) {
        items.push(item as StoryItem);
      }
    }

    console.log("Items from response with empty chunks:", items);
  });
});

// Manual test runner (can be replaced with proper test framework)
async function runTests() {
  console.log("Running OpenAI streaming parser tests...\n");
  
  try {
    // Test 1: Watch method
    console.log("=== Test 1: Watch method ===");
    const mockResponse1 = createMockOpenAIStream();
    const parser1 = createObjectStreamingParser(
      mockResponse1,
      ObjectStreamExtractors.openAIChatCompletions
    );

    const items: StoryItem[] = [];
    for await (const item of parser1.watch("/items/*")) {
      if (item) {
        items.push(item as StoryItem);
        console.log("Watched item:", item);
      }
    }
    console.log(`✓ Test 1 passed: ${items.length} items watched\n`);

    // Test 2: WatchComplete method
    console.log("=== Test 2: WatchComplete method ===");
    const mockResponse2 = createMockOpenAIStream();
    const parser2 = createObjectStreamingParser(
      mockResponse2,
      ObjectStreamExtractors.openAIChatCompletions
    );

    const completeItems: StoryItem[] = [];
    for await (const item of parser2.watchComplete("/items/*")) {
      if (item) {
        completeItems.push(item as StoryItem);
        console.log("Complete item:", item);
      }
    }
    console.log(`✓ Test 2 passed: ${completeItems.length} complete items\n`);

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
