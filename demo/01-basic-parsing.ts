/**
 * Demo 1: Basic Incremental Parsing
 * 
 * This demo shows the basic usage of parsing JSON incrementally in small chunks.
 * The incremental parser generates partial JSON objects as data arrives,
 * ultimately building the complete JSON.
 */

import { incrementalJsonParser } from '../src/index';
import { createJSONReadableStreamDefaultReader } from './supports/create-json-readable-stream-default-reader';

export async function basicParsingDemo() {
  console.log('📚 Basic Incremental Parsing Demo');
  console.log('================================\n');
  
  // Sample data: JSON containing user information and metadata
  const jsonData = {
    users: [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
      { id: 3, name: 'Charlie', age: 35 }
    ],
    metadata: {
      total: 3,
      timestamp: new Date().toISOString()
    }
  };
  
  const json = JSON.stringify(jsonData);
  console.log(`📊 Original JSON size: ${json.length} characters`);
  console.log(`📦 Chunk size: 10 characters\n`);
  
  // Create ReadableStream (split into 10-character chunks)
  const reader = createJSONReadableStreamDefaultReader(json, 10);
  
  console.log('🔄 Parsing progress:');
  console.log('─'.repeat(50));
  
  let updateCount = 0;
  let previousSize = 0;
  
  // Process stream using incremental parser
  for await (const partial of incrementalJsonParser(reader)) {
    updateCount++;
    const currentJson = JSON.stringify(partial);
    const currentSize = currentJson.length;
    
    // Display progress visually
    const progress = Math.round((currentSize / json.length) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 2)).padEnd(50, '░');
    
    console.log(`Update #${updateCount.toString().padStart(2, '0')}: [${progressBar}] ${progress}%`);
    
    // Display first 50 characters (truncate if too long)
    const preview = currentJson.length > 50 
      ? currentJson.substring(0, 47) + '...' 
      : currentJson;
    console.log(`  📝 ${preview}`);
    
    // Detect newly added elements
    if (currentSize > previousSize) {
      console.log(`  ✨ New data: +${currentSize - previousSize} characters`);
    }
    
    previousSize = currentSize;
    console.log('');
  }
  
  console.log('─'.repeat(50));
  console.log(`✅ Parsing complete!`);
  console.log(`📈 Total updates: ${updateCount}`);
  console.log(`📊 Final JSON size: ${previousSize} characters`);
  
  // Memory efficiency explanation
  console.log('\n💡 Key points:');
  console.log('  • Streaming enables memory-efficient processing of large JSON');
  console.log('  • Each update is an immutable snapshot');
  console.log('  • Errors during parsing are properly detected and reported');
}