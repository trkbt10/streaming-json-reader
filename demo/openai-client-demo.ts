import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/index.mjs";
import { createObjectStreamingParser, ObjectStreamExtractors } from "../src/index";

// Define the expected story structure for type safety
interface StoryItem {
  text: string;
  emotion: "happy" | "sad" | "angry" | "surprised" | "neutral";
}

interface StoryResponse {
  items: StoryItem[];
}

// Configuration from environment variables
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function demonstrateRealOpenAIStreaming() {
  console.log("🚀 Starting real OpenAI streaming demo...");
  console.log(`📝 Using model: ${MODEL}`);
  console.log("📝 Requesting a story about a robot with structured JSON output");

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a storyteller. Always respond in the exact JSON format requested."
        },
        {
          role: "user",
          content: "Tell me a short story about a robot discovering emotions. Break it into 4-6 short sentences with emotions."
        }
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "robot_story",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { 
                      type: "string",
                      description: "A sentence of the story"
                    },
                    emotion: { 
                      type: "string", 
                      enum: ["happy", "sad", "angry", "surprised", "neutral"],
                      description: "The emotion conveyed in this sentence"
                    }
                  },
                  required: ["text", "emotion"],
                  additionalProperties: false
                }
              }
            },
            required: ["items"],
            additionalProperties: false
          },
          strict: true
        }
      }
    });

    console.log("\n✨ Creating streaming parser with ObjectStreamExtractors...");
    
    // Use the object stream adapter for OpenAI's parsed response
    const parser = createObjectStreamingParser(
      response as AsyncIterable<ChatCompletionChunk>,
      ObjectStreamExtractors.openAIChatCompletions
    );

    console.log("\n📖 Watching story items as they arrive (real-time streaming):");
    console.log("═".repeat(60));

    let itemCount = 0;
    for await (const item of parser.watch("/items/*")) {
      if (item && typeof item === "object" && "text" in item && "emotion" in item) {
        itemCount++;
        const storyItem = item as StoryItem;
        console.log(`📃 Item ${itemCount}: "${storyItem.text}" (${storyItem.emotion})`);
      }
    }

    console.log("═".repeat(60));
    console.log(`✅ Streaming completed! Received ${itemCount} story items`);

    // Also demonstrate watchComplete for comparison
    console.log("\n🔄 Running again with watchComplete (waits for full completion):");
    
    const response2 = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a storyteller. Always respond in the exact JSON format requested."
        },
        {
          role: "user",
          content: "Tell me a different short story about a robot learning to dance. Break it into 4-6 short sentences with emotions."
        }
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "robot_dance_story",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    emotion: { 
                      type: "string", 
                      enum: ["happy", "sad", "angry", "surprised", "neutral"]
                    }
                  },
                  required: ["text", "emotion"],
                  additionalProperties: false
                }
              }
            },
            required: ["items"],
            additionalProperties: false
          },
          strict: true
        }
      }
    });

    const parser2 = createObjectStreamingParser(
      response2 as AsyncIterable<ChatCompletionChunk>,
      ObjectStreamExtractors.openAIChatCompletions
    );

    console.log("⏳ Waiting for complete story items...");
    
    let completeItemCount = 0;
    for await (const item of parser2.watchComplete("/items/*")) {
      if (item && typeof item === "object" && "text" in item && "emotion" in item) {
        completeItemCount++;
        const storyItem = item as StoryItem;
        console.log(`💫 Complete Item ${completeItemCount}: "${storyItem.text}" (${storyItem.emotion})`);
      }
    }

    console.log(`✅ watchComplete finished! Received ${completeItemCount} complete items`);

  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error occurred:", error.message);
      
      if (error.message.includes("API key")) {
        console.log("\n💡 Setup instructions:");
        console.log("1. Get an OpenAI API key from https://platform.openai.com/api-keys");
        console.log("2. Set environment variables:");
        console.log("   export OPENAI_API_KEY='your-api-key-here'");
        console.log("   export OPENAI_MODEL='gpt-4o-mini'  # Optional, defaults to gpt-4o-mini");
        console.log("3. Or create a .env file with:");
        console.log("   OPENAI_API_KEY=your-api-key-here");
        console.log("   OPENAI_MODEL=gpt-4o-mini");
      }
    } else {
      console.error("❌ Unknown error:", error);
    }
  }
}

async function demonstrateErrorHandling() {
  console.log("\n🧪 Testing error handling with invalid model...");
  
  try {
    const response = await client.chat.completions.create({
      model: "invalid-model-name" as any,
      messages: [{ role: "user", content: "Test" }],
      stream: true,
    });

    const parser = createObjectStreamingParser(
      response as AsyncIterable<ChatCompletionChunk>,
      ObjectStreamExtractors.openAIChatCompletions
    );

    for await (const item of parser.watch("/content")) {
      console.log("Received:", item);
    }
  } catch (error) {
    console.log("✅ Error handling works correctly:", error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log("🤖 OpenAI Client Streaming Parser Demo");
  console.log("=====================================\n");

  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  OPENAI_API_KEY environment variable not found");
    console.log("This demo requires a real OpenAI API key for manual testing");
    console.log("\nTo run this demo:");
    console.log("1. Get an API key from https://platform.openai.com/api-keys");
    console.log("2. Set environment variables:");
    console.log("   export OPENAI_API_KEY='your-key'");
    console.log("   export OPENAI_MODEL='gpt-4o-mini'  # Optional");
    console.log("3. Run: npx tsx demo/openai-client-demo.ts");
    return;
  }

  await demonstrateRealOpenAIStreaming();
  await demonstrateErrorHandling();
  
  console.log("\n🎉 Demo completed successfully!");
  console.log("This demonstrates that the ObjectStreamExtractors work correctly with real OpenAI responses.");
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}