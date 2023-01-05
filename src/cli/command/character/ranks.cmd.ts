import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { BungieApiDestiny2ManifestLanguage } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ManifestComponent } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { BungieApiDestiny2ProgressionDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";
import { LogService } from "~src/service/log/log.service";

import { getSelectedCharacterInfo } from "../../command-helper/current-character.helper";
import { sessionIdOption } from "../../command-option/session-id.option";
import { SessionIdCommandOptions } from "../../command-option/session-id.option";

type CmdOptions = SessionIdCommandOptions & { _: never };

const DISPLAY_HASHES = [
  2083746873, // Crucible
  3696598664, // Competitive
  3008065600, // Gambit
  457612306, // Vanguard
  2755675426, // Trials
  527867935, // Strange Favor
  1471185389, // Gunsmith
  599071390 // Iron Banner
];

const cmd: CommandDefinition = {
  description: "List character ranks",
  options: [sessionIdOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:ranks");

    const { session: sessionId } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return characterInfoErr;
    }

    const [progressionDefinitionErr, progressionDefinitions] = await fnWithSpinner(
      "Retrieving progression definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<BungieApiDestiny2ProgressionDefinitions>(
          BungieApiDestiny2ManifestLanguage.English,
          BungieApiDestiny2ManifestComponent.ProgressionDefinition
        )
    );
    if (progressionDefinitionErr) {
      return logger.loggedError(
        `Unable to retrieve progression definitions: ${progressionDefinitionErr.message}`
      );
    }

    const [characterProgressionErr, characterProgression] = await fnWithSpinner(
      "Retrieving character progression ...",
      () =>
        destiny2CharacterService.getCharacterProgressions(
          sessionId,
          characterInfo.membershipType,
          characterInfo.membershipId,
          characterInfo.characterId
        )
    );
    if (characterProgressionErr) {
      return logger.loggedError(
        `Unable to retrieve character progressions: ${characterProgressionErr.message}`
      );
    }

    const displayProgressions = Object.values(characterProgression.progressions)
      .filter((progression) => {
        return DISPLAY_HASHES.includes(progression.progressionHash);
      })
      .sort((a, b) => {
        return (
          (DISPLAY_HASHES.indexOf(a.progressionHash) || 0) -
          (DISPLAY_HASHES.indexOf(b.progressionHash) || 0)
        );
      });

    const tableData: string[][] = [];

    tableData.push(["Rank", "Level", "Cap", "Current", "Next", "%", "Total", "Resets"]);

    for (
      let progressionIndex = 0;
      progressionIndex < displayProgressions.length;
      progressionIndex++
    ) {
      const progression = displayProgressions[progressionIndex];
      const definition = progressionDefinitions[progression.progressionHash];

      tableData.push([
        definition.displayProperties.name,
        `${progression.level + 1}`,
        `${progression.levelCap + 1}`,
        `${progression.progressToNextLevel}`,
        `${progression.nextLevelAt}`,
        `${Math.round((progression.progressToNextLevel / progression.nextLevelAt) * 100)}%`,
        `${progression.currentProgress}`,
        `${progression.currentResetCount || 0}`
      ]);
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
