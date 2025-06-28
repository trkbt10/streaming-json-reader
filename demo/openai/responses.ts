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
  displayCompletion,
  getStepEmoji
} from "./shared";

// Define the expected agent response structure for type safety
interface AgentStep {
  type: "reasoning" | "action" | "observation" | "answer";
  content: string;
  confidence?: number;
}

interface AgentResponse {
  steps: AgentStep[];
  final_answer: string;
}

async function demonstrateAgentResponseStreaming() {
  displayDemoHeader(
    "OpenAI Agent Response Streaming Demo",
    "Creating an agent that analyzes data and provides step-by-step reasoning"
  );

  try {
    const request = createChatRequest(
      [
        {
          role: "system",
          content: `You are an analytical agent. Break down your reasoning into clear steps. 
          Always respond in the exact JSON format requested with step-by-step reasoning.`
        },
        {
          role: "user",
          content: `Analyze this scenario: A company's revenue increased 25% but their profit decreased 10%. 
          What could be the possible reasons? Provide step-by-step analysis.`
        }
      ],
      "agent_analysis",
      schemas.agentAnalysis,
      { maxTokens: 800, temperature: 0.3 }
    );

    const response = await client.chat.completions.create(request);

    console.log("\n✨ Creating streaming parser for agent responses...");
    
    // Use the object stream adapter for OpenAI's parsed response
    const parser = createObjectStreamingParser(
      response,
      ObjectStreamExtractors.openAIChatCompletions
    );

    console.log("\n🧠 Watching agent reasoning steps as they arrive:");
    console.log("═".repeat(70));

    let stepCount = 0;
    for await (const step of parser.watch("/steps/*")) {
      if (step && typeof step === "object" && "type" in step && "content" in step) {
        stepCount++;
        const agentStep = step as AgentStep;
        const confidence = agentStep.confidence ? ` (${Math.round(agentStep.confidence * 100)}%)` : "";
        
        console.log(`📋 Step ${stepCount} [${agentStep.type.toUpperCase()}]${confidence}:`);
        console.log(`   ${agentStep.content}`);
        console.log();
      }
    }

    console.log("═".repeat(70));
    console.log(`✅ Agent analysis completed! Processed ${stepCount} reasoning steps`);

    // Also demonstrate watching the final answer
    console.log("\n🎯 Watching for final answer...");
    
    const response2 = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a problem-solving agent. Provide systematic analysis with a clear final answer.`
        },
        {
          role: "user",
          content: `A tech startup wants to scale from 10 to 100 employees in 6 months. 
          What are the key challenges and recommendations? Use structured reasoning.`
        }
      ],
      stream: true,
      max_tokens: 600,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scaling_analysis",
          schema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["reasoning", "action", "observation", "answer"] },
                    content: { type: "string" }
                  },
                  required: ["type", "content"]
                }
              },
              final_answer: { type: "string" }
            },
            required: ["steps", "final_answer"]
          }
        }
      }
    });

    const parser2 = createObjectStreamingParser(
      response2,
      ObjectStreamExtractors.openAIChatCompletions
    );

    // Watch for complete final answer
    for await (const answer of parser2.watchComplete("/final_answer")) {
      if (answer && typeof answer === "string") {
        console.log("🏆 Final Answer:");
        console.log(`   ${answer}`);
      }
    }

  } catch (error) {
    handleOpenAIError(error);
  }
}

async function demonstrateRealTimeAgentThinking() {
  console.log("\n🔄 Real-time Agent Thinking Demo");
  console.log("Demonstrating how to stream agent reasoning in real-time...");

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a debugging agent. Analyze problems step by step and show your reasoning process.`
        },
        {
          role: "user",
          content: `A web application is loading slowly. Users report 5-second load times. 
          Debug this systematically and provide actionable solutions.`
        }
      ],
      stream: true,
      max_tokens: 700,
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "debugging_session",
          schema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["reasoning", "action", "observation", "answer"] },
                    content: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 }
                  },
                  required: ["type", "content"]
                }
              },
              final_answer: { type: "string" }
            },
            required: ["steps", "final_answer"]
          }
        }
      }
    });

    const parser = createObjectStreamingParser(
      response,
      ObjectStreamExtractors.openAIChatCompletions
    );

    console.log("\n🕵️ Real-time debugging session:");
    console.log("─".repeat(50));

    // Demonstrate real-time streaming of agent thoughts
    let currentSteps: AgentStep[] = [];
    
    for await (const partial of parser.readPartial()) {
      if (partial && typeof partial === "object" && "steps" in partial) {
        const newSteps = (partial as any).steps || [];
        
        // Only show new steps that weren't displayed before
        for (let i = currentSteps.length; i < newSteps.length; i++) {
          const step = newSteps[i];
          if (step && step.type && step.content) {
            const emoji = getStepEmoji(step.type);
            console.log(`${emoji} ${step.type.toUpperCase()}: ${step.content}`);
          }
        }
        
        currentSteps = newSteps;
      }
    }
    
    console.log("─".repeat(50));
    console.log("✅ Real-time debugging session completed!");

  } catch (error) {
    console.error("❌ Real-time demo error:", error instanceof Error ? error.message : error);
  }
}

// getStepEmoji is now imported from shared.ts

async function main() {
  console.log("🚀 OpenAI Agent Response Streaming Demos");
  console.log("=========================================\n");

  if (!checkApiKeySetup()) {
    return;
  }

  await demonstrateAgentResponseStreaming();
  await demonstrateRealTimeAgentThinking();
  
  console.log("\n🎉 All agent response demos completed successfully!");
  console.log("This demonstrates how to stream agent-like reasoning with ObjectStreamExtractors.");
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}