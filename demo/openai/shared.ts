import OpenAI from "openai";
import type { ChatCompletionCreateParamsStreaming } from "openai/resources/index.mjs";

/**
 * Common OpenAI configuration and utilities for demos
 */

// Configuration from environment variables
export const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Common error handling for OpenAI API errors
 */
export function handleOpenAIError(error: unknown) {
  if (error instanceof Error) {
    console.error("❌ Error occurred:", error.message);
    
    if (error.message.includes("API key")) {
      console.log("\n💡 Setup instructions:");
      console.log("1. Get an OpenAI API key from https://platform.openai.com/api-keys");
      console.log("2. Set environment variables:");
      console.log("   export OPENAI_API_KEY='your-api-key-here'");
      console.log("   export OPENAI_MODEL='gpt-4o-mini'  # Optional");
      console.log("3. Or create a .env file with:");
      console.log("   OPENAI_API_KEY=your-api-key-here");
      console.log("   OPENAI_MODEL=gpt-4o-mini");
    }
  } else {
    console.error("❌ Unknown error:", error);
  }
}

/**
 * Check if OpenAI API key is configured
 */
export function checkApiKeySetup(): boolean {
  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  OPENAI_API_KEY environment variable not found");
    console.log("This demo requires a real OpenAI API key for manual testing");
    console.log("\nTo run this demo:");
    console.log("1. Get an API key from https://platform.openai.com/api-keys");
    console.log("2. Set environment variables:");
    console.log("   export OPENAI_API_KEY='your-key'");
    console.log("   export OPENAI_MODEL='gpt-4o-mini'  # Optional");
    console.log("3. Run the demo again");
    return false;
  }
  return true;
}

/**
 * Common JSON schemas for demos
 */
export const schemas = {
  /**
   * Story schema with text and emotions
   */
  story: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            text: { 
              type: "string" as const,
              description: "A sentence of the story"
            },
            emotion: { 
              type: "string" as const, 
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

  /**
   * Agent analysis schema with reasoning steps (confidence is optional)
   */
  agentAnalysis: {
    type: "object" as const,
    properties: {
      steps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: { 
              type: "string" as const, 
              enum: ["reasoning", "action", "observation", "answer"],
              description: "The type of step in the analysis"
            },
            content: { 
              type: "string" as const,
              description: "The content of this reasoning step"
            }
          },
          required: ["type", "content"],
          additionalProperties: false
        }
      },
      final_answer: {
        type: "string" as const,
        description: "The final conclusion based on all steps"
      }
    },
    required: ["steps", "final_answer"],
    additionalProperties: false
  },

  /**
   * Agent analysis schema with confidence scores
   */
  agentAnalysisWithConfidence: {
    type: "object" as const,
    properties: {
      steps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: { 
              type: "string" as const, 
              enum: ["reasoning", "action", "observation", "answer"],
              description: "The type of step in the analysis"
            },
            content: { 
              type: "string" as const,
              description: "The content of this reasoning step"
            },
            confidence: { 
              type: "number" as const,
              minimum: 0,
              maximum: 1,
              description: "Confidence level in this step (0-1)"
            }
          },
          required: ["type", "content", "confidence"],
          additionalProperties: false
        }
      },
      final_answer: {
        type: "string" as const,
        description: "The final conclusion based on all steps"
      }
    },
    required: ["steps", "final_answer"],
    additionalProperties: false
  },

  /**
   * Simple agent steps without final answer
   */
  agentSteps: {
    type: "object" as const,
    properties: {
      steps: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: { type: "string" as const, enum: ["reasoning", "action", "observation", "answer"] },
            content: { type: "string" as const }
          },
          required: ["type", "content"]
        }
      },
      final_answer: { type: "string" as const }
    },
    required: ["steps", "final_answer"]
  }
};

/**
 * Create a standardized chat completion request
 */
export function createChatRequest(
  messages: ChatCompletionCreateParamsStreaming["messages"],
  schemaName: string,
  schema: any,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): ChatCompletionCreateParamsStreaming {
  return {
    model: MODEL,
    messages,
    stream: true,
    max_tokens: options.maxTokens || 500,
    temperature: options.temperature || 0.7,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema,
        strict: true
      }
    }
  };
}

/**
 * Display demo header with configuration
 */
export function displayDemoHeader(title: string, description: string) {
  console.log(`🚀 ${title}`);
  console.log(`📝 Using model: ${MODEL}`);
  console.log(`📝 ${description}`);
}

/**
 * Display section separator
 */
export function displaySeparator(title: string, char: string = "═", length: number = 60) {
  console.log(`\n${title}`);
  console.log(char.repeat(length));
}

/**
 * Display completion message
 */
export function displayCompletion(message: string) {
  console.log(`✅ ${message}`);
}

/**
 * Common step emoji mapping
 */
export function getStepEmoji(stepType: string): string {
  switch (stepType) {
    case "reasoning": return "🤔";
    case "action": return "⚡";
    case "observation": return "👀";
    case "answer": return "💡";
    default: return "📝";
  }
}