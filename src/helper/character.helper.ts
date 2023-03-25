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
      category: statDefinition.statCategory,
      index: statDefinition.index,
      name: statDefinition.displayProperties.name || "UNKNOWN STAT",
      description: (statDefinition.displayProperties.description || "")
        .split("\n")
        .filter((line) => (line || "").trim().length > 0)
        .join("\n")
    });
  }

  return [
    null,
    characterStats
      .sort((a, b) => (a.category === b.category ? a.index - b.index : b.category - a.category))
      .map(({ hash, value, name, description }) => [hash, value, name, description])
  ];
};
