import { sessionIdOption } from "~src/cli/command-option/cli.option";
import { SessionIdCommandOptions } from "~src/cli/command-option/cli.option";
import { verboseOption } from "~src/cli/command-option/cli.option";
import { VerboseCommandOptions } from "~src/cli/command-option/cli.option";
import { CommandDefinition } from "~src/cli/d2cli.types";
import { makeTable2 } from "~src/helper/table.helper";
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

    const tableHeader = ["Selected", "#", "Class"];
    if (verbose) {
      tableHeader.push("Physique");
      tableHeader.push("Race");
    }
    tableHeader.push("Light");
    if (verbose) {
      tableHeader.push("Last Played");
      tableHeader.push("ID");
      tableHeader.push("Membership");
    }

    tableData.push(tableHeader);

    for (let characterIndex = 0; characterIndex < characters.length; characterIndex++) {
      const character = characters[characterIndex];

      const isSelected =
        characterInfo?.membershipType === character.membershipType &&
        characterInfo?.membershipId === character.membershipId &&
        characterInfo?.characterId === character.characterId;

      const rowColumns = [isSelected ? "✓" : "", `${characterIndex + 1}`];

      logger.info("Retrieving character description ...");
      const [characterDescriptionErr, characterDescription] =
        await characterDescriptionService.getDescription(character);
      if (characterDescriptionErr) {
        rowColumns.push("ERR");
        if (verbose) {
          rowColumns.push("ERR");
          rowColumns.push("ERR");
        }
      } else {
        rowColumns.push(characterDescription.class);
        if (verbose) {
          rowColumns.push(characterDescription.gender);
          rowColumns.push(characterDescription.race);
        }
      }

      rowColumns.push(`${character.light}`);

      if (verbose) {
        rowColumns.push(character.dateLastPlayed);
        rowColumns.push(character.characterId);
        rowColumns.push(`${character.membershipType}:${character.membershipId}`);
      }

      tableData.push(rowColumns);
    }

    logger.log(makeTable2(tableData));
  }
};

export default cmd;
