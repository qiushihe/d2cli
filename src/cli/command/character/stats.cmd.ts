import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { resolveCharacters } from "~src/service/destiny2-component-data/character.resolver";
import { Destiny2ComponentDataService } from "~src/service/destiny2-component-data/destiny2-component-data.service";
import { StatService } from "~src/service/stat/stat.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "Show stats of the currently selected Destiny 2 character",
  options: [sessionIdOption, verboseOption],
  action: async (args, opts, { app, logger }) => {
    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const destiny2ComponentDataService = app.resolve(Destiny2ComponentDataService);

    const characterSelectionService = app.resolve(CharacterSelectionService);

    const characterDescriptionService = app.resolve(CharacterDescriptionService);

    const statService = app.resolve(StatService);

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

    const tableHeader = ["Stat", "Value"];
    if (verbose) {
      tableHeader.push("Description");
    }
    tableData.push(tableHeader);

    tableData.push(["Class", characterDescription.class, ...(verbose ? [""] : [])]);
    tableData.push(["Physique", characterDescription.gender, ...(verbose ? [""] : [])]);
    tableData.push(["Race", characterDescription.race, ...(verbose ? [""] : [])]);

    sortedStats.forEach(({ value, name, description }) => {
      tableData.push([name, `${value}`, ...(verbose ? [description] : [])]);
    });

    logger.log(makeTable2(tableData, { flexibleColumns: [2] }));
  }
};

export default cmd;
