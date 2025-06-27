/**
 * Demo 5: Performance with Large Arrays
 *
 * Demonstrates how to efficiently process large array data.
 * Through streaming processing, data can be filtered and processed at high speed
 * while keeping memory usage low.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function performanceDemo() {
  console.log("⚡ Performance with Large Arrays Demo");
  console.log("====================================\n");

  console.log("📊 Scenario: Processing large-scale sensor data\n");

  // Generate large amount of sensor data
  console.log("🔧 Generating test data...");
  const itemCount = 1000;
  const items = [];

  // Simulate realistic sensor data
  for (let i = 1; i <= itemCount; i++) {
    const timestamp = new Date(Date.now() - (itemCount - i) * 60000); // 1-minute intervals
    const temperature = 20 + Math.sin(i / 10) * 5 + Math.random() * 2; // Temperature variation
    const humidity = 50 + Math.cos(i / 8) * 20 + Math.random() * 5; // Humidity variation

    items.push({
      id: `sensor-${i.toString().padStart(4, "0")}`,
      timestamp: timestamp.toISOString(),
      location: {
        building: `Building ${Math.floor((i - 1) / 100) + 1}`,
        floor: Math.floor(((i - 1) % 100) / 10) + 1,
        room: `Room ${((i - 1) % 10) + 1}`,
      },
      readings: {
        temperature: parseFloat(temperature.toFixed(2)),
        humidity: parseFloat(humidity.toFixed(2)),
        pressure: parseFloat((1013 + Math.random() * 10).toFixed(2)),
      },
      status: {
        online: Math.random() > 0.05, // 95% are online
        battery: Math.floor(Math.random() * 100),
        alert: temperature > 25 || humidity > 70, // Alert when threshold exceeded
      },
      metadata: {
        sensorType: i % 3 === 0 ? "premium" : "standard",
        calibrated: i % 5 === 0,
        maintenanceNeeded: Math.random() > 0.9,
      },
    });
  }

  const jsonData = {
    dataset: {
      name: "Environmental Monitoring",
      version: "2.0",
      generated: new Date().toISOString(),
    },
    sensors: items,
    summary: {
      total: itemCount,
      buildings: 10,
      alertThreshold: {
        temperature: 25,
        humidity: 70,
      },
    },
  };

  const json = JSON.stringify(jsonData);
  const jsonSizeKB = (json.length / 1024).toFixed(2);
  const jsonSizeMB = (json.length / 1024 / 1024).toFixed(2);

  console.log(`✅ Generation complete!`);
  console.log(`  • Number of sensors: ${itemCount.toLocaleString()}`);
  console.log(`  • JSON size: ${jsonSizeKB} KB (${jsonSizeMB} MB)`);
  console.log(`  • Chunk size: 500 characters\n`);

  // Start performance measurement
  console.log("🏃 Processing performance test:");
  console.log("─".repeat(60));

  // Test 1: Detect sensors in alert state
  console.log("\n🚨 Test 1: Detection of sensors in alert state");

  const reader1 = createJSONReadableStreamDefaultReader(json, 500);
  const streamingJSON1 = new StreamingJsonParser(reader1);

  const startTime1 = Date.now();
  let alertCount = 0;
  const alertSensors = [];

  for await (const sensor of streamingJSON1.watch("/sensors/*")) {
    if (sensor.status.alert) {
      alertCount++;
      alertSensors.push({
        id: sensor.id,
        location: `${sensor.location.building} - Floor ${sensor.location.floor} - ${sensor.location.room}`,
        temperature: sensor.readings.temperature,
        humidity: sensor.readings.humidity,
      });

      // Display only the first 5 items
      if (alertCount <= 5) {
        console.log(
          `  ⚠️  ${sensor.id}: Temperature=${sensor.readings.temperature}°C, Humidity=${sensor.readings.humidity}%`
        );
      }
    }
  }

  const endTime1 = Date.now();
  const processingTime1 = endTime1 - startTime1;

  console.log(`\n  📊 Results:`);
  console.log(
    `     • Alert count: ${alertCount}/${itemCount} (${(
      (alertCount / itemCount) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`     • Processing time: ${processingTime1}ms`);
  console.log(
    `     • Processing speed: ${((itemCount / processingTime1) * 1000).toFixed(
      0
    )} items/sec`
  );

  // Test 2: Detect premium sensors that need maintenance
  console.log("\n🔧 Test 2: Premium sensors requiring maintenance");

  const reader2 = createJSONReadableStreamDefaultReader(json, 500);
  const streamingJSON2 = new StreamingJsonParser(reader2);

  const startTime2 = Date.now();
  let maintenanceCount = 0;
  const maintenanceSensors = [];

  for await (const sensor of streamingJSON2.watch("/sensors/*")) {
    if (
      sensor.metadata.sensorType === "premium" &&
      sensor.metadata.maintenanceNeeded
    ) {
      maintenanceCount++;
      maintenanceSensors.push({
        id: sensor.id,
        battery: sensor.status.battery,
        location: sensor.location.building,
      });
    }
  }

  const endTime2 = Date.now();
  const processingTime2 = endTime2 - startTime2;

  console.log(`\n  📊 Results:`);
  console.log(`     • Maintenance required count: ${maintenanceCount}`);
  console.log(`     • Processing time: ${processingTime2}ms`);

  // Test 3: Statistics by building
  console.log("\n🏢 Test 3: Sensor statistics by building");

  const reader3 = createJSONReadableStreamDefaultReader(json, 500);
  const streamingJSON3 = new StreamingJsonParser(reader3);

  const startTime3 = Date.now();
  const buildingStats = new Map<
    string,
    {
      count: number;
      sumTemp: number;
      sumHumidity: number;
      offlineCount: number;
    }
  >();

  for await (const sensor of streamingJSON3.watch("/sensors/*")) {
    const building = sensor.location.building;
    const stats = buildingStats.get(building) || {
      count: 0,
      sumTemp: 0,
      sumHumidity: 0,
      offlineCount: 0,
    };

    stats.count++;
    stats.sumTemp += sensor.readings.temperature;
    stats.sumHumidity += sensor.readings.humidity;
    if (!sensor.status.online) {
      stats.offlineCount++;
    }

    buildingStats.set(building, stats);
  }

  const endTime3 = Date.now();
  const processingTime3 = endTime3 - startTime3;

  console.log("\n  📊 Statistics by building:");
  for (const [building, stats] of Array.from(buildingStats)) {
    const avgTemp = (stats.sumTemp / stats.count).toFixed(1);
    const avgHumidity = (stats.sumHumidity / stats.count).toFixed(1);
    console.log(
      `     ${building}: ${stats.count} sensors, Average temp=${avgTemp}°C, Offline=${stats.offlineCount}`
    );
  }
  console.log(`     • Processing time: ${processingTime3}ms`);

  // Overall performance summary
  console.log("\n" + "─".repeat(60));
  console.log("📈 Performance Summary:");

  const totalProcessingTime =
    processingTime1 + processingTime2 + processingTime3;
  const avgProcessingTime = totalProcessingTime / 3;

  console.log(`  • Total processing time: ${totalProcessingTime}ms`);
  console.log(`  • Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
  console.log(`  • Data size: ${jsonSizeMB} MB`);
  console.log(
    `  • Processing efficiency: ${(json.length / totalProcessingTime).toFixed(
      0
    )} bytes/ms`
  );

  // Estimated memory usage (theoretical value, not actual usage)
  const estimatedMemoryUsage = 500 * 10; // Chunk size × Buffer count (estimated)
  console.log(
    `  • Estimated memory usage: ~${(estimatedMemoryUsage / 1024).toFixed(
      1
    )} KB`
  );
  console.log(`    (When loading all data: ${jsonSizeMB} MB)`);

  console.log("\n💡 Performance Key Points:");
  console.log(
    "  • Streaming processing enables low-memory processing even with large data"
  );
  console.log(
    "  • Selective processing with JSON pointers skips unnecessary parsing"
  );
  console.log(
    "  • Parallel processing is possible (using multiple StreamingJsonParser instances)"
  );
  console.log("  • Optimal for real-time data processing and IoT applications");
}
