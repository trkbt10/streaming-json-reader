#!/usr/bin/env node

/**
 * Incremental JSON Parser - Interactive Demo CLI
 *
 * Interactive CLI tool to select and run various demos from the command line
 * Uses only Node.js standard libraries
 */

import * as readline from "readline";
import { basicParsingDemo } from "./01-basic-parsing";
import { StreamingJsonParserDemo } from "./02-stream-reader";
import { openAIStyleDemo } from "./03-openai-style";
import { nestedExtractionDemo } from "./04-nested-extraction";
import { performanceDemo } from "./05-performance";
import { unicodeSupportDemo } from "./06-unicode-support";
import { japaneseMenuDemo } from "./07-japanese-menu";
import { sseStreamDemo } from "./08-sse-stream";

// Demo definitions
interface Demo {
  id: string;
  title: string;
  description: string;
  tags: string[];
  func: () => Promise<void>;
}

const demos: Demo[] = [
  {
    id: "1",
    title: "Basic Incremental Parsing",
    description: "Basic usage of parsing JSON incrementally in small chunks",
    tags: ["Basic", "Streaming", "Parsing"],
    func: basicParsingDemo,
  },
  {
    id: "2",
    title: "StreamingJsonParser with JSON Pointers",
    description: "Advanced data extraction using JSON Pointers (RFC 6901)",
    tags: ["JSON Pointers", "StreamingJsonParser", "Extraction"],
    func: StreamingJsonParserDemo,
  },
  {
    id: "3",
    title: "OpenAI-style Streaming",
    description: "Streaming processing of structured data like AI responses",
    tags: ["AI", "Sentiment Analysis", "Real-time"],
    func: openAIStyleDemo,
  },
  {
    id: "4",
    title: "Nested Data Extraction",
    description:
      "Efficient data extraction from deeply nested complex data structures",
    tags: ["Nested", "Organizational Structure", "Wildcards"],
    func: nestedExtractionDemo,
  },
  {
    id: "5",
    title: "Performance Test",
    description: "Performance testing with large datasets",
    tags: ["Performance", "Large-scale", "IoT"],
    func: performanceDemo,
  },
  {
    id: "6",
    title: "Unicode Support (日本語 & Emoji)",
    description: "Processing Unicode data including Japanese and emoji",
    tags: ["Unicode", "Japanese", "Emoji", "Multilingual"],
    func: unicodeSupportDemo,
  },
  {
    id: "7",
    title: "Japanese Restaurant Menu",
    description: "Practical processing example of Japanese restaurant menu",
    tags: ["Japanese", "Practical Example", "Business"],
    func: japaneseMenuDemo,
  },
  {
    id: "8",
    title: "Server-Sent Events (SSE) Stream",
    description:
      "Universal SSE stream processing including notifications, analytics, and OpenAI",
    tags: ["SSE", "Real-time", "Notifications", "Analytics", "OpenAI"],
    func: sseStreamDemo,
  },
];

// Color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Display prompt
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Display header
function showHeader() {
  console.clear();
  console.log(
    colors.cyan +
      "╔════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║" +
      colors.bright +
      "       🚀 Incremental JSON Parser - Interactive Demo 🚀         " +
      colors.reset +
      colors.cyan +
      "║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════════╝" +
      colors.reset
  );
  console.log(
    "\n" +
      colors.dim +
      "Experience various features of streaming JSON parser interactively" +
      colors.reset
  );
  console.log(colors.dim + "─".repeat(65) + colors.reset + "\n");
}

// Display demo list
function showDemoList() {
  console.log(colors.yellow + "📋 Available Demos:" + colors.reset + "\n");

  demos.forEach((demo) => {
    console.log(colors.bright + `  ${demo.id}. ${demo.title}` + colors.reset);
    console.log(colors.dim + `     ${demo.description}` + colors.reset);
    console.log(
      `     🏷️  ${demo.tags
        .map((tag) => colors.cyan + tag + colors.reset)
        .join(" ")}`
    );
    console.log("");
  });

  console.log(colors.dim + "─".repeat(65) + colors.reset);
  console.log(colors.green + "  A. Run all demos in sequence" + colors.reset);
  console.log(colors.red + "  Q. Exit" + colors.reset);
  console.log("");
}

// Run demo
async function runDemo(demo: Demo) {
  console.clear();
  console.log(colors.bright + colors.blue + "▶ " + demo.title + colors.reset);
  console.log(colors.dim + "─".repeat(65) + colors.reset + "\n");

  try {
    await demo.func();
    console.log(
      "\n" + colors.green + "✅ Demo completed successfully!" + colors.reset
    );
  } catch (error) {
    console.error(
      "\n" + colors.red + "❌ An error occurred:" + colors.reset,
      error
    );
  }

  console.log("\n" + colors.dim + "─".repeat(65) + colors.reset);
  await prompt(colors.dim + "Press Enter to continue..." + colors.reset);
}

// Run all demos
async function runAllDemos() {
  console.log(
    colors.yellow + "\n🎯 Running all demos in sequence...\n" + colors.reset
  );

  for (const demo of demos) {
    await runDemo(demo);
  }

  console.log(colors.green + "\n✨ All demos completed!\n" + colors.reset);
}

// Main loop
async function main() {
  let running = true;

  while (running) {
    showHeader();
    showDemoList();

    const choice = await prompt(
      colors.yellow + "Please select a demo to run (number): " + colors.reset
    );

    if (choice.toLowerCase() === "q") {
      console.log(
        colors.cyan + "\n👋 Thank you for using this tool!\n" + colors.reset
      );
      running = false;
    } else if (choice.toLowerCase() === "a") {
      await runAllDemos();
    } else {
      const demo = demos.find((d) => d.id === choice);

      if (demo) {
        await runDemo(demo);
      } else {
        console.log(
          colors.red +
            "\n❌ Invalid selection. Please try again.\n" +
            colors.reset
        );
        await prompt(colors.dim + "Press Enter to continue..." + colors.reset);
      }
    }
  }

  rl.close();
}

// Error handling
process.on("uncaughtException", (error) => {
  console.error(
    colors.red + "\n❌ An unexpected error occurred:" + colors.reset,
    error
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    colors.red + "\n❌ Unhandled Promise rejection:" + colors.reset,
    reason
  );
  process.exit(1);
});

// Signal handling
process.on("SIGINT", () => {
  console.log(colors.cyan + "\n\n👋 Exiting program...\n" + colors.reset);
  rl.close();
  process.exit(0);
});

// Startup message
console.log(
  colors.cyan +
    "\n🚀 Starting Incremental JSON Parser Demo CLI...\n" +
    colors.reset
);

// Execute main function
main().catch((error) => {
  console.error(colors.red + "\n❌ Startup error:" + colors.reset, error);
  process.exit(1);
});
