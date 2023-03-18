import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { fnWithSpinner } from "~src/helper/cli-promise.helper";
import { getSelectedCharacterInfo } from "~src/helper/current-character.helper";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { Destiny2CharacterService } from "~src/service/destiny2-character/destiny2-character.service";
import { Destiny2ManifestService } from "~src/service/destiny2-manifest/destiny2-manifest.service";
import { LogService } from "~src/service/log/log.service";
import { Destiny2ManifestLanguage } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestComponent } from "~type/bungie-asset/destiny2.types";
import { Destiny2ManifestProgressionDefinitions } from "~type/bungie-asset/destiny2.types";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const DISPLAY_HASHES = [
  47964159, // War Table
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
  description: "List character rank progressions",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:progression:ranks");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ManifestService =
      AppModule.getDefaultInstance().resolve<Destiny2ManifestService>("Destiny2ManifestService");

    const destiny2CharacterService =
      AppModule.getDefaultInstance().resolve<Destiny2CharacterService>("Destiny2CharacterService");

    const [characterInfoErr, characterInfo] = await getSelectedCharacterInfo(logger, sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    const [progressionDefinitionsErr, progressionDefinitions] = await fnWithSpinner(
      "Retrieving progression definitions ...",
      () =>
        destiny2ManifestService.getManifestComponent<Destiny2ManifestProgressionDefinitions>(
          Destiny2ManifestLanguage.English,
          Destiny2ManifestComponent.ProgressionDefinition
        )
    );
    if (progressionDefinitionsErr) {
      return logger.loggedError(
        `Unable to retrieve progression definitions: ${progressionDefinitionsErr.message}`
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

    const basicHeaders = ["Rank", "Level", "%"];

    if (verbose) {
      tableData.push([...basicHeaders, "Cap", "Current", "Next", "Total", "Resets"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (
      let progressionIndex = 0;
      progressionIndex < displayProgressions.length;
      progressionIndex++
    ) {
      const progression = displayProgressions[progressionIndex];
      const definition = progressionDefinitions[progression.progressionHash];

      const basicCells = [
        definition.displayProperties.name,
        `${progression.level + 1}`,
        `${Math.round((progression.progressToNextLevel / progression.nextLevelAt) * 100)}%`
      ];

      if (verbose) {
        tableData.push([
          ...basicCells,
          `${progression.levelCap + 1}`,
          `${progression.progressToNextLevel}`,
          `${progression.nextLevelAt}`,
          `${progression.currentProgress}`,
          `${progression.currentResetCount || 0}`
        ]);
      } else {
        tableData.push(basicCells);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
