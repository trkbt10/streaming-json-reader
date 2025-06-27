import { createSSEJsonStreamingParser, type SSEJsonExtractorOptions } from "../src/index";

// Example: Custom API that sends messages like:
// data: {"type": "text", "data": {"content": "Hello"}}
// data: {"type": "text", "data": {"content": " world"}}
// data: {"type": "end"}

async function customExtractorExample() {
  // Simulate a custom SSE stream
  const customSseStream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Simulate streaming JSON data
      const messages = [
        '{"type": "start", "data": {"format": "json"}}',
        '{"type": "text", "data": {"content": "{\\"message\\": \\"Hello"}}',
        '{"type": "text", "data": {"content": " from"}}',
        '{"type": "text", "data": {"content": " custom"}}',
        '{"type": "text", "data": {"content": " API!\\"}"}}',
        '{"type": "end"}'
      ];
      
      messages.forEach(msg => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      });
      
      controller.close();
    }
  });

  // Custom extractor for this API format
  const customExtractor: SSEJsonExtractorOptions = {
    extractContent: (msg) => {
      // Only extract content from "text" type messages
      if (msg.type === "text" && msg.data?.content) {
        console.log("Extracting content:", JSON.stringify(msg.data.content));
        return msg.data.content;
      }
      return null;
    },
    shouldEnd: (msg) => {
      return msg.type === "end";
    }
  };

  // Create parser with custom extractor
  const parser = createSSEJsonStreamingParser(customSseStream, customExtractor);

  console.log("Using custom extractor to watch /message field...\n");

  for await (const message of parser.watchComplete("/message")) {
    if (message) {
      console.log("Complete message:", message);
    }
  }

  const fullResponse = await parser.getFullResponse();
  console.log("\nFull reconstructed JSON:", JSON.stringify(fullResponse, null, 2));
}

customExtractorExample().catch(console.error);