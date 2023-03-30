import { AppModule } from "~src/module/app.module";
import { LogService } from "~src/service/log/log.service";
import { Logger } from "~src/service/log/log.types";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";
import { DestinyCharacterComponent } from "~type/bungie-api/destiny/entities/characters.types";

import { CharacterStat } from "./stat.types";

export class StatService {
  private readonly manifestDefinitionService: ManifestDefinitionService;

  constructor() {
    this.manifestDefinitionService =
      AppModule.getDefaultInstance().resolve(ManifestDefinitionService);
  }

  async getSortedCharacterStats(
    character: DestinyCharacterComponent
  ): Promise<[Error, null] | [null, CharacterStat[]]> {
    const characterStats: CharacterStat[] = [];

    const statEntries = Object.entries(character.stats);
    for (let statIndex = 0; statIndex < statEntries.length; statIndex++) {
      const [statHashStr, statValue] = statEntries[statIndex];
      const statHash = parseInt(statHashStr);

      const [statDefinitionErr, statDefinition] =
        await this.manifestDefinitionService.getStatDefinition(statHash);
      if (statDefinitionErr) {
        return [statDefinitionErr, null];
      }

      characterStats.push({
        statHash: statHash,
        value: statValue,
        category: statDefinition.statCategory,
        index: statDefinition.index,
        name: statDefinition.displayProperties.name || "UNKNOWN STAT",
        description: (statDefinition.displayProperties.description || "")
          .split("\n")
          .filter((line) => (line || "").trim().length > 0)
          .join(" ")
      });
    }

    return [
      null,
      characterStats.sort((a, b) =>
        a.category === b.category ? a.index - b.index : b.category - a.category
      )
    ];
  }

  private getLogger(): Logger {
    return AppModule.getDefaultInstance().resolve(LogService).getLogger("StatService");
  }
}
