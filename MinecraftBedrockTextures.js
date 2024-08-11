import { writeFileSync, readFileSync } from 'fs';
import blocks from './bedrock-samples/resource_pack/blocks.json' assert { type: 'json' };
const lines = readFileSync('./bedrock-samples/resource_pack/textures/terrain_texture.json', 'utf-8').split('\n');
lines.shift();
const tt = JSON.parse(lines.join('\n')).texture_data;


function tex(s) {
	const t = tt[s]?.textures;
	return t ? (typeof t === 'string' ? t?.substring(16) : t.map((v) => (typeof v === 'string' ? v.substring(16) : v.path.substring(16)))) : undefined;
}

delete blocks.format_version;
delete blocks.air;
for (const id in blocks) {
	const block = blocks[id];
	const textures = block.textures ?? block.carried_textures;
	if (typeof textures === 'string') {
		blocks[id] = tex(textures);
	} else if (Object.keys(textures ?? {}).length) {
		blocks[id] = {
			east: tex(textures.east),
			west: tex(textures.west),
			north: tex(textures.north),
			south: tex(textures.south),
			up: tex(textures.up),
			down: tex(textures.down),
			side: tex(textures.side)
		};

		if (Object.values(blocks[id]).filter((v) => v).length === 0) {
			delete blocks[id];
		}
	}
}

const json = JSON.stringify(blocks, undefined);

writeFileSync(
	'pkg/lib/MinecraftBlockTextures.ts',
	`export const MinecraftBlockTextures = ${json.slice(
		0,
		json.length - 1
	)},get(k: string): string | undefined {const t = (this as any)[k]; let x: any; if (t === undefined) return; const s = typeof t === "string" ? t : t instanceof Array ? t[0] : (x = t.side ?? t.east ?? t.west ?? t.north ?? t.south ?? t.up ?? t.down) ? typeof x === 'string'? x: x[0]: undefined;if (s) return 'textures/blocks/' + s;}};`
);
