import type { ChatCompletionChunk } from "openai/resources/index.mjs";
import { createObjectStreamingParser, ObjectStreamExtractors } from "../../src/index";
import { 
  client, 
  MODEL, 
  handleOpenAIError, 
  checkApiKeySetup,
  schemas,
  createChatRequest,
  displayDemoHeader,
  displaySeparator,
  displayCompletion
} from "./shared";

// Define the expected story structure for type safety
interface StoryItem {
  text: string;
  emotion: "happy" | "sad" | "angry" | "surprised" | "neutral";
}

interface StoryResponse {
  items: StoryItem[];
}

async function demonstrateRealOpenAIStreaming() {
  displayDemoHeader(
    "Real OpenAI Streaming Demo", 
    "Requesting a story about a robot with structured JSON output"
  );

  try {
    const request = createChatRequest(
      [
        {
          role: "system",
          content: "You are a storyteller. Always respond in the exact JSON format requested."
        },
        {
          role: "user",
          content: "Tell me a short story about a robot discovering emotions. Break it into 4-6 short sentences with emotions."
        }
      ],
      "robot_story",
      schemas.story,
      { maxTokens: 500, temperature: 0.7 }
    );

    const response = await client.chat.completions.create(request);

    console.log("\n✨ Creating streaming parser with ObjectStreamExtractors...");
    
    // Use the object stream adapter for OpenAI's parsed response
    const parser = createObjectStreamingParser(
      response as AsyncIterable<ChatCompletionChunk>,
      ObjectStreamExtractors.openAIChatCompletions
    );

    displaySeparator("📖 Watching story items as they arrive (real-time streaming):");

    let itemCount = 0;
    for await (const item of parser.watch("/items/*")) {
      if (item && typeof item === "object" && "text" in item && "emotion" in item) {
        itemCount++;
        const storyItem = item as StoryItem;
        console.log(`📃 Item ${itemCount}: "${storyItem.text}" (${storyItem.emotion})`);
      }
    }

    displaySeparator("");
    displayCompletion(`Streaming completed! Received ${itemCount} story items`);

    // Also demonstrate watchComplete for comparison
    console.log("\n🔄 Running again with watchComplete (waits for full completion):");
    
    const request2 = createChatRequest(
      [
        {
          role: "system",
          content: "You are a storyteller. Always respond in the exact JSON format requested."
        },
        {
          role: "user",
          content: "Tell me a different short story about a robot learning to dance. Break it into 4-6 short sentences with emotions."
        }
      ],
      "robot_dance_story",
      schemas.story,
      { maxTokens: 500, temperature: 0.7 }
    );

    const response2 = await client.chat.completions.create(request2);

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
    handleOpenAIError(error);
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

  if (!checkApiKeySetup()) {
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