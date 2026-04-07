import { writeFileSync, readFileSync, rmSync, renameSync, readdirSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join, basename } from "path";

const isRunningInPkgDir = existsSync("package.json") && existsSync("lib");
const pkgDir = isRunningInPkgDir ? "." : "pkg";
const libDir = join(pkgDir, "lib");

const SATURATION_MODIFIER_MAP = {
  poor: 0.1,
  low: 0.3,
  normal: 0.6,
  good: 0.8,
  supernatural: 1.2,
};

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
  console.log("✓ Modified package.json");
}

function changeFileExt() {
  const files = readdirSync(libDir);
  for (const file of files) {
    if (file.endsWith(".d.ts")) {
      const oldPath = join(libDir, file);
      const newPath = join(libDir, file.replace(".d.ts", ".ts"));
      renameSync(oldPath, newPath);
    }
  }
  console.log("✓ Renamed .d.ts files to .ts");
}

function deleteFiles() {
  const files = readdirSync(libDir);
  for (const file of files) {
    if (file.endsWith(".js") || file.endsWith(".d.ts")) {
      rmSync(join(libDir, file));
    }
  }
  console.log("✓ Deleted .js and .d.ts files");
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
  console.log("✓ Converted declare enum to const enum");
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
  console.log("✓ Added textures and food data exports");
}

function copyReadme() {
  const readmeSource = isRunningInPkgDir ? "../README.md" : "README.md";
  if (existsSync(readmeSource)) {
    copyFileSync(readmeSource, join(pkgDir, "README.md"));
    console.log("✓ Copied README.md");
  }
}

function generateBlockTextures() {
  const bedrockSamplesDir = isRunningInPkgDir ? "../bedrock-samples" : "./bedrock-samples";
  const blocksPath = join(bedrockSamplesDir, "resource_pack/blocks.json");
  const texturesPath = join(bedrockSamplesDir, "resource_pack/textures/terrain_texture.json");
  
  if (!existsSync(blocksPath) || !existsSync(texturesPath)) {
    console.log("⚠ Skipping block textures generation (bedrock-samples not found)");
    return;
  }
  
  const blocks = JSON.parse(readFileSync(blocksPath, "utf-8"));
  const lines = readFileSync(texturesPath, "utf-8").split("\n");
  lines.shift();
  const tt = JSON.parse(lines.join("\n")).texture_data;

  function tex(s) {
    const t = tt[s]?.textures;
    return t
      ? typeof t === "string"
        ? t?.substring(16)
        : t.map((v) => (typeof v === "string" ? v.substring(16) : v.path.substring(16)))
      : undefined;
  }

  delete blocks.format_version;
  delete blocks.air;
  
  for (const id in blocks) {
    const block = blocks[id];
    const textures = block.textures ?? block.carried_textures;
    if (typeof textures === "string") {
      blocks[id] = tex(textures);
    } else if (textures && Object.keys(textures).length) {
      blocks[id] = {
        east: tex(textures.east),
        west: tex(textures.west),
        north: tex(textures.north),
        south: tex(textures.south),
        up: tex(textures.up),
        down: tex(textures.down),
        side: tex(textures.side),
      };

      if (Object.values(blocks[id]).filter((v) => v).length === 0) {
        delete blocks[id];
      }
    }
  }

  const json = JSON.stringify(blocks, undefined);
  const outputPath = join(libDir, "MinecraftBlockTextures.ts");
  
  writeFileSync(
    outputPath,
    `export const MinecraftBlockTextures = ${json.slice(
      0,
      json.length - 1
    )},get(k: string): string | undefined {const t = (this as any)[k]; let x: any; if (t === undefined) return; const s = typeof t === "string" ? t : t instanceof Array ? t[0] : (x = t.side ?? t.east ?? t.west ?? t.north ?? t.south ?? t.up ?? t.down) ? typeof x === 'string'? x: x[0]: undefined;if (s) return 'textures/blocks/' + s;}};\n`
  );
  console.log("✓ Generated MinecraftBlockTextures.ts");
}

function generateFoodData() {
  const bedrockSamplesDir = isRunningInPkgDir ? "../bedrock-samples" : "./bedrock-samples";
  const itemsDir = join(bedrockSamplesDir, "behavior_pack/items");
  
  if (!existsSync(itemsDir)) {
    console.log("⚠ Skipping food data generation (bedrock-samples not found)");
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
  console.log(`✓ Generated MinecraftFoodData.ts (${foodItems.length} items)`);
}

function checkPrerequisites() {
  if (isRunningInPkgDir) {
    return;
  }
  
  if (!existsSync(pkgDir)) {
    console.error("Error: 'pkg' directory not found.");
    console.error("\nPlease run the following commands first:");
    console.error("  mkdir pkg");
    console.error("  npm i @minecraft/vanilla-data");
    console.error("  cp -r node_modules/@minecraft/vanilla-data/* pkg");
    console.error("  gh repo clone Mojang/bedrock-samples");
    console.error("\nOr use CI/CD workflow which handles this automatically.");
    process.exit(1);
  }
  
  if (!existsSync(join(pkgDir, "package.json"))) {
    console.error("Error: 'pkg/package.json' not found.");
    console.error("\nPlease copy @minecraft/vanilla-data to pkg directory first:");
    console.error("  cp -r node_modules/@minecraft/vanilla-data/* pkg");
    process.exit(1);
  }
}

function build() {
  console.log("\n🔨 Building bedrock-vanilla-data-inline...\n");
  
  checkPrerequisites();
  editPackage();
  changeFileExt();
  deleteFiles();
  setConstantEnum();
  addTextures();
  copyReadme();
  generateBlockTextures();
  generateFoodData();
  
  console.log("\n✅ Build complete!\n");
}

build();
