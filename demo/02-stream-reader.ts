/**
 * Demo 2: StreamingJsonParser with JSON Pointers
 *
 * Demonstrates advanced usage of StreamingJsonParser class with JSON Pointers.
 * JSON Pointers (RFC 6901) enable efficient extraction of specific values
 * from nested JSON structures.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function StreamingJsonParserDemo() {
  console.log("🔍 StreamingJsonParser with JSON Pointers Demo");
  console.log("======================================\n");

  // Data structure simulating chat conversation history
  const jsonData = {
    conversation: {
      id: "chat-001",
      participants: ["user", "assistant"],
      messages: [
        {
          role: "user",
          content: "Hello!",
          timestamp: "2024-01-01T10:00:00Z",
        },
        {
          role: "assistant",
          content: "Hi there! How can I help you?",
          timestamp: "2024-01-01T10:00:05Z",
        },
        {
          role: "user",
          content: "Tell me about TypeScript",
          timestamp: "2024-01-01T10:00:30Z",
        },
        {
          role: "assistant",
          content: "TypeScript is a typed superset of JavaScript...",
          timestamp: "2024-01-01T10:00:35Z",
        },
      ],
      metadata: {
        duration: 35,
        language: "en",
        model: "gpt-4",
      },
    },
  };

  const json = JSON.stringify(jsonData);
  console.log(`📄 JSON size: ${json.length} characters`);
  console.log(`🔄 Chunk size: 20 characters\n`);

  // Create StreamingJsonParser instance
  const reader = createJSONReadableStreamDefaultReader(json, 20);
  const parser = new StreamingJsonParser(reader);

  console.log("📨 Message extraction:");
  console.log('JSON Pointer: "/conversation/messages/*"');
  console.log("─".repeat(50));

  // Monitor messages with watch() method
  let messageCount = 0;
  for await (const message of parser.watch("/conversation/messages/*")) {
    messageCount++;
    const time = new Date(message.timestamp).toLocaleTimeString("ja-JP");

    // Set icon based on role
    const icon = message.role === "user" ? "👤" : "🤖";

    console.log(`\n${icon} [${time}] ${message.role}:`);
    console.log(`   "${message.content}"`);
  }

  console.log("\n─".repeat(50));
  console.log(`📊 Extracted messages: ${messageCount}`);

  // Get complete response
  console.log("\n🔄 Retrieving complete response...");
  const reader2 = createJSONReadableStreamDefaultReader(json, 20);
  const parser2 = new StreamingJsonParser(reader2);
  const fullResponse = await parser2.getFullResponse();

  console.log("\n📋 Conversation metadata:");
  console.log(`  • Conversation ID: ${fullResponse.conversation.id}`);
  console.log(
    `  • Participants: ${fullResponse.conversation.participants.join(", ")}`
  );
  console.log(
    `  • Duration: ${fullResponse.conversation.metadata.duration} seconds`
  );
  console.log(`  • Language: ${fullResponse.conversation.metadata.language}`);
  console.log(`  • Model: ${fullResponse.conversation.metadata.model}`);

  // Demo of other useful methods
  console.log("\n🔧 Other features:");

  // observe() and select() are aliases of watch()
  console.log("  • observe() - Alias of watch() (RxJS style)");
  console.log("  • select() - Alias of watch() (SQL style)");
  console.log("  • getCurrentSnapshot() - Get current partial state");
  console.log("  • readPartial() - Get entire JSON incrementally");

  console.log("\n💡 JSON Pointer examples:");
  console.log('  • "/" - Root element');
  console.log('  • "/users/0" - First element of users array');
  console.log('  • "/users/*/name" - Names of all users');
  console.log('  • "/data/items/*/price" - Prices of all items');
}
