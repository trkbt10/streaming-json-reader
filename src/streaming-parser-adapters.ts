import { StreamingJsonParser } from "./streaming-json-parser";
import { parseSSEStream } from "./utils/sse";

/**
 * Options for extracting JSON content from SSE messages
 */
export interface SSEJsonExtractorOptions {
  /**
   * Function to extract JSON content from each SSE message object
   * @param sseMessage - The parsed SSE message object
   * @returns The JSON content string to be added to the stream, or null to skip
   */
  extractContent: (sseMessage: any) => string | null;

  /**
   * Optional function to determine if the SSE stream should end
   * @param sseMessage - The parsed SSE message object
   * @returns true if the stream should end
   */
  shouldEnd?: (sseMessage: any) => boolean;
}

/**
 * Options for extracting content from streaming objects
 */
export interface ObjectStreamExtractorOptions<T> {
  /**
   * Function to extract content from each streaming object
   * @param chunk - The streaming object/chunk
   * @returns The content string to be added to the stream, or null to skip
   */
  extractContent: (chunk: T) => string | null;

  /**
   * Optional function to determine if the stream should end
   * @param chunk - The streaming object/chunk
   * @returns true if the stream should end
   */
  shouldEnd?: (chunk: T) => boolean;
}

/**
 * Creates a StreamingJsonParser from an SSE stream with custom content extraction
 *
 * @param sseStream - ReadableStream containing SSE formatted data
 * @param options - Options for extracting JSON content from SSE messages
 * @returns Promise<StreamingJsonParser> ready to use with watch/watchComplete
 *
 * @example
 * ```typescript
 * // OpenAI ChatCompletions
 * const parser = await createSSEJsonStreamingParser(response.body!, {
 *   extractContent: (chunk) => {
 *     return chunk.choices?.[0]?.delta?.content || null;
 *   },
 *   shouldEnd: (chunk) => chunk.choices?.[0]?.finish_reason === 'stop'
 * });
 *
 * for await (const story of parser.watchComplete("/story")) {
 *   console.log("Complete story:", story);
 * }
 *
 * // Generic API with different structure
 * const parser2 = await createSSEJsonStreamingParser(response.body!, {
 *   extractContent: (msg) => msg.data?.text || null,
 *   shouldEnd: (msg) => msg.type === 'done'
 * });
 * ```
 */
export function createSSEJsonStreamingParser(
  sseStream: ReadableStream<Uint8Array>,
  options: SSEJsonExtractorOptions
): StreamingJsonParser {
  // Parse SSE stream to get JSON strings
  const sseJsonStream = parseSSEStream(sseStream);
  const sseReader = sseJsonStream.getReader();

  // Create a new stream that extracts and reconstructs the inner JSON
  const innerJsonStream = new ReadableStream<string>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await sseReader.read();
          if (done) {
            controller.close();
            break;
          }

          try {
            const sseMessage = JSON.parse(value);

            // Check if we should end the stream
            if (options.shouldEnd && options.shouldEnd(sseMessage)) {
              controller.close();
              break;
            }

            // Extract content using the provided function
            const content = options.extractContent(sseMessage);
            if (content !== null) {
              controller.enqueue(content);
            }
          } catch (parseError) {
            // Skip invalid JSON messages
            console.warn("Failed to parse SSE message:", parseError);
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        sseReader.releaseLock();
      }
    },
  });

  return new StreamingJsonParser(innerJsonStream.getReader());
}

/**
 * Creates a StreamingJsonParser from an async iterable of parsed objects
 *
 * @param objectStream - AsyncIterable containing parsed objects
 * @param options - Options for extracting content from each object
 * @returns StreamingJsonParser ready to use with watch/watchComplete
 *
 * @example
 * ```typescript
 * // OpenAI streaming
 * const parser = createObjectStreamingParser(openaiResponse, {
 *   extractContent: (chunk) => chunk.choices?.[0]?.delta?.content || null,
 *   shouldEnd: (chunk) => chunk.choices?.[0]?.finish_reason === "stop"
 * });
 *
 * for await (const item of parser.watchComplete("/items/*")) {
 *   console.log("Complete item:", item);
 * }
 * ```
 */
export function createObjectStreamingParser<T>(
  objectStream: AsyncIterable<T>,
  options: ObjectStreamExtractorOptions<T>
): StreamingJsonParser {
  // Create a stream that extracts content from parsed objects
  const contentStream = new ReadableStream<string>({
    async start(controller) {
      try {
        let streamEnded = false;
        
        for await (const chunk of objectStream) {
          // Check if we should end the stream
          if (options.shouldEnd && options.shouldEnd(chunk)) {
            controller.close();
            streamEnded = true;
            break;
          }

          // Extract content using the provided function
          const content = options.extractContent(chunk);
          if (content !== null) {
            controller.enqueue(content);
          }
        }

        // Close the stream if we reach the end naturally and haven't already closed
        if (!streamEnded) {
          controller.close();
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new StreamingJsonParser(contentStream.getReader());
}

/**
 * Predefined extractors for common SSE JSON formats
 */
export const SSEJsonExtractors = {
  /**
   * OpenAI ChatCompletions format extractor
   */
  openAIChatCompletions: {
    extractContent: (chunk: any) => {
      return chunk.choices?.[0]?.delta?.content || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.choices?.[0]?.finish_reason === "stop";
    },
  } as SSEJsonExtractorOptions,
  /**
   * Anthropic Claude format extractor (example)
   */
  anthropicClaude: {
    extractContent: (chunk: any) => {
      return chunk.delta?.text || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.type === "message_stop";
    },
  } as SSEJsonExtractorOptions,

  /**
   * Generic format extractor - assumes content is in a 'content' field
   */
  generic: {
    extractContent: (chunk: any) => {
      return chunk.content || chunk.data?.content || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.done === true || chunk.finished === true;
    },
  } as SSEJsonExtractorOptions,
};

/**
 * Predefined extractors for common object stream formats
 */
export const ObjectStreamExtractors = {
  /**
   * OpenAI ChatCompletions format extractor for parsed objects
   */
  openAIChatCompletions: {
    extractContent: (chunk: any) => {
      return chunk.choices?.[0]?.delta?.content || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.choices?.[0]?.finish_reason === "stop";
    },
  } as ObjectStreamExtractorOptions<any>,

  /**
   * Anthropic Claude format extractor for parsed objects
   */
  anthropicClaude: {
    extractContent: (chunk: any) => {
      return chunk.delta?.text || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.type === "message_stop";
    },
  } as ObjectStreamExtractorOptions<any>,

  /**
   * Generic format extractor for parsed objects
   */
  generic: {
    extractContent: (chunk: any) => {
      return chunk.content || chunk.data?.content || chunk.text || null;
    },
    shouldEnd: (chunk: any) => {
      return chunk.done === true || chunk.finished === true || chunk.end === true;
    },
  } as ObjectStreamExtractorOptions<any>,
};
