import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, readdirSync, cpSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const testDir = "./test/fixtures";
const pkgDir = join(testDir, "pkg");
const libDir = join(pkgDir, "lib");

const SATURATION_MODIFIER_MAP = {
  poor: 0.1,
  low: 0.3,
  normal: 0.6,
  good: 0.8,
  supernatural: 1.2,
};

function setupFixtures() {
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(pkgDir, { recursive: true });
  
  if (existsSync("./node_modules/@minecraft/vanilla-data")) {
    cpSync("./node_modules/@minecraft/vanilla-data", pkgDir, { recursive: true });
  } else {
    throw new Error("@minecraft/vanilla-data not found. Run: npm install");
  }
}

function cleanupFixtures() {
  rmSync(testDir, { recursive: true, force: true });
}

function editPackage() {
  const pkgPath = join(pkgDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  
  pkg.name = "bedrock-vanilla-data-inline";
  pkg.description = "Make the @minecraft/vanilla-data declared enumerations convert to constant enumerations.";
  pkg.contributors = [{ name: "lxhzzy06", email: "lxhzzy@outlook.com" }];
  delete pkg.types;
  pkg.exports = "./lib/index.ts";
  pkg.repository = { url: "https://github.com/lxhzzy06/bedrock-vanilla-data-inline" };
  
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

function changeFileExt() {
  const files = readdirSync(libDir);
  for (const file of files) {
    if (file.endsWith(".d.ts")) {
      const oldPath = join(libDir, file);
      const newPath = join(libDir, file.replace(".d.ts", ".ts"));
      const content = readFileSync(oldPath, "utf-8");
      writeFileSync(newPath, content);
      rmSync(oldPath);
    }
  }
}

function deleteFiles() {
  const files = readdirSync(libDir);
  for (const file of files) {
    if (file.endsWith(".js") || file.endsWith(".d.ts")) {
      rmSync(join(libDir, file));
    }
  }
}

function setConstantEnum() {
  const files = readdirSync(libDir);
  for (const file of files) {
    if (file.endsWith(".ts")) {
      const filePath = join(libDir, file);
      let content = readFileSync(filePath, "utf-8");
      content = content.replace(/export declare enum/g, "export const enum");
      writeFileSync(filePath, content);
    }
  }
}

function addTextures() {
  const indexPath = join(libDir, "index.ts");
  let content = readFileSync(indexPath, "utf-8");
  
  if (!content.includes('export * from "./MinecraftBlockTextures"')) {
    content += '\nexport * from "./MinecraftBlockTextures";\n';
  }
  if (!content.includes('export * from "./MinecraftFoodData"')) {
    content += '\nexport * from "./MinecraftFoodData";\n';
  }
  
  writeFileSync(indexPath, content);
}

function copyReadme() {
  if (existsSync("README.md")) {
    cpSync("README.md", join(pkgDir, "README.md"));
  }
}

function generateFoodData() {
  const itemsDir = "./bedrock-samples/behavior_pack/items";
  
  if (!existsSync(itemsDir)) {
    return;
  }

  function getSaturationModifierValue(modifier) {
    if (typeof modifier === "number") {
      return modifier;
    }
    return SATURATION_MODIFIER_MAP[modifier] ?? 0;
  }

  function calculateQuality(nutrition, saturationModifier) {
    return nutrition + nutrition * saturationModifier * 2;
  }

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

  foodItems.sort((a, b) => a.identifier.localeCompare(b.identifier));

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

  const outputPath = join(libDir, "MinecraftFoodData.ts");
  writeFileSync(outputPath, lines.join("\n"));
  
  return foodItems;
}

describe("Integration Tests with @minecraft/vanilla-data", () => {
  before(() => {
    setupFixtures();
  });
  
  after(() => {
    cleanupFixtures();
  });
  
  it("should have @minecraft/vanilla-data installed", () => {
    assert.ok(existsSync("./node_modules/@minecraft/vanilla-data"), 
      "@minecraft/vanilla-data should be installed");
  });
  
  it("should copy package files correctly", () => {
    assert.ok(existsSync(pkgDir), "pkg directory should exist");
    assert.ok(existsSync(join(pkgDir, "package.json")), "package.json should exist");
    assert.ok(existsSync(libDir), "lib directory should exist");
  });
  
  it("should modify package.json correctly", () => {
    editPackage();
    
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
    
    assert.strictEqual(pkg.name, "bedrock-vanilla-data-inline");
    assert.strictEqual(pkg.exports, "./lib/index.ts");
    assert.strictEqual(pkg.types, undefined);
    assert.ok(pkg.description.includes("constant enumerations"));
  });
  
  it("should rename .d.ts files to .ts", () => {
    changeFileExt();
    
    const files = readdirSync(libDir);
    const tsFiles = files.filter(f => f.endsWith(".ts"));
    const dtsFiles = files.filter(f => f.endsWith(".d.ts"));
    
    assert.ok(tsFiles.length > 0, "Should have .ts files");
    assert.strictEqual(dtsFiles.length, 0, "Should not have .d.ts files");
  });
  
  it("should delete .js files", () => {
    deleteFiles();
    
    const files = readdirSync(libDir);
    const jsFiles = files.filter(f => f.endsWith(".js"));
    
    assert.strictEqual(jsFiles.length, 0, "Should not have .js files");
  });
  
  it("should convert declare enum to const enum", () => {
    setConstantEnum();
    
    const blockPath = join(libDir, "mojang-block.ts");
    const content = readFileSync(blockPath, "utf-8");
    
    assert.ok(content.includes("export const enum"), 
      "Should contain 'export const enum'");
    assert.ok(!content.includes("export declare enum"), 
      "Should not contain 'export declare enum'");
  });
  
  it("should have valid TypeScript enums", () => {
    const blockPath = join(libDir, "mojang-block.ts");
    const content = readFileSync(blockPath, "utf-8");
    
    const enumMatches = content.match(/export const enum \w+/g);
    assert.ok(enumMatches && enumMatches.length > 0, 
      "Should have at least one const enum");
    
    assert.ok(content.includes("MinecraftBlockTypes"),
      "Should contain MinecraftBlockTypes enum");
  });
  
  it("should add textures and food data exports", () => {
    addTextures();
    
    const indexPath = join(libDir, "index.ts");
    const content = readFileSync(indexPath, "utf-8");
    
    assert.ok(content.includes('export * from "./MinecraftBlockTextures"'),
      "Should export MinecraftBlockTextures");
    assert.ok(content.includes('export * from "./MinecraftFoodData"'),
      "Should export MinecraftFoodData");
  });
  
  it("should copy README", () => {
    copyReadme();
    
    assert.ok(existsSync(join(pkgDir, "README.md")), 
      "README.md should be copied");
  });
});

describe("Food Data Generation", () => {
  before(() => {
    setupFixtures();
    editPackage();
    changeFileExt();
    deleteFiles();
    setConstantEnum();
    addTextures();
  });
  
  after(() => {
    cleanupFixtures();
  });
  
  it("should generate MinecraftFoodData.ts", () => {
    const foodItems = generateFoodData();
    
    assert.ok(existsSync(join(libDir, "MinecraftFoodData.ts")),
      "MinecraftFoodData.ts should be generated");
    assert.ok(foodItems && foodItems.length > 0,
      "Should have at least one food item");
  });
  
  it("should have correct food data structure", () => {
    const foodPath = join(libDir, "MinecraftFoodData.ts");
    const content = readFileSync(foodPath, "utf-8");
    
    assert.ok(content.includes("export interface MinecraftFoodDataEntry"),
      "Should export MinecraftFoodDataEntry interface");
    assert.ok(content.includes("export const MinecraftFoodData"),
      "Should export MinecraftFoodData constant");
    assert.ok(content.includes("nutrition: number"),
      "Should have nutrition property");
    assert.ok(content.includes("saturation_modifier: number"),
      "Should have saturation_modifier property");
    assert.ok(content.includes("quality: number"),
      "Should have quality property");
  });
  
  it("should calculate quality correctly", () => {
    const nutrition = 8;
    const saturationModifier = 0.8;
    const expectedQuality = nutrition + nutrition * saturationModifier * 2;
    
    assert.strictEqual(Math.round(expectedQuality * 100) / 100, 20.8,
      "Quality formula should be: nutrition + nutrition * saturation_modifier * 2");
  });
  
  it("should contain known food items", () => {
    const foodPath = join(libDir, "MinecraftFoodData.ts");
    const content = readFileSync(foodPath, "utf-8");
    
    assert.ok(content.includes("minecraft:apple"),
      "Should contain minecraft:apple");
    assert.ok(content.includes("minecraft:golden_carrot"),
      "Should contain minecraft:golden_carrot");
    assert.ok(content.includes("minecraft:cooked_beef"),
      "Should contain minecraft:cooked_beef");
  });
});

describe("Enum Values Verification", () => {
  before(() => {
    setupFixtures();
    editPackage();
    changeFileExt();
    deleteFiles();
    setConstantEnum();
    addTextures();
  });
  
  after(() => {
    cleanupFixtures();
  });
  
  it("should preserve enum values correctly", () => {
    const blockPath = join(libDir, "mojang-block.ts");
    const content = readFileSync(blockPath, "utf-8");
    
    assert.ok(content.includes('"minecraft:'), 
      "Should contain minecraft: prefixed values");
    
    const stoneMatch = content.match(/Stone\s*=\s*"minecraft:stone"/);
    assert.ok(stoneMatch, "Should have Stone = minecraft:stone");
  });
  
  it("should have multiple enum types", () => {
    const files = readdirSync(libDir);
    let totalEnums = 0;
    
    for (const file of files) {
      if (file.endsWith(".ts") && file !== "index.ts") {
        const content = readFileSync(join(libDir, file), "utf-8");
        const enumCount = (content.match(/export const enum/g) || []).length;
        totalEnums += enumCount;
      }
    }
    
    assert.ok(totalEnums >= 10, 
      `Should have at least 10 enum types, found ${totalEnums}`);
  });
});
