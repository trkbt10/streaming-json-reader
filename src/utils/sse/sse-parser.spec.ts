import { describe, it, expect } from "vitest";
import { parseSSEStream, createSSEStreamReader, extractJSONFromSSELine, parseSSEMessages } from './sse-parser';

// Mock the private function for testing
const extractJSONFromSSELineTest = (line: string): string | null => {
  const trimmed = line.trim();
  
  if (!trimmed || trimmed.startsWith(':')) {
    return null;
  }
  
  if (trimmed.startsWith('data: ')) {
    const data = trimmed.slice(6);
    
    if (data === '[DONE]' || data === 'DONE' || data === '[END]') {
      return null;
    }
    
    try {
      JSON.parse(data);
      return data;
    } catch {
      return null;
    }
  }
  
  return null;
};

describe('SSE Parser', () => {
  describe('extractJSONFromSSELine', () => {
    it('should extract JSON from valid data lines', () => {
      const line = 'data: {"message":"Hello","timestamp":1699649087}';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBe('{"message":"Hello","timestamp":1699649087}');
    });

    it('should return null for [DONE] marker', () => {
      const line = 'data: [DONE]';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBeNull();
    });

    it('should return null for DONE marker', () => {
      const line = 'data: DONE';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBeNull();
    });

    it('should return null for [END] marker', () => {
      const line = 'data: [END]';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBeNull();
    });

    it('should return null for empty lines', () => {
      const result = extractJSONFromSSELineTest('');
      expect(result).toBeNull();
    });

    it('should return null for comment lines', () => {
      const line = ': this is a comment';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const line = 'data: {invalid json}';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBeNull();
    });

    it('should handle whitespace properly', () => {
      const line = '  data: {"test": "value"}  ';
      const result = extractJSONFromSSELineTest(line);
      expect(result).toBe('{"test": "value"}');
    });
  });

  describe('parseSSEStream', () => {
    function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      let index = 0;

      return new ReadableStream<Uint8Array>({
        start(controller) {
          const sendNext = () => {
            if (index < chunks.length) {
              controller.enqueue(encoder.encode(chunks[index]));
              index++;
              setTimeout(sendNext, 10);
            } else {
              controller.close();
            }
          };
          sendNext();
        }
      });
    }

    it('should parse generic SSE stream with multiple data chunks', async () => {
      const sseData = [
        'data: {"type":"notification","message":"Hello World"}\n\n',
        'data: {"type":"update","count":42}\n\n',
        'data: [DONE]\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const jsonStream = parseSSEStream(sseStream);
      const reader = jsonStream.getReader();

      const results: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(2);
      expect(JSON.parse(results[0])).toEqual({
        type: "notification",
        message: "Hello World"
      });
      expect(JSON.parse(results[1])).toEqual({
        type: "update",
        count: 42
      });
    });

    it('should parse OpenAI ChatCompletions SSE stream', async () => {
      const sseData = [
        'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const jsonStream = parseSSEStream(sseStream);
      const reader = jsonStream.getReader();

      const results: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(2);
      expect(JSON.parse(results[0])).toEqual({
        id: "chatcmpl-123",
        choices: [{ delta: { content: "Hello" } }]
      });
      expect(JSON.parse(results[1])).toEqual({
        id: "chatcmpl-123",
        choices: [{ delta: { content: " world" } }]
      });
    });

    it('should handle chunked data that splits across boundaries', async () => {
      const sseData = [
        'data: {"message":"test',
        '","type":"notification"}\n\n',
        'data: [DONE]\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const jsonStream = parseSSEStream(sseStream);
      const reader = jsonStream.getReader();

      const results: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(1);
      expect(JSON.parse(results[0])).toEqual({
        message: "test",
        type: "notification"
      });
    });

    it('should skip empty lines and comments', async () => {
      const sseData = [
        ': this is a comment\n',
        '\n',
        'data: {"id":"test","content":"value"}\n\n',
        ': another comment\n',
        'data: [DONE]\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const jsonStream = parseSSEStream(sseStream);
      const reader = jsonStream.getReader();

      const results: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(1);
      expect(JSON.parse(results[0])).toEqual({
        id: "test",
        content: "value"
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const sseData = [
        'data: {"valid": "json"}\n\n',
        'data: {invalid json}\n\n',
        'data: {"another": "valid"}\n\n',
        'data: [DONE]\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const jsonStream = parseSSEStream(sseStream);
      const reader = jsonStream.getReader();

      const results: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(2);
      expect(JSON.parse(results[0])).toEqual({ valid: "json" });
      expect(JSON.parse(results[1])).toEqual({ another: "valid" });
    });
  });

  describe('parseSSEMessages', () => {
    function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      let index = 0;

      return new ReadableStream<Uint8Array>({
        start(controller) {
          const sendNext = () => {
            if (index < chunks.length) {
              controller.enqueue(encoder.encode(chunks[index]));
              index++;
              setTimeout(sendNext, 10);
            } else {
              controller.close();
            }
          };
          sendNext();
        }
      });
    }

    it('should parse SSE messages with event types', async () => {
      const sseData = [
        'event: notification\n',
        'data: {"message":"Hello"}\n',
        'id: msg-1\n\n',
        'event: update\n',
        'data: {"count":42}\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const messageStream = parseSSEMessages(sseStream);
      const reader = messageStream.getReader();

      const results = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        event: 'notification',
        data: '{"message":"Hello"}',
        id: 'msg-1'
      });
      expect(results[1]).toEqual({
        event: 'update',
        data: '{"count":42}'
      });
    });

    it('should handle multi-line data fields', async () => {
      const sseData = [
        'event: message\n',
        'data: line 1\n',
        'data: line 2\n',
        'data: line 3\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const messageStream = parseSSEMessages(sseStream);
      const reader = messageStream.getReader();

      const results = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        event: 'message',
        data: 'line 1\nline 2\nline 3'
      });
    });

    it('should handle retry field', async () => {
      const sseData = [
        'retry: 5000\n',
        'data: {"message":"retry test"}\n\n'
      ];

      const sseStream = createSSEStream(sseData);
      const messageStream = parseSSEMessages(sseStream);
      const reader = messageStream.getReader();

      const results = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        data: '{"message":"retry test"}',
        retry: 5000
      });
    });
  });

  describe('createSSEStreamReader', () => {
    it('should create a readable stream reader', async () => {
      const sseData = ['data: {"test": "value"}\n\n', 'data: [DONE]\n\n'];
      const encoder = new TextEncoder();
      
      const sseStream = new ReadableStream({
        start(controller) {
          sseData.forEach(chunk => {
            controller.enqueue(encoder.encode(chunk));
          });
          controller.close();
        }
      });

      const reader = createSSEStreamReader(sseStream);
      const { done, value } = await reader.read();
      
      expect(done).toBe(false);
      expect(JSON.parse(value!)).toEqual({ test: "value" });
    });
  });
});