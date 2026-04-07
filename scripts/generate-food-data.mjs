import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const itemsDir = "./bedrock-samples/behavior_pack/items";
const outputPath = "./pkg/lib/MinecraftFoodData.ts";

const SATURATION_MODIFIER_MAP = {
  poor: 0.1,
  low: 0.3,
  normal: 0.6,
  good: 0.8,
  supernatural: 1.2,
};

function getSaturationModifierValue(modifier) {
  if (typeof modifier === "number") {
    return modifier;
  }
  return SATURATION_MODIFIER_MAP[modifier] ?? 0;
}

function calculateQuality(nutrition, saturationModifier) {
  return nutrition + nutrition * saturationModifier * 2;
}

function extractFoodData() {
  const files = readdirSync(itemsDir).filter(f => f.endsWith(".json"));
  const foodItems = [];

  for (const file of files) {
    const filePath = join(itemsDir, file);
    let content;
    try {
      let raw = readFileSync(filePath, "utf-8");
      raw = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      content = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    
    const item = content["minecraft:item"];
    if (!item) continue;
    
    const components = item.components;
    if (!components) continue;
    
    const food = components["minecraft:food"];
    if (!food) continue;
    
    const identifier = item.description?.identifier || `minecraft:${file.replace(".json", "")}`;
    const nutrition = food.nutrition ?? 0;
    const saturationModifier = getSaturationModifierValue(food.saturation_modifier);
    const quality = calculateQuality(nutrition, saturationModifier);
    
    foodItems.push({
      identifier,
      nutrition,
      saturation_modifier: saturationModifier,
      quality: Math.round(quality * 100) / 100,
    });
  }

  return foodItems.sort((a, b) => a.identifier.localeCompare(b.identifier));
}

function generateTypeScript(foodItems) {
  const lines = [
    `export interface MinecraftFoodDataEntry {`,
    `  nutrition: number;`,
    `  saturation_modifier: number;`,
    `  quality: number;`,
    `}`,
    ``,
    `export const MinecraftFoodData: Record<string, MinecraftFoodDataEntry> = {`,
  ];

  for (const item of foodItems) {
    lines.push(`  "${item.identifier}": { nutrition: ${item.nutrition}, saturation_modifier: ${item.saturation_modifier}, quality: ${item.quality} },`);
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

const foodItems = extractFoodData();
console.log(`Found ${foodItems.length} food items`);

const tsContent = generateTypeScript(foodItems);
writeFileSync(outputPath, tsContent);

console.log(`Generated: ${outputPath}`);
console.log("\nFood items:");
foodItems.forEach(item => {
  console.log(`  ${item.identifier}: nutrition=${item.nutrition}, saturation=${item.saturation_modifier}, quality=${item.quality}`);
});
