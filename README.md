# bedrock-vanilla-data-inline

将 @minecraft/vanilla-data 声明的枚举转换为常量枚举。

- 缩小捆绑打包体积
- 提高性能（未确认）

提供来自 bedrock-samples 仓库的额外数据：

- **方块纹理路径** - `MinecraftBlockTextures`
- **食物数据** - `MinecraftFoodData`（营养值、饱和度、品质值）

安装：`npm i bedrock-vanilla-data-inline`

此包利用 GitHub Actions 进行自动化构建和发布，确保最新版本始终可用。

链接：https://www.npmjs.com/package/bedrock-vanilla-data-inline

## 使用示例

```typescript
import { MinecraftBlockTypes, MinecraftBlockTextures, MinecraftFoodData } from 'bedrock-vanilla-data-inline';

// 方块类型
const stone = MinecraftBlockTypes.Stone; // "minecraft:stone"

// 方块纹理
const texture = MinecraftBlockTextures.get("minecraft:stone"); // "textures/blocks/stone"

// 食物数据
const apple = MinecraftFoodData["minecraft:apple"];
// { nutrition: 4, saturation_modifier: 0.3, quality: 6.4 }

// 品质值最高的食物
const goldenCarrot = MinecraftFoodData["minecraft:golden_carrot"];
// { nutrition: 6, saturation_modifier: 1.2, quality: 20.4 }
```

## 食物品质计算

品质值公式：`quality = nutrition + nutrition * saturation_modifier * 2`

品质排行榜：
| 食物 | 营养值 | 饱和度 | 品质值 |
|------|--------|--------|--------|
| 兔肉煲 | 10 | 0.6 | 22 |
| 熟牛排/猪排 | 8 | 0.8 | 20.8 |
| 金萝卜 | 6 | 1.2 | 20.4 |

---

Converts the declared enumerations from @minecraft/vanilla-data to constant enumerations.

- Minify bundle size
- Improves performance (unconfirmed)

Provides additional data from the bedrock-samples repository:

- **Block texture paths** - `MinecraftBlockTextures`
- **Food data** - `MinecraftFoodData` (nutrition, saturation modifier, quality)

Install: `npm i bedrock-vanilla-data-inline`

This package utilizes Github Actions for automated builds and releases, ensuring the latest version is always available.

See: https://www.npmjs.com/package/bedrock-vanilla-data-inline

## Usage Example

```typescript
import { MinecraftBlockTypes, MinecraftBlockTextures, MinecraftFoodData } from 'bedrock-vanilla-data-inline';

// Block types
const stone = MinecraftBlockTypes.Stone; // "minecraft:stone"

// Block textures
const texture = MinecraftBlockTextures.get("minecraft:stone"); // "textures/blocks/stone"

// Food data
const apple = MinecraftFoodData["minecraft:apple"];
// { nutrition: 4, saturation_modifier: 0.3, quality: 6.4 }

// Highest quality food
const goldenCarrot = MinecraftFoodData["minecraft:golden_carrot"];
// { nutrition: 6, saturation_modifier: 1.2, quality: 20.4 }
```

## Food Quality Calculation

Quality formula: `quality = nutrition + nutrition * saturation_modifier * 2`

Top foods by quality:
| Food | Nutrition | Saturation | Quality |
|------|-----------|------------|---------|
| Rabbit Stew | 10 | 0.6 | 22 |
| Cooked Beef/Porkchop | 8 | 0.8 | 20.8 |
| Golden Carrot | 6 | 1.2 | 20.4 |
