import OpenAI from "openai";
import { createSSEJsonStreamingParser, SSEJsonExtractors } from "../src/index";

const systemPrompt = "You are a helpful assistant. Always respond in JSON format.";
const userPrompt = "Tell me a short story about a robot.";
const streamingChatJsonSchema = {
  type: "object",
  properties: {
    story: { type: "string" }
  },
  required: ["story"],
  additionalProperties: false,
};

const { model = "gpt-4.1-nano", maxTokens = 500 } = {};
const client = new OpenAI();

async function streamOpenAIWithWatchComplete() {
  // Get the raw response to access the SSE stream
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "streaming_chat_response",
          schema: streamingChatJsonSchema,
          strict: true,
        },
      },
    }),
  });

  if (!response.body) {
    throw new Error("No response body");
  }

  // Use the actual SSE stream directly
  const parser = createSSEJsonStreamingParser(response.body, SSEJsonExtractors.openAIChatCompletions);

  console.log("\nUsing watchComplete to watch /story field in real-time...\n");

  for await (const story of parser.watchComplete("/story")) {
    if (story) {
      console.log("Complete story:", story);
    }
  }
}

streamOpenAIWithWatchComplete().catch(console.error);
