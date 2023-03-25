import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { stringifyTable } from "~src/helper/table.helper";
import { AppModule } from "~src/module/app.module";
import { CharacterService } from "~src/service/character/character.service";
import { CharacterReference } from "~src/service/character/character.types";
import { CharacterDescriptionService } from "~src/service/character-description/character-description.service";
import { CharacterSelectionService } from "~src/service/character-selection/character-selection.service";
import { LogService } from "~src/service/log/log.service";

type CmdOptions = SessionIdCommandOptions & VerboseCommandOptions;

const cmd: CommandDefinition = {
  description: "List Destiny 2 characters",
  options: [sessionIdOption, verboseOption],
  action: async (_, opts) => {
    const logger = AppModule.getDefaultInstance()
      .resolve<LogService>("LogService")
      .getLogger("cmd:character:list");

    const { session: sessionId, verbose } = opts as CmdOptions;
    logger.debug(`Session ID: ${sessionId}`);

    const characterService =
      AppModule.getDefaultInstance().resolve<CharacterService>("CharacterService");

    const characterSelectionService =
      AppModule.getDefaultInstance().resolve<CharacterSelectionService>(
        "CharacterSelectionService"
      );

    const characterDescriptionService =
      AppModule.getDefaultInstance().resolve<CharacterDescriptionService>(
        "CharacterDescriptionService"
      );

    const [hasCharacterInfoErr, hasCharacterInfo] =
      await characterSelectionService.hasSelectedCharacter(sessionId);
    if (hasCharacterInfoErr) {
      return logger.loggedError(`Unable to check character info: ${hasCharacterInfoErr.message}`);
    }

    let characterInfo: CharacterReference | null = null;

    if (hasCharacterInfo) {
      const [characterInfoErr, _characterInfo] =
        await characterSelectionService.ensureSelectedCharacter(sessionId);
      if (characterInfoErr) {
        return logger.loggedError(`Unable to get character info: ${characterInfoErr.message}`);
      }
      characterInfo = _characterInfo;
    }

    logger.info("Retrieving characters ...");
    const [charactersErr, characters] = await characterService.getCharacters(sessionId);
    if (charactersErr) {
      return logger.loggedError(`Unable to retrieve characters: ${charactersErr.message}`);
    }

    const tableData: string[][] = [];

    const basicHeaders = ["Selected", "#", "Description", "Light Level"];
    if (verbose) {
      tableData.push([...basicHeaders, "Last Played", "ID", "Membership ID / Type"]);
    } else {
      tableData.push(basicHeaders);
    }

    for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
      const character = characters[characterIndex];

      const isSelected =
        characterInfo?.membershipType === character.membershipType &&
        characterInfo?.membershipId === character.membershipId &&
        characterInfo?.characterId === character.characterId;

      const basicCells = [isSelected ? "✓" : "", `${characterIndex + 1}`, "", `${character.light}`];

      logger.info("Retrieving character description ...");
      const [characterDescriptionErr, characterDescription] =
        await characterDescriptionService.getDescription(character);
      if (characterDescriptionErr) {
        basicCells[2] = `Error: ${characterDescriptionErr.message}`;
      } else {
        basicCells[2] = `${characterDescription.class} (${characterDescription.gender} ${characterDescription.race})`;
      }

      if (verbose) {
        tableData.push([
          ...basicCells,
          character.dateLastPlayed,
          character.characterId,
          `${character.membershipId} / ${character.membershipType}`
        ]);
      } else {
        tableData.push(basicCells);
      }
    }

    logger.log(stringifyTable(tableData));
  }
};

export default cmd;
