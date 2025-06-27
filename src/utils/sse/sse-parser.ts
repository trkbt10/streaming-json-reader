/**
 * Utility functions for parsing Server-Sent Events (SSE) streams
 * and converting them to JSON streams for use with StreamingJsonParser
 *
 * Supports the standard SSE format as defined in the HTML5 specification:
 * https://html.spec.whatwg.org/multipage/server-sent-events.html
 */

import { StreamingJsonParser } from "../../streaming-json-parser";

export interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

/**
 * Parses Server-Sent Events (SSE) stream format and extracts JSON data chunks
 *
 * @param sseStream - ReadableStream containing SSE formatted data
 * @returns ReadableStream of JSON strings
 *
 * @example
 * ```typescript
 * // General SSE usage
 * const response = await fetch('/events', {
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const jsonStream = parseSSEStream(response.body!);
 * const parser = new StreamingJsonParser(jsonStream.getReader());
 *
 * // OpenAI ChatCompletions usage
 * const chatResponse = await fetch('/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const chatJsonStream = parseSSEStream(chatResponse.body!);
 * const chatParser = new StreamingJsonParser(chatJsonStream.getReader());
 *
 * for await (const content of chatParser.watch('/choices/0/delta/content')) {
 *   console.log('Chat content:', content);
 * }
 * ```
 */
export function parseSSEStream(
  sseStream: ReadableStream<Uint8Array>
): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<string>({
    async start(controller) {
      const reader = sseStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              const lines = buffer.split("\n");
              for (const line of lines) {
                const jsonChunk = extractJSONFromSSELine(line);
                if (jsonChunk) {
                  controller.enqueue(jsonChunk);
                }
              }
            }
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            const jsonChunk = extractJSONFromSSELine(line);
            if (jsonChunk) {
              controller.enqueue(jsonChunk);
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Parses SSE stream and yields complete SSEMessage objects instead of just JSON strings
 *
 * @param sseStream - ReadableStream containing SSE formatted data
 * @returns ReadableStream of SSEMessage objects
 *
 * @example
 * ```typescript
 * const response = await fetch('/events');
 * const messageStream = parseSSEMessages(response.body!);
 * const reader = messageStream.getReader();
 *
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *
 *   console.log('Event:', value.event);
 *   console.log('Data:', value.data);
 *   console.log('ID:', value.id);
 * }
 * ```
 */
export function parseSSEMessages(
  sseStream: ReadableStream<Uint8Array>
): ReadableStream<SSEMessage> {
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<SSEMessage>({
    async start(controller) {
      const reader = sseStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              const message = parseSSEMessageFromBuffer(buffer);
              if (message) {
                controller.enqueue(message);
              }
            }
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete messages (separated by double newlines)
          const messages = buffer.split("\n\n");
          buffer = messages.pop() || ""; // Keep incomplete message in buffer

          for (const messageText of messages) {
            const message = parseSSEMessageFromBuffer(messageText);
            if (message) {
              controller.enqueue(message);
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Extracts JSON from a single SSE data line
 *
 * @param line - Single line from SSE stream
 * @returns JSON string if valid data line, null otherwise
 */
export function extractJSONFromSSELine(line: string): string | null {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith(":")) {
    return null;
  }

  // Handle data lines
  if (trimmed.startsWith("data: ")) {
    const data = trimmed.slice(6); // Remove 'data: ' prefix

    // Skip common termination markers
    if (data === "[DONE]" || data === "DONE" || data === "[END]") {
      return null;
    }

    try {
      // Validate JSON and return it
      JSON.parse(data);
      return data;
    } catch {
      // Invalid JSON, skip this line
      return null;
    }
  }

  return null;
}

/**
 * Parses a complete SSE message from buffer text
 */
function parseSSEMessageFromBuffer(messageText: string): SSEMessage | null {
  const lines = messageText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 0) {
    return null;
  }

  const message: SSEMessage = { data: "" };

  for (const line of lines) {
    if (line.startsWith(":")) {
      // Comment line, skip
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      // Line without colon is treated as field name with empty value
      continue;
    }

    const field = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove leading space if present (SSE spec)
    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    switch (field) {
      case "data":
        if (message.data) {
          message.data += "\n" + value;
        } else {
          message.data = value;
        }
        break;
      case "event":
        message.event = value;
        break;
      case "id":
        message.id = value;
        break;
      case "retry":
        const retryNum = parseInt(value, 10);
        if (!isNaN(retryNum)) {
          message.retry = retryNum;
        }
        break;
    }
  }

  return message.data ? message : null;
}

/**
 * Creates a ReadableStreamDefaultReader from an SSE stream
 * This is a convenience function that combines parseSSEStream with getReader()
 *
 * @param sseStream - ReadableStream containing SSE formatted data
 * @returns ReadableStreamDefaultReader for use with StreamingJsonParser
 *
 * @example
 * ```typescript
 * // Generic SSE API
 * const response = await fetch('/api/events', {
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const reader = createSSEStreamReader(response.body!);
 * const parser = new StreamingJsonParser(reader);
 *
 * // OpenAI ChatCompletions
 * const chatResponse = await fetch('/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const chatReader = createSSEStreamReader(chatResponse.body!);
 * const chatParser = new StreamingJsonParser(chatReader);
 *
 * for await (const chunk of chatParser.watch('/choices/0/delta/content')) {
 *   console.log('Content:', chunk);
 * }
 * ```
 */
export function createSSEStreamReader(
  sseStream: ReadableStream<Uint8Array>
): ReadableStreamDefaultReader<string> {
  return parseSSEStream(sseStream).getReader();
}

/**
 * Convenience function to create a StreamingJsonParser from an SSE stream
 *
 * @param sseStream - ReadableStream containing SSE formatted data
 * @returns StreamingJsonParser instance ready to use
 *
 * @example
 * ```typescript
 * import { createSSEStreamingParser } from './utils/sse-parser';
 *
 * // Generic usage
 * const response = await fetch('/api/notifications', {
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const parser = createSSEStreamingParser(response.body!);
 *
 * for await (const notification of parser.watch('/message')) {
 *   console.log('New notification:', notification);
 * }
 *
 * // OpenAI usage
 * const chatResponse = await fetch('/chat/completions', {
 *   method: 'POST',
 *   headers: { 'Accept': 'text/event-stream' }
 * });
 * const chatParser = createSSEStreamingParser(chatResponse.body!);
 *
 * for await (const content of chatParser.watch('/choices/0/delta/content')) {
 *   console.log('Chat content:', content);
 * }
 *
 * // Get full response
 * const fullResponse = await chatParser.getFullResponse();
 * console.log('Complete response:', fullResponse);
 * ```
 */
export async function createSSEStreamingParser(
  sseStream: ReadableStream<Uint8Array>
) {
  const reader = createSSEStreamReader(sseStream);
  return new StreamingJsonParser(reader);
}
