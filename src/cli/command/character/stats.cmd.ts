import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { resolveCharacters } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { LogService } from "~src/service/log/log.service";
import { StatService } from "~src/service/stat/stat.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "Show stats of the currently selected Destiny 2 character",
  options: [sessionIdOption, verboseOption],
  action: async (args, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:stats");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ComponentDataService =
      AppModule.getDefaultInstance().resolve<Destiny2ComponentDataService>(
        "Destiny2ComponentDataService"
      );

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const statService = AppModule.getDefaultInstance().resolve<StatService>("StatService");

    const [characterInfoErr, characterInfo] =
      await characterSelectionService.ensureSelectedCharacter(sessionId);
    if (characterInfoErr) {
      return logger.loggedError(`Unable to character info: ${characterInfoErr.message}`);
    }

    logger.info("Retrieving character ...");
    const [characterErr, character] = await destiny2ComponentDataService.getCharacterComponentsData(
      sessionId,
      characterInfo.membershipType,
      characterInfo.membershipId,
      characterInfo.characterId,
      resolveCharacters
    );
    if (characterErr) {
      return logger.loggedError(`Unable to retrieve character: ${characterErr.message}`);
    }

    logger.info("Retrieving character description ...");
    const [characterDescriptionErr, characterDescription] =
      await characterDescriptionService.getDescription(character);
    if (characterDescriptionErr) {
      return logger.loggedError(
        `Unable to retrieve character description: ${characterDescriptionErr.message}`
      );
    }

    logger.info("Retrieving sorted character stats ...");
    const [sortedStatsErr, sortedStats] = await statService.getSortedCharacterStats(character);
    if (sortedStatsErr) {
      return logger.loggedError(
        `Unable to retrieve sorted character stats: ${sortedStatsErr.message}`
      );
    }

    const tableData: string[][] = [];

    tableData.push(["Stat", "Value", ...(verbose ? ["Description"] : [])]);

    tableData.push(["Class", characterDescription.class, ...(verbose ? [""] : [])]);
    tableData.push(["Physique", characterDescription.gender, ...(verbose ? [""] : [])]);
    tableData.push(["Race", characterDescription.race, ...(verbose ? [""] : [])]);

    sortedStats.forEach(({ value, name, description }) => {
      tableData.push([name, `${value}`, ...(verbose ? [description] : [])]);
    });

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
