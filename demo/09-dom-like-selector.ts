/**
 * Demo 9: DOM-like Selector API
 * 
 * Demonstrates the new DOM-like selector API that allows hierarchical navigation
 * of JSON structures similar to how DOM elements can be queried and traversed.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function domLikeSelectorDemo() {
  console.log("🎯 DOM-like Selector API Demo");
  console.log("=============================\n");

  // Example 1: Basic selector usage with mixed array
  console.log("📋 Example 1: Mixed Array Navigation");
  console.log("------------------------------------");
  
  const mixedJson = '{"mixed": [1, "string", {"obj": true}, [1, 2, 3], null]}';
  const mixedReader = createJSONReadableStreamDefaultReader(mixedJson, 4);
  const mixedParser = new StreamingJsonParser(mixedReader);

  console.log("Original JSON:", mixedJson);
  console.log("\nIterating through mixed array elements:");
  
  for await (const node of mixedParser.select('/mixed/*')) {
    console.log(`\nNode at path '${node.path}' (type: ${node.type}):`);
    
    // Use AsyncIterator to get the value
    for await (const { value, done } of node) {
      console.log(`  Value: ${JSON.stringify(value)}`);
      console.log(`  Complete: ${done}`);
    }
  }

  // Example 2: Nested object navigation
  console.log("\n\n📋 Example 2: Nested Object Navigation");
  console.log("--------------------------------------");
  
  const nestedJson = JSON.stringify({
    users: [
      { id: 1, profile: { name: "Alice", age: 30, settings: { theme: "dark" } } },
      { id: 2, profile: { name: "Bob", age: 25, settings: { theme: "light" } } }
    ]
  });
  
  const nestedReader = createJSONReadableStreamDefaultReader(nestedJson, 10);
  const nestedParser = new StreamingJsonParser(nestedReader);

  console.log("Navigating to user profiles:");
  
  // First, select all users
  for await (const userNode of nestedParser.select('/users/*')) {
    console.log(`\nUser at ${userNode.path}:`);
    
    // Then navigate to their profiles
    for await (const profileNode of userNode.select('/profile')) {
      const profile = await profileNode.getValue();
      console.log(`  Profile: ${JSON.stringify(profile)}`);
      
      // Navigate even deeper to settings
      for await (const settingsNode of profileNode.select('/settings')) {
        const settings = await settingsNode.getValue();
        console.log(`  Settings: ${JSON.stringify(settings)}`);
      }
    }
  }

  // Example 3: Using querySelector for single elements
  console.log("\n\n📋 Example 3: querySelector Usage");
  console.log("---------------------------------");
  
  const dataJson = JSON.stringify({
    data: {
      items: ["first", "second", "third"],
      metadata: { count: 3, type: "demo" }
    }
  });
  
  const dataReader = createJSONReadableStreamDefaultReader(dataJson, 8);
  const dataParser = new StreamingJsonParser(dataReader);

  // Get first item using querySelector
  const firstItemNode = await dataParser.querySelector('/data/items/0');
  if (firstItemNode) {
    console.log(`First item at '${firstItemNode.path}': ${await firstItemNode.getValue()}`);
  }

  // Get metadata using querySelector
  const metadataNode = await dataParser.querySelector('/data/metadata');
  if (metadataNode) {
    console.log(`Metadata at '${metadataNode.path}': ${JSON.stringify(await metadataNode.getValue())}`);
  }

  // Example 4: Using querySelectorAll (alias for select)
  console.log("\n\n📋 Example 4: querySelectorAll Usage");
  console.log("------------------------------------");
  
  const itemsJson = JSON.stringify({
    products: [
      { id: 1, name: "Laptop", price: 999 },
      { id: 2, name: "Mouse", price: 29 },
      { id: 3, name: "Keyboard", price: 79 }
    ]
  });
  
  const itemsReader = createJSONReadableStreamDefaultReader(itemsJson, 12);
  const itemsParser = new StreamingJsonParser(itemsReader);

  console.log("All product names:");
  
  // Use querySelectorAll to get all product name nodes
  for await (const nameNode of itemsParser.querySelectorAll('/products/*/name')) {
    const name = await nameNode.getValue();
    console.log(`  - ${name} (at ${nameNode.path})`);
  }

  // Example 5: Type detection
  console.log("\n\n📋 Example 5: Node Type Detection");
  console.log("---------------------------------");
  
  const typesJson = JSON.stringify({
    object: { key: "value" },
    array: [1, 2, 3],
    string: "text",
    number: 42,
    boolean: true,
    null: null
  });
  
  const typesReader = createJSONReadableStreamDefaultReader(typesJson, 5);
  const typesParser = new StreamingJsonParser(typesReader);

  console.log("Node types:");
  
  for (const key of ['object', 'array', 'string', 'number', 'boolean', 'null']) {
    const node = await typesParser.querySelector(`/${key}`);
    if (node) {
      const value = await node.getValue();
      console.log(`  /${key}: type='${node.type}', value=${JSON.stringify(value)}`);
    }
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  domLikeSelectorDemo().catch(console.error);
}