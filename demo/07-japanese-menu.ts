/**
 * Demo 7: Restaurant Menu (Japanese)
 *
 * A practical demo using Japanese restaurant menu data.
 * Demonstrates processing complex Japanese data structures and practical operations like price calculations.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function japaneseMenuDemo() {
  console.log("🍱 Restaurant Menu Demo (Japanese Restaurant)");
  console.log("========================================\n");

  console.log("📍 Scenario: Restaurant menu management and analysis system\n");

  // Detailed menu data for Japanese restaurant
  const menuData = {
    restaurant: {
      name: "Washokudokoro Sakura 🌸",
      type: "High-end Japanese cuisine",
      location: {
        prefecture: "Tokyo",
        city: "Shibuya",
        address: "Ebisu 1-2-3 Sakura Building 2F",
        nearestStation: "5 minutes walk from Ebisu Station",
      },
      businessHours: {
        lunch: "11:30-14:00",
        dinner: "17:30-22:00",
        lastOrder: "21:30",
        holidays: "Mondays",
      },
      rating: {
        overall: 4.7,
        taste: 4.8,
        service: 4.6,
        atmosphere: 4.7,
        value: 4.5,
      },
      categories: [
        {
          id: "cat-001",
          name: "Appetizers & Snacks 🥢",
          description: "Seasonal appetizers using fresh ingredients",
          items: [
            {
              id: "item-001",
              name: "Edamame",
              price: 380,
              description: "Salt-boiled edamame. Perfect with beer",
              calories: 125,
              tags: ["Vegetarian", "🌱", "Gluten-free"],
              popularity: 5,
              available: true,
            },
            {
              id: "item-002",
              name: "Hiyayakko (Cold Tofu)",
              price: 420,
              description: "Silken tofu topped with ginger and green onion",
              calories: 85,
              tags: ["Vegetarian", "🌱", "Low-calorie"],
              popularity: 4,
              available: true,
            },
            {
              id: "item-003",
              name: "Dashimaki Tamago (Rolled Omelet)",
              price: 580,
              description:
                "Fluffy rolled omelet with dashi. Showcases artisan skills",
              calories: 180,
              tags: ["Popular", "🔥", "Artisan craft"],
              popularity: 5,
              available: true,
            },
          ],
        },
        {
          id: "cat-002",
          name: "Sushi & Sashimi 🍣",
          description: "Fresh seafood delivered directly from Tsukiji",
          items: [
            {
              id: "item-004",
              name: "Bluefin Tuna (Akami)",
              price: 280,
              description:
                "Bluefin tuna directly from Tsukiji. Rich deep flavor",
              calories: 120,
              tags: ["Popular", "🔥", "Tsukiji direct"],
              popularity: 5,
              available: true,
              origin: "Oma, Aomori Prefecture",
            },
            {
              id: "item-005",
              name: "Medium Fatty Tuna (Chu-toro)",
              price: 480,
              description: "Premium medium fatty tuna that melts in your mouth",
              calories: 180,
              tags: ["Premium", "💎", "Limited time"],
              popularity: 5,
              available: true,
              origin: "Oma, Aomori Prefecture",
            },
            {
              id: "item-006",
              name: "Norwegian Salmon",
              price: 260,
              description: "Fresh salmon with rich fat content",
              calories: 150,
              tags: ["Popular", "🔥"],
              popularity: 4,
              available: true,
              origin: "Norway",
            },
            {
              id: "item-007",
              name: "Hokkaido Salmon Roe (Ikura)",
              price: 320,
              description: "Fresh salmon roe with delightful popping texture",
              calories: 140,
              tags: ["Premium", "💎", "Hokkaido"],
              popularity: 4,
              available: true,
              origin: "Hokkaido",
            },
          ],
        },
        {
          id: "cat-003",
          name: "Noodles 🍜",
          description: "House-made noodles and special broth",
          items: [
            {
              id: "item-008",
              name: "Shoyu Ramen",
              price: 980,
              description: "Clear chicken-based broth with nostalgic flavor",
              calories: 450,
              tags: ["Classic", "⭐", "House-made noodles"],
              popularity: 4,
              available: true,
              noodleType: "Thin noodles",
            },
            {
              id: "item-009",
              name: "Miso Ramen",
              price: 1080,
              description: "Rich broth using Hokkaido miso",
              calories: 520,
              tags: ["Rich", "🔥", "Hokkaido miso"],
              popularity: 5,
              available: true,
              noodleType: "Thick noodles",
            },
            {
              id: "item-010",
              name: "Zaru Soba (Cold Soba)",
              price: 880,
              description: "Authentic soba using Shinshu buckwheat flour",
              calories: 320,
              tags: ["Healthy", "🌿", "Shinshu"],
              popularity: 4,
              available: true,
              seasonal: "Summer limited",
            },
          ],
        },
        {
          id: "cat-004",
          name: "Desserts 🍡",
          description: "Traditional Japanese sweets",
          items: [
            {
              id: "item-011",
              name: "Matcha Ice Cream",
              price: 380,
              description: "Using matcha from Uji, Kyoto",
              calories: 180,
              tags: ["Popular", "🍵", "Kyoto"],
              popularity: 5,
              available: true,
            },
            {
              id: "item-012",
              name: "Warabi Mochi",
              price: 420,
              description: "Chewy texture topped with kinako powder",
              calories: 150,
              tags: ["Japanese confection", "🍡", "Handmade"],
              popularity: 4,
              available: true,
            },
          ],
        },
      ],
      recommendations: {
        lunch: ["item-008", "item-003", "item-011"],
        dinner: ["item-005", "item-004", "item-009"],
        vegetarian: ["item-001", "item-002", "item-010"],
      },
    },
  };

  const json = JSON.stringify(menuData);
  console.log(`📊 Menu data size: ${json.length} characters`);
  console.log(`🔄 Chunk size: 80 characters\n`);

  // First display restaurant information
  const reader1 = createJSONReadableStreamDefaultReader(json, 80);
  const streamingJSON1 = new StreamingJsonParser(reader1);
  const fullData = await streamingJSON1.getFullResponse();

  console.log(`🏮 ${fullData.restaurant.name}`);
  console.log(`   ${fullData.restaurant.type}`);
  console.log(`\n📍 Location:`);
  console.log(
    `   ${fullData.restaurant.location.prefecture} ${fullData.restaurant.location.city}`
  );
  console.log(`   ${fullData.restaurant.location.address}`);
  console.log(`   ${fullData.restaurant.location.nearestStation}`);

  console.log(`\n🕐 Business Hours:`);
  console.log(`   Lunch: ${fullData.restaurant.businessHours.lunch}`);
  console.log(`   Dinner: ${fullData.restaurant.businessHours.dinner}`);
  console.log(`   Last Order: ${fullData.restaurant.businessHours.lastOrder}`);
  console.log(`   Closed: ${fullData.restaurant.businessHours.holidays}`);

  console.log(`\n⭐ Rating: ${fullData.restaurant.rating.overall}/5.0`);
  const ratingBar = "★".repeat(Math.round(fullData.restaurant.rating.overall));
  console.log(`   ${ratingBar}`);

  console.log("\n" + "─".repeat(60));
  console.log("📋 Menu List:");
  console.log("─".repeat(60));

  // Process menu items
  const reader2 = createJSONReadableStreamDefaultReader(json, 80);
  const streamingJSON2 = new StreamingJsonParser(reader2);

  // Statistics by category
  const categoryStats = new Map<
    string,
    {
      count: number;
      totalPrice: number;
      totalCalories: number;
    }
  >();

  // Statistics by tag
  const tagStats = new Map<string, number>();

  // Price range analysis
  const priceRanges = {
    "Up to 500 yen": 0,
    "501-1000 yen": 0,
    "1001 yen+": 0,
  };

  let totalItems = 0;
  let availableItems = 0;

  // Process all menu items
  for await (const item of streamingJSON2.watch(
    "/restaurant/categories/*/items/*"
  )) {
    totalItems++;
    if (item.available) availableItems++;

    // Classify by price range
    if (item.price <= 500) {
      priceRanges["Up to 500 yen"]++;
    } else if (item.price <= 1000) {
      priceRanges["501-1000 yen"]++;
    } else {
      priceRanges["1001 yen+"]++;
    }

    // Aggregate tags
    item.tags.forEach((tag: string) => {
      tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
    });

    // Display menu items
    console.log(`\n${item.name} - ¥${item.price.toLocaleString()}`);
    console.log(`   📝 ${item.description}`);
    console.log(`   🔥 ${item.calories} kcal`);
    console.log(`   🏷️  ${item.tags.join(" ")}`);

    // Additional information
    if (item.origin) {
      console.log(`   🌍 Origin: ${item.origin}`);
    }
    if (item.seasonal) {
      console.log(`   🍂 ${item.seasonal}`);
    }
    if (item.noodleType) {
      console.log(`   🍜 Noodle type: ${item.noodleType}`);
    }

    // Display popularity
    const popularityStars = "⭐".repeat(item.popularity);
    console.log(`   Popularity: ${popularityStars}`);

    // Stock status
    const stockStatus = item.available ? "✅ Available" : "❌ Out of stock";
    console.log(`   ${stockStatus}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("📊 Menu Analysis Report:");
  console.log("─".repeat(40));

  // Calculate statistics by category
  for (const category of fullData.restaurant.categories) {
    const items = category.items;
    const avgPrice =
      items.reduce((sum: number, item: any) => sum + item.price, 0) /
      items.length;
    const avgCalories =
      items.reduce((sum: number, item: any) => sum + item.calories, 0) /
      items.length;

    console.log(`\n${category.name}`);
    console.log(`   • Number of items: ${items.length} items`);
    console.log(
      `   • Average price: ¥${Math.round(avgPrice).toLocaleString()}`
    );
    console.log(`   • Average calories: ${Math.round(avgCalories)} kcal`);
  }

  // Price range analysis
  console.log("\n💰 Price Range Analysis:");
  for (const [range, count] of Object.entries(priceRanges)) {
    const percentage = ((count / totalItems) * 100).toFixed(0);
    const bar = "█".repeat(Math.floor((count / totalItems) * 20));
    console.log(
      `   ${range.padEnd(15)} ${bar} ${count} items (${percentage}%)`
    );
  }

  // Popular tag ranking
  console.log("\n🏷️  Popular Tags TOP5:");
  const sortedTags = Array.from(tagStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [tag, count] of sortedTags) {
    console.log(`   ${tag} - ${count} items`);
  }

  // Recommendation information
  console.log("\n👨‍🍳 Chef's Recommendations:");
  console.log(
    `   🌞 Lunch: ${fullData.restaurant.recommendations.lunch
      .map((id: string) => {
        const item = fullData.restaurant.categories
          .flatMap((cat: any) => cat.items)
          .find((item: any) => item.id === id);
        return item?.name || id;
      })
      .join(", ")}`
  );

  console.log(
    `   🌙 Dinner: ${fullData.restaurant.recommendations.dinner
      .map((id: string) => {
        const item = fullData.restaurant.categories
          .flatMap((cat: any) => cat.items)
          .find((item: any) => item.id === id);
        return item?.name || id;
      })
      .join(", ")}`
  );

  console.log(
    `   🌱 Vegetarian: ${fullData.restaurant.recommendations.vegetarian
      .map((id: string) => {
        const item = fullData.restaurant.categories
          .flatMap((cat: any) => cat.items)
          .find((item: any) => item.id === id);
        return item?.name || id;
      })
      .join(", ")}`
  );

  // Stock status summary
  console.log(
    `\n📦 Stock Status: ${availableItems}/${totalItems} items available`
  );

  console.log("\n💡 Key Points of This Demo:");
  console.log(
    "  • Japanese product names and descriptions are processed correctly"
  );
  console.log(
    "  • Price calculations and statistical processing work without issues"
  );
  console.log("  • Visual expressions using emoji are possible");
  console.log("  • Applicable to real business applications");
}
