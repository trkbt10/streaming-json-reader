import {incrementalJsonParser} from './incrementalJsonParser';
const createJSONReadableStreamDefaultReader = (json: string, chunkSize = 32): 
ReadableStreamDefaultReader<string> => {
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

describe('incrementalJsonParser', () => {
  it ('should parse a simple JSON object', async () => {
  const json = '{"key": "value"}';
  const readable = createJSONReadableStreamDefaultReader(json);
    const parser = incrementalJsonParser(readable);
    let dest :any = null;
    for await (const update of parser) {
      dest = update;
    }
    expect(dest).toEqual(JSON.parse(json));
    expect(parser).toBeDefined();

  })
  it('parses streaming json and yields snapshots', async () => {
    const json = '{"a":1,"b":[{"c":2},3]}';
    const reader = createJSONReadableStreamDefaultReader(json, 5);

    const results: any[] = [];
    for await (const obj of incrementalJsonParser(reader)) {
      results.push(obj);
    }
    expect(results.length > 1).toBe(true);
    expect(results[results.length - 1]).toEqual(JSON.parse(json));
    // ensure immutability
    if (results.length >= 2) {
      expect(results[results.length - 2]).not.toBe(results[results.length - 1]);
    }
  });
  it ('deeply nested json', async () => {
    const json = JSON.stringify({
      author: {
        name: "宮沢賢治",
        age: 37,
        works: [
          {
            title: "銀河鉄道の夜",
            year: 1927,
            description: "銀河を旅する少年の物語"
          },
          {
            title: "注文の多い料理店",
            year: 1924,   
            description: "不思議な料理店での出来事"
          },
          {
            title: "風の又三郎",
            year: 1931,
            description: "風とともに生きる少年の物語"
          }
        ],
        birth: {
          year: 1896,
          month: 8,
          day: 27
        },
      },
      content: {
        title: 'ポラーノの広場',
        year: 1934,
        description: 'ポラーノの広場での出来事',
        data: [
          `ポラーノの広場`,
          'そのころわたくしは、モリーオ市の博物局に勤めて居りました。',
          '十八等官でしたから役所の中でも、ずうっと下の方でしたし、',
        ]
      }
    })
    const reader = createJSONReadableStreamDefaultReader(json, 5);

    const results: any[] = [];
    for await (const obj of incrementalJsonParser(reader)) {
      results.push(obj);
    }
    expect(results.length > 1).toBe(true);
    expect(results[results.length - 1]).toEqual(JSON.parse(json));
  }
  )
})
