import { BungieApiDestiny2CharacterComponent } from "~src/service/destiny2-character/destiny2-character.types";
import { BungieApiDestiny2StatDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";

export const sortedStats = (
  character: BungieApiDestiny2CharacterComponent,
  statDefinitions: BungieApiDestiny2StatDefinitions
): [string, number, string, string][] => {
  return Object.entries(character.stats)
    .sort(([a], [b]) => {
      const aHash = parseInt(a);
      const bHash = parseInt(b);

      const aCategory = statDefinitions[aHash].statCategory;
      const bCategory = statDefinitions[bHash].statCategory;

      if (aCategory === bCategory) {
        const aIndex = statDefinitions[aHash].index;
        const bIndex = statDefinitions[bHash].index;

        return aIndex - bIndex;
      } else {
        return bCategory - aCategory;
      }
    })
    .map(([key, value]) => {
      const name = statDefinitions[parseInt(key)]?.displayProperties?.name || `Unknown (${key})`;

      const description = (statDefinitions[parseInt(key)]?.displayProperties?.description || "")
        .split("\n")
        .filter((line) => {
          return (line || "").trim().length > 0;
        })
        .join("\n");

      return [key, value, name, description];
    });
};
