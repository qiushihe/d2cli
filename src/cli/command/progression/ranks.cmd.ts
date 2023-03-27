import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { resolveCharacterProgressions } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { LogService } from "~src/service/log/log.service";
import { ManifestDefinitionService } from "~src/service/manifest-definition/manifest-definition.service";

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

    const manifestDefinitionService =
      AppModule.getDefaultInstance().resolve<ManifestDefinitionService>(
        "ManifestDefinitionService"
      );

    const destiny2ComponentDataService =
      AppModule.getDefaultInstance().resolve<Destiny2ComponentDataService>(
        "Destiny2ComponentDataService"
      );

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving character progression ...");
    const [characterProgressionErr, characterProgression] =
      await destiny2ComponentDataService.getCharacterComponentsData(
        sessionId,
        characterInfo.membershipType,
        characterInfo.membershipId,
        characterInfo.characterId,
        resolveCharacterProgressions
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

    const tableHeader = ["Rank", "Level", "%"];
    if (verbose) {
      tableHeader.push("Cap");
      tableHeader.push("Current");
      tableHeader.push("Next");
      tableHeader.push("Total");
      tableHeader.push("Resets");
    }
    tableData.push(tableHeader);

    for (
      let progressionIndex = 0;
      progressionIndex < displayProgressions.length;
      progressionIndex++
    ) {
      const progression = displayProgressions[progressionIndex];

      logger.info(`Fetching progression definition for ${progression.progressionHash} ...`);
      const [progressionDefinitionErr, progressionDefinition] =
        await manifestDefinitionService.getProgressionDefinition(progression.progressionHash);
      if (progressionDefinitionErr) {
        return logger.loggedError(
          `Unable to fetch progression definition for ${progression.progressionHash}: ${progressionDefinitionErr.message}`
        );
      }

      const rowColumns = [
        progressionDefinition?.displayProperties.name || "UNKNOWN PROGRESSION",
        `${progression.level + 1}`,
        `${Math.round((progression.progressToNextLevel / progression.nextLevelAt) * 100)}%`
      ];

      if (verbose) {
        rowColumns.push(`${progression.levelCap + 1}`);
        rowColumns.push(`${progression.progressToNextLevel}`);
        rowColumns.push(`${progression.nextLevelAt}`);
        rowColumns.push(`${progression.currentProgress}`);
        rowColumns.push(`${progression.currentResetCount || 0}`);
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData, { flexibleColumns: [0] }));
  }
};

export default cmd;
