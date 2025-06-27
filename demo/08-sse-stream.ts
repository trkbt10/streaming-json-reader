/**
 * Demo 8: Server-Sent Events (SSE) Stream Integration
 *
 * Demonstrates how to use the SSE stream utilities to parse
 * various types of Server-Sent Events streams including:
 * - Generic notifications and updates
 * - OpenAI ChatCompletions
 * - Real-time analytics data
 * - Multi-event SSE streams
 */

import { createSSEStreamingParser, parseSSEMessages, type SSEMessage } from "../src/index";

export async function sseStreamDemo() {
  console.log("🌐 Server-Sent Events (SSE) Stream Demo");
  console.log("======================================\n");

  console.log(
    "📝 Scenario: Processing various SSE streams in real-time\n"
  );

  // Demo 1: Generic notification system
  await demoGenericNotifications();
  
  console.log("\n" + "═".repeat(60) + "\n");
  
  // Demo 2: OpenAI ChatCompletions (backward compatibility)
  await demoOpenAIChatCompletions();
  
  console.log("\n" + "═".repeat(60) + "\n");
  
  // Demo 3: Real-time analytics dashboard
  await demoRealTimeAnalytics();
  
  console.log("\n" + "═".repeat(60) + "\n");
  
  // Demo 4: Multi-event SSE stream
  await demoMultiEventSSE();

  console.log("\n💡 Benefits of SSE Stream Integration:");
  console.log("  • 🌐 Process any SSE-compliant API (not just OpenAI)");
  console.log("  • ⚡ Real-time data processing and UI updates");
  console.log("  • 🎯 Extract specific fields using JSON Pointers");
  console.log("  • 📊 Handle multiple event types in single stream");
  console.log("  • 🛡️  Robust error handling for malformed data");
  console.log("  • 🔧 Easy integration with existing SSE endpoints");
}

async function demoGenericNotifications() {
  console.log("🔔 Demo 1: Generic Notification System");
  console.log("────────────────────────────────────────\n");

  // Mock notification SSE stream
  const notificationSSEData = [
    'data: {"type":"info","title":"System Update","message":"New features available","timestamp":"2024-01-15T10:00:00Z"}\n\n',
    'data: {"type":"warning","title":"Maintenance","message":"Scheduled maintenance in 1 hour","timestamp":"2024-01-15T10:05:00Z"}\n\n',
    'data: {"type":"error","title":"Service Alert","message":"Payment service temporarily unavailable","timestamp":"2024-01-15T10:10:00Z"}\n\n',
    'data: {"type":"success","title":"Issue Resolved","message":"Payment service restored","timestamp":"2024-01-15T10:15:00Z"}\n\n',
    'data: [DONE]\n\n'
  ];

  console.log(`📊 Mock notification stream: ${notificationSSEData.length - 1} notifications`);
  console.log(`🎯 Watching: /type and /message\n`);

  const notificationStream = createMockSSEStream(notificationSSEData);
  const parser = await createSSEStreamingParser(notificationStream);

  const notifications: { type: string, message: string }[] = [];
  
  // Watch for notification types
  const typePromise = (async () => {
    for await (const type of parser.watch('/type')) {
      const message = await getCorrespondingMessage(parser, type);
      notifications.push({ type, message });
      
      const icon = getNotificationIcon(type);
      console.log(`${icon} [${type.toUpperCase()}] New notification received`);
    }
  })();

  await typePromise;

  console.log(`\n📈 Summary: Processed ${notifications.length} notifications`);
  notifications.forEach((notif, index) => {
    const icon = getNotificationIcon(notif.type);
    console.log(`  ${index + 1}. ${icon} ${notif.type}: ${notif.message}`);
  });
}

async function demoOpenAIChatCompletions() {
  console.log("🤖 Demo 2: OpenAI ChatCompletions (Backward Compatibility)");
  console.log("─────────────────────────────────────────────────────────\n");

  // Mock OpenAI ChatCompletions SSE stream
  const openaiSSEData = [
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"! How"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" can"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" I"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" assist"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" you"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":" today"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"?"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl-8abc123","object":"chat.completion.chunk","created":1699649087,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
    'data: [DONE]\n\n'
  ];

  console.log(`📊 Mock OpenAI stream: ${openaiSSEData.length - 1} chunks`);
  console.log(`🎯 Watching: /choices/0/delta/content\n`);

  const openaiStream = createMockSSEStream(openaiSSEData);
  const parser = await createSSEStreamingParser(openaiStream);

  let fullContent = "";
  let chunkCount = 0;

  console.log("🔄 [Stream Started] Receiving chat content...\n");

  for await (const content of parser.watch('/choices/0/delta/content')) {
    if (content && content !== "") {
      chunkCount++;
      fullContent += content;
      
      console.log(`📝 [Chunk ${chunkCount}] "${content}"`);
      console.log(`📋 [Current]: "${fullContent}"`);
      console.log("─".repeat(40));
    }
  }

  console.log(`\n✅ [Complete] Full response: "${fullContent}"`);
  console.log(`📊 Total chunks: ${chunkCount}`);
}

