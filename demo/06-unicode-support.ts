/**
 * Demo 6: Unicode Support (Japanese & Emoji)
 *
 * Demonstrates processing JSON containing Unicode characters such as Japanese and emoji.
 * Proves that even multibyte characters can be properly processed in streaming.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function unicodeSupportDemo() {
  console.log("🌏 Unicode Support Demo (日本語 & Emoji)");
  console.log("======================================\n");

  console.log("📝 Scenario: Multilingual chat app notification system\n");

  // Rich data including Japanese and emoji
  const notificationData = {
    app: {
      name: "Global Chat 🌐",
      version: "3.2.1",
      languages: ["Japanese", "English", "Chinese", "Spanish", "Korean"],
    },
    notifications: [
      {
        id: "notif-001",
        type: "info",
        priority: "low",
        timestamp: "2024-01-15T09:00:00+09:00",
        message: "Good morning! ☀️ Wishing you a wonderful day today",
        sender: {
          name: "Taro Tanaka",
          avatar: "👨‍💼",
          status: "Online 🟢",
          timezone: "Asia/Tokyo",
        },
        reactions: ["👍", "😊", "☕"],
      },
      {
        id: "notif-002",
        type: "success",
        priority: "medium",
        timestamp: "2024-01-15T10:30:00+09:00",
        message: 'Project "Sakura" completed successfully 🌸✅',
        sender: {
          name: "Hanako Sato",
          avatar: "👩‍💻",
          status: "Busy 🔴",
          timezone: "Asia/Tokyo",
        },
        details: {
          project: {
            name: "Sakura Project",
            duration: "3 months",
            team: ["Hanako Sato", "Ichiro Suzuki", "Misaki Takahashi"],
            achievements: [
              "Met deadline ⏰",
              "Quality standards achieved ⭐",
              "95% customer satisfaction 😊",
            ],
          },
        },
        reactions: ["🎉", "👏", "🎊", "💪"],
      },
      {
        id: "notif-003",
        type: "warning",
        priority: "high",
        timestamp: "2024-01-15T14:00:00+09:00",
        message:
          "⚠️ Only 24 hours left until deadline! Please check progress 📊",
        sender: {
          name: "Yamada Reminder Bot",
          avatar: "🤖",
          status: "Auto-send ⚡",
          timezone: "UTC",
        },
        tasks: [
          {
            task: "Design document review 📝",
            assignee: "Ichiro Suzuki",
            progress: 80,
          },
          {
            task: "Test execution 🧪",
            assignee: "Misaki Takahashi",
            progress: 60,
          },
          { task: "Document update 📚", assignee: "Taro Tanaka", progress: 40 },
        ],
        reactions: ["😰", "💦"],
      },
      {
        id: "notif-004",
        type: "celebration",
        priority: "low",
        timestamp: "2024-01-15T17:00:00+09:00",
        message: "🎂 Today is Takahashi-san's birthday! Congratulations! 🎉",
        sender: {
          name: "Celebration Bot",
          avatar: "🎁",
          status: "Celebration mode 🎊",
          timezone: "Asia/Tokyo",
        },
        celebration: {
          person: "Misaki Takahashi",
          age: "🎈",
          wishes: [
            "Wishing you a wonderful year ahead! ✨",
            "Thank you for always working so hard! 💐",
            "Happy Birthday! 🎂🎊",
          ],
        },
        reactions: ["🎂", "🎉", "🎁", "💐", "🎊", "❤️"],
      },
    ],
    statistics: {
      totalNotifications: 4,
      byType: {
        info: 1,
        success: 1,
        warning: 1,
        celebration: 1,
      },
      mostActiveUser: "Hanako Sato",
      popularReactions: {
        "👍": 15,
        "😊": 12,
        "🎉": 10,
        "❤️": 8,
      },
      languages: {
        Japanese: "85%",
        English: "10%",
        Emoji: "5%",
      },
    },
  };

  const json = JSON.stringify(notificationData);
  console.log(`📊 Data size: ${json.length} characters`);
  console.log(
    `   • Japanese characters: ${
      (json.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length
    }`
  );
  const emojiCount = (json.match(/\uD83D[\uDE00-\uDE4F]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDD00-\uDDFF]/g) || []).length;
  console.log(`   • Emoji count: ${emojiCount}`);
  console.log(`🔄 Chunk size: 100 characters\n`);

  const reader = createJSONReadableStreamDefaultReader(json, 100);
  const streamingJSON = new StreamingJsonParser(reader);

  console.log("📬 Processing notification messages:");
  console.log("─".repeat(60));

  // Process notifications
  for await (const notification of streamingJSON.watch(
    "/notifications/*"
  )) {
    // Icons and colors based on type
    const typeConfig = {
      info: { icon: "ℹ️", color: "\x1b[36m" }, // Cyan
      success: { icon: "✅", color: "\x1b[32m" }, // Green
      warning: { icon: "⚠️", color: "\x1b[33m" }, // Yellow
      celebration: { icon: "🎊", color: "\x1b[35m" }, // Magenta
    };

    const config = typeConfig[notification.type as keyof typeof typeConfig] || {
      icon: "📌",
      color: "",
    };
    const resetColor = "\x1b[0m";

    console.log(
      `\n${config.icon} ${
        config.color
      }[${notification.type.toUpperCase()}]${resetColor} ${
        notification.message
      }`
    );
    console.log(
      `   👤 Sender: ${notification.sender.name} ${notification.sender.avatar}`
    );
    console.log(`   📊 Status: ${notification.sender.status}`);
    console.log(
      `   🕐 Time: ${new Date(notification.timestamp).toLocaleString("en-US", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
      })}`
    );

    // Display reactions
    if (notification.reactions && notification.reactions.length > 0) {
      console.log(`   💬 Reactions: ${notification.reactions.join(" ")}`);
    }

    // Display detailed information
    if (notification.details?.project) {
      const project = notification.details.project;
      console.log(`\n   📋 Project Details:`);
      console.log(`      • Project name: ${project.name}`);
      console.log(`      • Duration: ${project.duration}`);
      console.log(`      • Team: ${project.team.join(", ")}`);
      console.log(`      • Achievements:`);
      project.achievements.forEach((achievement: string) => {
        console.log(`        ✓ ${achievement}`);
      });
    }

    // Display task information
    if (notification.tasks) {
      console.log(`\n   📋 Task Progress:`);
      notification.tasks.forEach((task: any) => {
        const progressBar = "█"
          .repeat(Math.floor(task.progress / 10))
          .padEnd(10, "░");
        console.log(`      • ${task.task} - ${task.assignee}`);
        console.log(`        [${progressBar}] ${task.progress}%`);
      });
    }

    // Display celebration information
    if (notification.celebration) {
      const celebration = notification.celebration;
      console.log(`\n   🎉 Celebration Info:`);
      console.log(`      • Person: ${celebration.person} ${celebration.age}`);
      console.log(`      • Messages:`);
      celebration.wishes.forEach((wish: string) => {
        console.log(`        💝 ${wish}`);
      });
    }
  }

  console.log("\n" + "─".repeat(60));

  // Get complete response and display statistics
  const reader2 = createJSONReadableStreamDefaultReader(json, 100);
  const streamingJSON2 = new StreamingJsonParser(reader2);
  const fullResponse = await streamingJSON2.getFullResponse();

  console.log("\n📊 Statistics:");
  console.log("─".repeat(40));

  console.log(`\n🌐 App Information:`);
  console.log(`   • App name: ${fullResponse.app.name}`);
  console.log(`   • Version: ${fullResponse.app.version}`);
  console.log(
    `   • Supported languages: ${fullResponse.app.languages.join(", ")}`
  );

  console.log(`\n📈 Notification Statistics:`);
  console.log(
    `   • Total notifications: ${fullResponse.statistics.totalNotifications}`
  );
  console.log(`   • By type:`);
  for (const [type, count] of Object.entries(fullResponse.statistics.byType)) {
    console.log(`     - ${type}: ${count} items`);
  }

  console.log(
    `\n👤 Most active user: ${fullResponse.statistics.mostActiveUser}`
  );

  console.log(`\n💬 Popular reactions:`);
  for (const [emoji, count] of Object.entries(
    fullResponse.statistics.popularReactions
  )) {
    const bar = "█".repeat(Math.floor((count as number) / 3));
    console.log(`   ${emoji} ${bar} ${count} times`);
  }

  console.log(`\n🗣️ Language usage:`);
  for (const [lang, percentage] of Object.entries(
    fullResponse.statistics.languages
  )) {
    console.log(`   • ${lang}: ${percentage}`);
  }

  console.log("\n💡 Unicode Processing Key Points:");
  console.log(
    "  • Correctly processes both Japanese and emoji with UTF-8 encoding"
  );
  console.log(
    "  • No issues even when multibyte characters are split at chunk boundaries"
  );
  console.log("  • Properly handles compound emoji characters (👨‍👩‍👧‍👦, etc.)");
  console.log(
    "  • Smoothly processes mixed languages (Japanese, English, emoji)"
  );
}
