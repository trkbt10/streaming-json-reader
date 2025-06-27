/**
 * Demo 3: OpenAI-style Streaming Response
 *
 * Demonstrates how to handle structured streaming responses like OpenAI API.
 * Shows a practical use case of processing sentiment analysis results in real-time.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function openAIStyleDemo() {
  console.log("🤖 OpenAI-style Streaming Response Demo");
  console.log("======================================\n");

  console.log(
    "📝 Scenario: AI-powered sentiment analysis streaming processing\n"
  );

  // Mock response simulating OpenAI-style structured output
  const response = {
    model: "gpt-4-vision",
    usage: {
      prompt_tokens: 150,
      completion_tokens: 280,
      total_tokens: 430,
    },
    items: [
      {
        id: "item-001",
        text: "Today is a wonderful day!",
        analysis: {
          sentiment: "positive",
          confidence: 0.95,
          emotion: {
            happy: 0.9,
            neutral: 0.1,
            sad: 0.0,
          },
          keywords: ["wonderful", "day"],
        },
      },
      {
        id: "item-002",
        text: "A new project is starting.",
        analysis: {
          sentiment: "positive",
          confidence: 0.85,
          emotion: {
            excited: 0.7,
            nervous: 0.3,
            neutral: 0.0,
          },
          keywords: ["new", "project", "starting"],
        },
      },
      {
        id: "item-003",
        text: "The deadline is approaching and I am worried.",
        analysis: {
          sentiment: "negative",
          confidence: 0.88,
          emotion: {
            worried: 0.8,
            stressed: 0.2,
            calm: 0.0,
          },
          keywords: ["deadline", "approaching", "worried"],
        },
      },
    ],
    summary: {
      totalItems: 3,
      sentimentBreakdown: {
        positive: 2,
        negative: 1,
        neutral: 0,
      },
      averageConfidence: 0.89,
      dominantEmotions: ["happy", "worried", "excited"],
    },
  };

  const json = JSON.stringify(response);
  console.log(`📊 Response size: ${json.length} characters`);
  console.log(`🔄 Streaming chunk size: 30 characters\n`);

  // Create stream reader
  const reader = createJSONReadableStreamDefaultReader(json, 30);
  const streaming = new StreamingJsonParser(reader);

  console.log("🎯 Streaming sentiment analysis results:");
  console.log('JSON Pointer: "/items/*"');
  console.log("─".repeat(60));

  // Initialize statistics
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
  const emotions = new Map<string, number>();

  // Process items via streaming
  for await (const item of streaming.watch("/items/*")) {
    console.log(`\n🔄 [Chunk Received] New item completed`);
    console.log(`📌 Item ID: ${item.id}`);
    console.log(`📝 Text: "${item.text}"`);

    // Display sentiment analysis results
    const analysis = item.analysis as {
      sentiment: string;
      confidence: number;
      emotion: Record<string, number>;
      keywords: string[];
    };
    const sentimentIcon =
      {
        positive: "😊",
        negative: "😟",
        neutral: "😐",
      }[analysis.sentiment] || "❓";

    console.log(`\n🔄 [Chunk Processing] Analyzing sentiment data...`);
    console.log(`🎭 Sentiment Analysis:`);
    console.log(
      `  ${sentimentIcon} Sentiment: ${analysis.sentiment} (Confidence: ${(
        analysis.confidence * 100
      ).toFixed(0)}%)`
    );

    // Visualize emotion scores
    console.log(`\n🔄 [Chunk Processing] Visualizing emotion scores...`);
    console.log(`📊 Emotion Scores:`);
    for (const [emotion, score] of Object.entries(analysis.emotion)) {
      if (score > 0) {
        const bar = "█".repeat(Math.round(score * 20));
        const percentage = (score * 100).toFixed(0);
        console.log(`  ${emotion.padEnd(10)} ${bar} ${percentage}%`);

        // Update statistics
        emotions.set(emotion, (emotions.get(emotion) || 0) + score);
      }
    }

    // Display keywords
    console.log(`\n🔄 [Chunk Processing] Extracting keywords...`);
    console.log(`🔑 Keywords: ${analysis.keywords.join(", ")}`);

    // Update sentiment counts
    sentimentCounts[analysis.sentiment as keyof typeof sentimentCounts]++;

    console.log(`✅ [Chunk Complete] Processing of item ${item.id} completed`);
    console.log("\n" + "─".repeat(60));
  }

  // Get complete response and display summary
  console.log(`\n🔄 [Overall Processing] Retrieving final summary...`);
  const reader2 = createJSONReadableStreamDefaultReader(json, 30);
  const streaming2 = new StreamingJsonParser(reader2);
  const fullResponse: {
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    items: Array<{
      id: string;
      text: string;
      analysis: {
        sentiment: string;
        confidence: number;
        emotion: Record<string, number>;
        keywords: string[];
      };
    }>;
    summary: {
      totalItems: number;
      sentimentBreakdown: Record<string, number>;
      averageConfidence: number;
      dominantEmotions: string[];
    };
  } = await streaming2.getFullResponse();

  console.log(`✅ [Streaming Complete] All data reception completed`);
  console.log("\n📈 Analysis Summary:");
  console.log("─".repeat(40));

  // Model information
  console.log(`\n🤖 Model Information:`);
  console.log(`  • Model: ${fullResponse.model}`);
  console.log(`  • Token Usage: ${fullResponse.usage.total_tokens}`);
  console.log(`    - Prompt: ${fullResponse.usage.prompt_tokens}`);
  console.log(`    - Completion: ${fullResponse.usage.completion_tokens}`);

  // Sentiment distribution
  console.log(`\n😊 Sentiment Distribution:`);
  const total = fullResponse.summary.totalItems;
  for (const [sentiment, count] of Object.entries(
    fullResponse.summary.sentimentBreakdown
  )) {
    const percentage = ((count / total) * 100).toFixed(0);
    const bar = "█".repeat(Math.round((count / total) * 20));
    console.log(
      `  ${sentiment.padEnd(10)} ${bar} ${count} items (${percentage}%)`
    );
  }

  // Average confidence
  console.log(
    `\n🎯 Average Confidence: ${(
      fullResponse.summary.averageConfidence * 100
    ).toFixed(0)}%`
  );

  // Dominant emotions
  console.log(
    `\n🎭 Dominant Emotions: ${fullResponse.summary.dominantEmotions.join(
      ", "
    )}`
  );

  console.log("\n💡 Benefits of Streaming Processing:");
  console.log("  • 🔄 Display results as each chunk is received");
  console.log("  • ⚡ Minimize memory usage even with large datasets");
  console.log(
    "  • 🖥️  Ideal for incremental UI updates and real-time dashboards"
  );
  console.log("  • 📊 Visualize processing progress to improve UX");
}
