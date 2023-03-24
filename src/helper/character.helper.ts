import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";

export const sortStats = async (
  manifestDefinitionService: ManifestDefinitionService,
  character: DestinyCharacterComponent
): Promise<[Error, null] | [null, [number, number, string, string][]]> => {
  const characterStats: {
    hash: number;
    value: number;
    category: number;
    index: number;
    name: string;
    description: string;
  }[] = [];

  const statEntries = Object.entries(character.stats);
  for (let statIndex = 0; statIndex < statEntries.length; statIndex++) {
    const [statHashStr, statValue] = statEntries[statIndex];
    const statHash = parseInt(statHashStr);

    const [statDefinitionErr, statDefinition] = await manifestDefinitionService.getStatDefinition(
      statHash
    );
    if (statDefinitionErr) {
      return [statDefinitionErr, null];
    }

    characterStats.push({
      hash: statHash,
      value: statValue,
      category: -1,
      index: -1,
      name: statDefinition?.displayProperties.name || "UNKNOWN STAT",
      description: (statDefinition?.displayProperties?.description || "")
        .split("\n")
        .filter((line) => (line || "").trim().length > 0)
        .join("\n")
    });
  }

  return [
    null,
    characterStats
      .sort((a, b) => {
        if (a.category === b.category) {
          return a.index - b.index;
        } else {
          return b.category - a.category;
        }
      })
      .map(({ hash, value, name, description }) => {
        return [hash, value, name, description];
      })
  ];

  // return Object.entries(character.stats)
  //   .sort(([a], [b]) => {
  //     const aHash = parseInt(a);
  //     const bHash = parseInt(b);
  //
  //     const aCategory = statDefinitions[aHash].statCategory;
  //     const bCategory = statDefinitions[bHash].statCategory;
  //
  //     if (aCategory === bCategory) {
  //       const aIndex = statDefinitions[aHash].index;
  //       const bIndex = statDefinitions[bHash].index;
  //
  //       return aIndex - bIndex;
  //     } else {
  //       return bCategory - aCategory;
  //     }
  //   })
  //   .map(([key, value]) => {
  //     const name = statDefinitions[parseInt(key)]?.displayProperties?.name || `Unknown (${key})`;
  //
  //     const description = (statDefinitions[parseInt(key)]?.displayProperties?.description || "")
  //       .split("\n")
  //       .filter((line) => {
  //         return (line || "").trim().length > 0;
  //       })
  //       .join("\n");
  //
  //     return [key, value, name, description];
  //   });
};
