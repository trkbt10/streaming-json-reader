/**
 * Creates a ReadableStreamDefaultReader from a JSON string, chunking it into specified sizes.
 * Useful for simulating streaming JSON data in demos and tests.
 * 
 * @param json - The JSON string to stream
 * @param chunkSize - Size of each chunk (default: 32)
 * @returns A ReadableStreamDefaultReader that yields string chunks
 */
export function createJSONReadableStreamDefaultReader(
  json: string,
  chunkSize = 32
): ReadableStreamDefaultReader<string> {
  const stream = new ReadableStream<string>({
    start(controller) {
      let position = 0;
      while (position < json.length) {
        const chunk = json.slice(position, position + chunkSize);
        controller.enqueue(chunk);
        position += chunkSize;
      }
      controller.close();
    }
  });
  return stream.getReader();
}