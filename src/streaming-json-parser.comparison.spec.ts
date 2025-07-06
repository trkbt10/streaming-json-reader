import { describe, it, expect } from "vitest";
import { StreamingJsonParser } from "./streaming-json-parser";

describe("StreamingJsonParser watch vs watchComplete comparison", () => {
  // 逐次組み立てられるJSONデータ
  const testData = {
    timestamp: "2024-01-15T10:30:00Z",
    status: "processing",
    data: {
      users: [
        { id: 1, name: "Alice", email: "alice@example.com", active: true },
        { id: 2, name: "Bob", email: "bob@example.com", active: false },
        { id: 3, name: "Charlie", email: "charlie@example.com", active: true }
      ],
      metrics: {
        total_users: 3,
        active_users: 2,
        last_updated: "2024-01-15T10:25:00Z"
      }
    },
    metadata: {
      version: "1.2.0",
      generated_by: "streaming-json-reader-demo"
    }
  };

  const json = JSON.stringify(testData, null, 2);

  // ストリームを作成する関数（文字ごとに送信）
  function createStreamingData(jsonString: string): ReadableStream<Uint8Array> {
    let index = 0;
    
    return new ReadableStream({
      start(controller) {
        function sendNext() {
          if (index < jsonString.length) {
            const char = jsonString[index];
            controller.enqueue(new TextEncoder().encode(char));
            index++;
            // Use setTimeout to simulate streaming delay
            setTimeout(sendNext, 1); // Very fast for testing
          } else {
            controller.close();
          }
        }
        sendNext();
      }
    });
  }

  // watch()の結果を収集
  async function collectWatchResults(): Promise<any[]> {
    const stream = createStreamingData(json);
    const reader = stream.getReader();
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    
    try {
      for await (const user of parser.watch('/data/users/*')) {
        results.push({
          method: 'watch()',
          data: user,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      throw error;
    }
    
    return results;
  }

  // watchComplete()の結果を収集
  async function collectWatchCompleteResults(): Promise<any[]> {
    const stream = createStreamingData(json);
    const reader = stream.getReader();
    const parser = new StreamingJsonParser(reader);
    
    const results: any[] = [];
    
    try {
      for await (const user of parser.watchComplete('/data/users/*')) {
        results.push({
          method: 'watchComplete()',
          data: user,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      throw error;
    }
    
    return results;
  }

  it("should demonstrate watch() yields partial objects during streaming", async () => {
    const results = await collectWatchResults();
    
    // watch() should yield multiple times with partial objects
    expect(results.length).toBeGreaterThan(3); // More than just complete users
    
    // Should include empty objects and partial objects
    const hasEmptyObject = results.some(r => 
      typeof r.data === 'object' && Object.keys(r.data).length === 0
    );
    const hasPartialObject = results.some(r => 
      r.data && r.data.id && !r.data.name
    );
    
    expect(hasEmptyObject).toBe(true);
    expect(hasPartialObject).toBe(true);
    
    // Should eventually yield complete objects
    const completeUsers = results.filter(r => 
      r.data && r.data.id && r.data.name && r.data.email && r.data.hasOwnProperty('active')
    );
    expect(completeUsers).toHaveLength(3);
  });

  it("should demonstrate watchComplete() yields only complete objects", async () => {
    const results = await collectWatchCompleteResults();
    
    // watchComplete() should yield exactly 3 complete users
    expect(results).toHaveLength(3);
    
    // All results should be complete user objects
    results.forEach((result, index) => {
      expect(result.method).toBe('watchComplete()');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('email');
      expect(result.data).toHaveProperty('active');
      
      // Verify actual user data
      const expectedUser = testData.data.users[index];
      expect(result.data).toEqual(expectedUser);
    });
  });

  it("should compare timing behavior between watch() and watchComplete()", async () => {
    const [watchResults, watchCompleteResults] = await Promise.all([
      collectWatchResults(),
      collectWatchCompleteResults()
    ]);
    
    // watch() should yield more times than watchComplete()
    expect(watchResults.length).toBeGreaterThan(watchCompleteResults.length);
    
    // watchComplete() should yield exactly the number of complete objects
    expect(watchCompleteResults.length).toBe(testData.data.users.length);
    
    // All watchComplete() results should have very similar timestamps (yielded together)
    if (watchCompleteResults.length > 1) {
      const timestamps = watchCompleteResults.map(r => r.timestamp);
      const timeDiff = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timeDiff).toBeLessThan(100); // Should be within 100ms
    }
  });

  it("should demonstrate data quality differences", async () => {
    const [watchResults, watchCompleteResults] = await Promise.all([
      collectWatchResults(),
      collectWatchCompleteResults()
    ]);
    
    // Analyze watch() results
    const watchIncludesPartial = watchResults.some(r => 
      !r.data || 
      Object.keys(r.data).length === 0 || 
      (r.data.id && !r.data.name) ||
      (r.data.id && r.data.name && !r.data.email)
    );
    
    // Analyze watchComplete() results  
    const watchCompleteOnlyComplete = watchCompleteResults.every(r => 
      r.data && 
      r.data.id && 
      r.data.name && 
      r.data.email && 
      r.data.hasOwnProperty('active')
    );
    
    expect(watchIncludesPartial).toBe(true);
    expect(watchCompleteOnlyComplete).toBe(true);
  });

  it("should handle complex nested structures consistently", async () => {
    const complexData = {
      posts: [
        { 
          id: 1, 
          title: "Post 1", 
          author: { name: "Alice", id: 101 },
          comments: [
            { id: 1, text: "Great post!" },
            { id: 2, text: "Thanks for sharing" }
          ]
        },
        { 
          id: 2, 
          title: "Post 2", 
          author: { name: "Bob", id: 102 },
          comments: [
            { id: 3, text: "Interesting read" }
          ]
        }
      ]
    };

    const complexJson = JSON.stringify(complexData);
    
    // Test watch() with nested structure
    const watchStream = createStreamingData(complexJson);
    const watchReader = watchStream.getReader();
    const watchParser = new StreamingJsonParser(watchReader);
    
    const watchPosts: any[] = [];
    for await (const post of watchParser.watch('/posts/*')) {
      watchPosts.push(post);
    }
    
    // Test watchComplete() with nested structure
    const completeStream = createStreamingData(complexJson);
    const completeReader = completeStream.getReader();
    const completeParser = new StreamingJsonParser(completeReader);
    
    const completePosts: any[] = [];
    for await (const post of completeParser.watchComplete('/posts/*')) {
      completePosts.push(post);
    }
    
    // watch() should include partial posts
    expect(watchPosts.length).toBeGreaterThan(2);
    
    // watchComplete() should only include complete posts
    expect(completePosts).toHaveLength(2);
    completePosts.forEach(post => {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('author');
      expect(post).toHaveProperty('comments');
      expect(post.author).toHaveProperty('name');
      expect(post.author).toHaveProperty('id');
      expect(Array.isArray(post.comments)).toBe(true);
    });
  });

  it("should extract deeply nested array elements correctly", async () => {
    const nestedData = {
      departments: [
        {
          name: "Engineering",
          teams: [
            { name: "Frontend", members: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] },
            { name: "Backend", members: [{ id: 3, name: "Charlie" }] }
          ]
        },
        {
          name: "Design", 
          teams: [
            { name: "UX", members: [{ id: 4, name: "David" }] }
          ]
        }
      ]
    };

    const nestedJson = JSON.stringify(nestedData);
    
    // Test watch() with deeply nested path
    const watchStream = createStreamingData(nestedJson);
    const watchReader = watchStream.getReader();
    const watchParser = new StreamingJsonParser(watchReader);
    
    const watchMembers: any[] = [];
    for await (const member of watchParser.watch('/departments/*/teams/*/members/*')) {
      watchMembers.push(member);
    }
    
    // Test watchComplete() with deeply nested path
    const completeStream = createStreamingData(nestedJson);
    const completeReader = completeStream.getReader();
    const completeParser = new StreamingJsonParser(completeReader);
    
    const completeMembers: any[] = [];
    for await (const member of completeParser.watchComplete('/departments/*/teams/*/members/*')) {
      completeMembers.push(member);
    }
    
    // watch() should include partial members
    expect(watchMembers.length).toBeGreaterThan(4);
    
    // watchComplete() should only include complete members
    expect(completeMembers).toHaveLength(4);
    completeMembers.forEach(member => {
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name');
    });
    
    // Verify specific members
    const memberNames = completeMembers.map(m => m.name);
    expect(memberNames).toContain('Alice');
    expect(memberNames).toContain('Bob');
    expect(memberNames).toContain('Charlie');
    expect(memberNames).toContain('David');
  });
});