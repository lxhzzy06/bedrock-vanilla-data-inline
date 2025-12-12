import { writeFileSync, readFileSync } from "fs";
import gulp from "gulp";
import { deleteAsync } from "del";
import rename from "gulp-rename";
import jeditor from "gulp-json-editor";
import replace from "gulp-replace";
import footer from "gulp-footer";

function change_file_ext() {
  return gulp
    .src("pkg/lib/*.d.ts", { base: "." })
    .pipe(rename((path) => (path.basename = path.basename.replace(".d", ""))))
    .pipe(gulp.dest("."));
}

function delete_file() {
  return deleteAsync(["pkg/lib/*.{d.ts,js}"]);
}

function edit_package() {
  return gulp
    .src("pkg/package.json", { base: "." })
    .pipe(
      jeditor(
        {
          name: "bedrock-vanilla-data-inline",
          description: "Make the @minecraft/vanilla-data declared enumerations convert to constant enumerations.",
          contributors: [{ name: "lxhzzy06", email: "lxhzzy@outlook.com" }],
          types: undefined,
          exports: "./lib/index.ts",
          repository: {
            url: "https://github.com/lxhzzy06/bedrock-vanilla-data-inline",
          },
        },
        {},
        { arrayMerge: (_, sourceArray) => sourceArray }
      )
    )
    .pipe(gulp.dest("."));
}

export function set_README() {
  return gulp.src("README.md").pipe(gulp.dest("pkg", { overwrite: true }));
}

function set_constant_enum() {
  return gulp
    .src("pkg/lib/*.ts", { base: "." })
    .pipe(replace("export declare enum", "export const enum", { skipBinary: false }))
    .pipe(gulp.dest("."));
}

function add_textures() {
  return gulp.src("pkg/lib/index.ts", { base: "." }).pipe(footer('export * from "./MinecraftBlocktextures";')).pipe(gulp.dest("."));
}

async function generate_block_textures() {
  const blocks = JSON.parse(readFileSync("./bedrock-samples/resource_pack/blocks.json", "utf-8"));
  const lines = readFileSync("./bedrock-samples/resource_pack/textures/terrain_texture.json", "utf-8").split("\n");
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
    } else if (Object.keys(textures ?? {}).length) {
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

  writeFileSync(
    "pkg/lib/MinecraftBlockTextures.ts",
    `export const MinecraftBlockTextures = ${json.slice(
      0,
      json.length - 1
    )},get(k: string): string | undefined {const t = (this as any)[k]; let x: any; if (t === undefined) return; const s = typeof t === "string" ? t : t instanceof Array ? t[0] : (x = t.side ?? t.east ?? t.west ?? t.north ?? t.south ?? t.up ?? t.down) ? typeof x === 'string'? x: x[0]: undefined;if (s) return 'textures/blocks/' + s;}};`
  );
}

export default gulp.series(edit_package, change_file_ext, delete_file, set_constant_enum, add_textures, set_README, generate_block_textures);
