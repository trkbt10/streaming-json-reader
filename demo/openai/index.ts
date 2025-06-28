#!/usr/bin/env node

/**
 * OpenAI Streaming Demos
 * 
 * This module demonstrates various OpenAI streaming scenarios using
 * the streaming-json-reader library with ObjectStreamExtractors.
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';

interface DemoOption {
  name: string;
  description: string;
  file: string;
}

const demos: DemoOption[] = [
  {
    name: "Chat Completions",
    description: "Streaming chat completions with JSON schema (stories, structured data)",
    file: "chat-completions.ts"
  },
  {
    name: "Agent Responses", 
    description: "Agent-like responses with step-by-step reasoning and real-time thinking",
    file: "responses.ts"
  }
];

function displayMenu() {
  console.log("🤖 OpenAI Streaming JSON Parser Demos");
  console.log("=====================================\n");
  
  console.log("Available demos:");
  demos.forEach((demo, index) => {
    console.log(`${index + 1}. ${demo.name}`);
    console.log(`   ${demo.description}\n`);
  });
  
  console.log("Usage:");
  console.log("  npx tsx demo/openai/index.ts [demo-number]");
  console.log("  npx tsx demo/openai/chat-completions.ts");
  console.log("  npx tsx demo/openai/responses.ts");
  
  console.log("\nEnvironment Setup:");
  console.log("  export OPENAI_API_KEY='your-api-key'");
  console.log("  export OPENAI_MODEL='gpt-4o-mini'  # Optional");
  
  console.log("\nOr create a .env file:");
  console.log("  OPENAI_API_KEY=your-api-key");
  console.log("  OPENAI_MODEL=gpt-4o-mini");
}

async function runDemo(demoIndex: number) {
  const demo = demos[demoIndex - 1];
  if (!demo) {
    console.error(`❌ Invalid demo number: ${demoIndex}`);
    displayMenu();
    return;
  }
  
  console.log(`🚀 Running: ${demo.name}`);
  console.log(`📝 ${demo.description}\n`);
  
  const demoPath = resolve(__dirname, demo.file);
  
  try {
    // Check if file exists
    await fs.access(demoPath);
    
    // Import and run the demo
    const { main } = await import(demoPath);
    if (typeof main === 'function') {
      await main();
    } else {
      console.error(`❌ Demo file ${demo.file} does not export a main function`);
    }
  } catch (error) {
    console.error(`❌ Error running demo:`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    displayMenu();
    return;
  }
  
  const demoNumber = parseInt(args[0]);
  if (isNaN(demoNumber)) {
    console.error(`❌ Invalid demo number: ${args[0]}`);
    displayMenu();
    return;
  }
  
  await runDemo(demoNumber);
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}