/**
 * Demo 4: Nested Data Extraction
 *
 * Demonstrates how to efficiently extract specific data from deeply nested
 * complex JSON structures using JSON Pointers.
 * Cross-layer extraction across multiple hierarchies using wildcards (*) is also possible.
 */

import { StreamingJsonParser } from "../src/index";
import { createJSONReadableStreamDefaultReader } from "./supports/create-json-readable-stream-default-reader";

export async function nestedExtractionDemo() {
  console.log("🏢 Nested Data Extraction Demo");
  console.log("==============================\n");

  console.log(
    "📋 Scenario: Extract all member information from corporate organizational structure\n"
  );

  // Complex organizational structure data
  const organizationData = {
    company: {
      name: "TechCorp Global",
      founded: 2010,
      headquarters: "San Francisco",
      departments: [
        {
          id: "dept-001",
          name: "Engineering",
          budget: 5000000,
          teams: [
            {
              id: "team-001",
              name: "Frontend",
              lead: "Alice Johnson",
              members: [
                {
                  id: "emp-001",
                  name: "Alice Johnson",
                  role: "Team Lead",
                  skills: ["React", "TypeScript", "CSS"],
                  experience: 8,
                },
                {
                  id: "emp-002",
                  name: "Bob Smith",
                  role: "Senior Developer",
                  skills: ["Vue", "JavaScript", "Webpack"],
                  experience: 5,
                },
                {
                  id: "emp-003",
                  name: "Carol White",
                  role: "Developer",
                  skills: ["Angular", "TypeScript", "RxJS"],
                  experience: 3,
                },
              ],
            },
            {
              id: "team-002",
              name: "Backend",
              lead: "David Brown",
              members: [
                {
                  id: "emp-004",
                  name: "David Brown",
                  role: "Team Lead",
                  skills: ["Node.js", "Python", "AWS"],
                  experience: 10,
                },
                {
                  id: "emp-005",
                  name: "Eve Davis",
                  role: "Senior Developer",
                  skills: ["Go", "Kubernetes", "PostgreSQL"],
                  experience: 6,
                },
              ],
            },
          ],
        },
        {
          id: "dept-002",
          name: "Design",
          budget: 2000000,
          teams: [
            {
              id: "team-003",
              name: "UX Design",
              lead: "Frank Miller",
              members: [
                {
                  id: "emp-006",
                  name: "Frank Miller",
                  role: "Design Lead",
                  skills: ["Figma", "Sketch", "User Research"],
                  experience: 7,
                },
                {
                  id: "emp-007",
                  name: "Grace Wilson",
                  role: "UX Designer",
                  skills: ["Prototyping", "Wireframing", "Figma"],
                  experience: 4,
                },
              ],
            },
          ],
        },
      ],
      metrics: {
        totalEmployees: 7,
        averageExperience: 6.14,
        departments: 2,
        teams: 3,
      },
    },
  };

  const json = JSON.stringify(organizationData);
  console.log(`📊 Data size: ${json.length} characters`);
  console.log(`🔄 Chunk size: 50 characters\n`);

  const reader = createJSONReadableStreamDefaultReader(json, 50);
  const streamingJSON = new StreamingJsonParser(reader);

  // Get company information
  const reader2 = createJSONReadableStreamDefaultReader(json, 50);
  const streamingJSON2 = new StreamingJsonParser(reader2);
  const fullData = await streamingJSON2.getFullResponse();

  console.log(`🏢 ${fullData.company.name}`);
  console.log(`📍 Headquarters: ${fullData.company.headquarters}`);
  console.log(`📅 Founded: ${fullData.company.founded}\n`);

  console.log("👥 All employees extraction:");
  console.log('JSON Pointer: "/company/departments/*/teams/*/members/*"');
  console.log("─".repeat(60));

  // Initialize statistics
  const departmentStats = new Map<string, number>();
  const skillsCount = new Map<string, number>();
  let totalExperience = 0;
  let employeeCount = 0;

  // Extract all members
  for await (const member of streamingJSON.watch(
    "/company/departments/*/teams/*/members/*"
  )) {
    employeeCount++;

    console.log(`\n👤 ${member.name} (ID: ${member.id})`);
    console.log(`   📋 Role: ${member.role}`);
    console.log(`   📊 Experience: ${member.experience} years`);

    // Display skills
    console.log(`   🛠️  Skills:`);
    member.skills.forEach((skill: string) => {
      console.log(`      • ${skill}`);
      skillsCount.set(skill, (skillsCount.get(skill) || 0) + 1);
    });

    totalExperience += member.experience;

    // Display progress bar
    const progress = Math.round(
      (employeeCount / fullData.company.metrics.totalEmployees) * 100
    );
    const progressBar = "█".repeat(Math.floor(progress / 5)).padEnd(20, "░");
    console.log(`\n   Progress: [${progressBar}] ${progress}%`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("\n📊 Organizational Analysis Report:");
  console.log("─".repeat(40));

  // Department statistics
  console.log("\n🏢 Department Information:");
  for (const dept of fullData.company.departments) {
    const memberCount = dept.teams.reduce(
      (sum: number, team: any) => sum + team.members.length,
      0
    );
    const budget = new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
    }).format(dept.budget);

    console.log(`  • ${dept.name} Department`);
    console.log(`    - Members: ${memberCount}`);
    console.log(`    - Budget: ${budget}`);
    console.log(`    - Teams: ${dept.teams.length}`);
  }

  // Skill distribution
  console.log("\n🛠️  Skill Distribution (TOP 5):");
  const sortedSkills = Array.from(skillsCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [skill, count] of sortedSkills) {
    const bar = "█".repeat(count * 3);
    console.log(`  ${skill.padEnd(15)} ${bar} ${count} people`);
  }

  // Experience statistics
  const avgExperience = totalExperience / employeeCount;
  console.log(`\n📈 Average Experience: ${avgExperience.toFixed(1)} years`);

  // Advanced JSON Pointer usage examples
  console.log("\n💡 JSON Pointer Usage Examples:");
  console.log('  • "/company/departments/0" - First department');
  console.log('  • "/company/departments/*/name" - All department names');
  console.log('  • "/company/departments/*/teams/*/lead" - All team leaders');
  console.log('  • "/company/metrics" - Metrics information');

  console.log("\n🎯 Key Points of This Demo:");
  console.log("  • Easy data extraction even from deeply nested structures");
  console.log("  • Process multiple elements at once with wildcards (*)");
  console.log(
    "  • Memory-efficient processing even for large organizational data"
  );
}
