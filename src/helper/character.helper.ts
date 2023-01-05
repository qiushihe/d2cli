import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";
import { Destiny2ManifestStatDefinitions } from "~type/bungie-asset/destiny2.types";

export const sortedStats = (
  character: DestinyCharacterComponent,
  statDefinitions: Destiny2ManifestStatDefinitions
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