async function demoRealTimeAnalytics() {
  console.log("📊 Demo 3: Real-time Analytics Dashboard");
  console.log("────────────────────────────────────────\n");

  // Mock analytics SSE stream
  const analyticsSSEData = [
    'data: {"metric":"page_views","value":1250,"timestamp":"2024-01-15T10:00:00Z","metadata":{"page":"/home","country":"US"}}\n\n',
    'data: {"metric":"user_signup","value":1,"timestamp":"2024-01-15T10:00:30Z","metadata":{"source":"google","plan":"free"}}\n\n',
    'data: {"metric":"revenue","value":99.99,"timestamp":"2024-01-15T10:01:00Z","metadata":{"currency":"USD","plan":"pro"}}\n\n',
    'data: {"metric":"page_views","value":1251,"timestamp":"2024-01-15T10:01:30Z","metadata":{"page":"/pricing","country":"CA"}}\n\n',
    'data: {"metric":"error_rate","value":0.02,"timestamp":"2024-01-15T10:02:00Z","metadata":{"service":"payment","severity":"low"}}\n\n',
    'data: [DONE]\n\n'
  ];

  console.log(`📊 Mock analytics stream: ${analyticsSSEData.length - 1} data points`);
  console.log(`🎯 Watching: /metric and /value\n`);

  const analyticsStream = createMockSSEStream(analyticsSSEData);
  const parser = await createSSEStreamingParser(analyticsStream);

  const metrics = new Map<string, number[]>();

  for await (const metric of parser.watch('/metric')) {
    // Get the full response to access the value
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure data consistency
    const currentSnapshot = parser.getCurrentSnapshot();
    
    if (currentSnapshot && typeof currentSnapshot === 'object' && 'value' in currentSnapshot) {
      const value = (currentSnapshot as any).value;
      
      if (!metrics.has(metric)) {
        metrics.set(metric, []);
      }
      metrics.get(metric)!.push(value);
      
      console.log(`📈 [${metric}] ${value} ${getMetricUnit(metric)}`);
    }
  }

  console.log(`\n📊 Analytics Summary:`);
  for (const [metric, values] of Array.from(metrics)) {
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const unit = getMetricUnit(metric);
    
    console.log(`  • ${metric}: ${values.length} events, avg: ${avg.toFixed(2)} ${unit}`);
  }
}

async function demoMultiEventSSE() {
  console.log("🎭 Demo 4: Multi-Event SSE Stream");
  console.log("────────────────────────────────\n");

  // Mock multi-event SSE stream with event types
  const multiEventSSEData = [
    'event: user_activity\n',
    'data: {"action":"login","user_id":"user_123","timestamp":"2024-01-15T10:00:00Z"}\n\n',
    
    'event: system_alert\n',
    'data: {"level":"warning","message":"High CPU usage detected","service":"web-server"}\n\n',
    
    'event: user_activity\n',
    'data: {"action":"purchase","user_id":"user_456","amount":29.99,"product":"Premium Plan"}\n\n',
    
    'event: system_alert\n',
    'data: {"level":"info","message":"Backup completed successfully","service":"database"}\n\n',
    
    'event: user_activity\n',
    'data: {"action":"logout","user_id":"user_123","session_duration":"45m"}\n\n'
  ];

  console.log(`📊 Mock multi-event stream: ${multiEventSSEData.length / 2} events`);
  console.log(`🎯 Processing both user_activity and system_alert events\n`);

  const multiEventStream = createMockSSEStream(multiEventSSEData);
  const messageStream = parseSSEMessages(multiEventStream);
  const reader = messageStream.getReader();

  const eventCounts = new Map<string, number>();

  console.log("🔄 [Stream Started] Processing multi-event stream...\n");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const message: SSEMessage = value;
    const eventType = message.event || 'unknown';
    
    eventCounts.set(eventType, (eventCounts.get(eventType) || 0) + 1);
    
    try {
      const data = JSON.parse(message.data);
      const icon = getEventIcon(eventType);
      
      console.log(`${icon} [${eventType}] Event #${eventCounts.get(eventType)}`);
      console.log(`   Data: ${JSON.stringify(data, null, 2).split('\n').join('\n   ')}`);
      console.log("─".repeat(50));
    } catch (error) {
      console.log(`❌ [${eventType}] Invalid JSON data: ${message.data}`);
    }
  }

  console.log(`\n📊 Event Summary:`);
  for (const [eventType, count] of Array.from(eventCounts)) {
    const icon = getEventIcon(eventType);
    console.log(`  ${icon} ${eventType}: ${count} events`);
  }
}

// Helper functions
function createMockSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const sendNext = () => {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]));
          index++;
          setTimeout(sendNext, 200); // Simulate network delay
        } else {
          controller.close();
        }
      };
      sendNext();
    }
  });
}

async function getCorrespondingMessage(parser: any, type: string): Promise<string> {
  const snapshot = parser.getCurrentSnapshot();
  return snapshot?.message || `Message for ${type}`;
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    info: '💙',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };
  return icons[type] || '📢';
}

function getMetricUnit(metric: string): string {
  const units: Record<string, string> = {
    page_views: 'views',
    user_signup: 'users',
    revenue: 'USD',
    error_rate: '%'
  };
  return units[metric] || 'units';
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    user_activity: '👤',
    system_alert: '🔔',
    unknown: '❓'
  };
  return icons[eventType] || '📡';
}